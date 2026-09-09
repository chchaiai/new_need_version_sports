"""Read-only seal of the local 1.4 candidate. No publication or Backend acceptance claim."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def verify(root=ROOT):
 manifest=json.loads((root/'contracts/validation/p7_cr14/release-manifest.json').read_bytes())
 if manifest['version']!='1.4.0-contract' or manifest['status']!='RC':raise ValueError('Unexpected release identity')
 for name,digest in manifest['inputs'].items():
  path=(root/name).resolve()
  if not path.is_relative_to(root.resolve()) or sha(path)!=digest:raise ValueError('Sealed input changed: '+name)
 meta=json.loads((root/'contracts/contract-metadata.json').read_bytes())
 lock=json.loads((root/'BNBU-ANDROID/contract-validation/contract-lock.json').read_bytes())
 fixtures=json.loads((root/'contracts/validation/p7_cr14/fixtures.json').read_bytes())
 actual=sha(root/'contracts/openapi.yaml')
 if not actual==manifest['sha256']==meta['openapiSha256']==lock['sha256']==fixtures['candidateSha256']:
  raise ValueError('Candidate/metadata/Android/fixture SHA mismatch')
 if meta['contractVersion']!=manifest['version'] or lock['version']!=manifest['version']:raise ValueError('Version mismatch')
 for name in ['BNBU-Sports-Web-new/portal-teacher-admin/scripts/verify-phase5b-contract.mjs',
              'BNBU-Sports-Web-new/portal-teacher-admin/scripts/generate-phase6b-validators.mjs',
              'BNBU-Sports-Web-new/frontend/student/js/phase6b-contract-mapper.js']:
  text=(root/name).read_text('utf8')
  if actual not in text or manifest['version'] not in text:raise ValueError('Web binding mismatch: '+name)
 return manifest

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--repo',type=Path,default=ROOT);a=parser.parse_args()
 value=verify(a.repo.resolve())
 print('PASS: sealed local '+value['version']+' / '+value['sha256']+'. Publication and H/Z integration remain separate gates.')
