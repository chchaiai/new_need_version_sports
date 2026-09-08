"""Derive nullable scalar aliases from the candidate schema, without changing it."""
import hashlib
import json
from pathlib import Path
import zipfile


def nullable_scalar_mappings(spec):
    schemas=spec['components']['schemas']; mappings={}; imports={}
    for owner, schema in schemas.items():
        for field, prop in schema.get('properties', {}).items():
            branches=prop.get('anyOf', [])
            if len(branches)!=2 or {'type':'null'} not in branches: continue
            value=next(b for b in branches if b!={'type':'null'})
            if '$ref' in value:
                name=value['$ref'].split('/')[-1];resolved=schemas[name]
                # Use the canonical generated model for nullable object refs too.
                # Otherwise the normalizer flattens a copy and may lose nested nullability.
                if 'enum' in resolved or resolved.get('type')=='object' or 'oneOf' in resolved:
                    target=name+'?';imports[target]='bnbu.cr005.review.'+name
                else:value=resolved;target=None
            else:target=None
            if target is None:
                kind=value.get('type');fmt=value.get('format')
                if kind=='string':target={'uuid':'java.util.UUID?','date-time':'java.time.OffsetDateTime?','date':'java.time.LocalDate?'}.get(fmt,'kotlin.String?')
                elif kind=='integer':target='kotlin.Int?' if fmt=='int32' else 'kotlin.Long?'
                elif kind=='number':target='java.math.BigDecimal?'
                elif kind=='boolean':target='kotlin.Boolean?'
                else:continue
            mappings[owner+'_'+field]=target
    return mappings,imports


def check_template(final, generator_jar):
    manifest=json.loads((Path(final)/'template-manifest.json').read_text(encoding='utf-8'))
    # Bind both the upstream bytes and the reviewable local override.
    with zipfile.ZipFile(generator_jar) as jar:
        for entry in manifest['templates']:
            original=jar.read(entry['entry'])
            assert hashlib.sha256(original).hexdigest()==entry['originalSha256']
            assert hashlib.sha256((Path(final)/'templates'/Path(entry['entry']).name).read_bytes()).hexdigest()==entry['patchedSha256']
    assert hashlib.sha256(Path(generator_jar).read_bytes()).hexdigest()==manifest['jarSha256']
