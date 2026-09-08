"""Regression controls for mutable progress vs. immutable published inputs."""
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from published_input_seal import snapshot,original,MANIFEST,STATUS

REPO=Path(__file__).resolve().parents[3]
class PublishedSealTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name); self.repo=self.root/'repo'
        manifest=json.loads((REPO/MANIFEST).read_bytes())
        names={MANIFEST,'contracts/validation/step06_final/verify_release.py',
               'contracts/validation/step06_final/disposition.json','contracts/validation/step06_final/result.json','contracts/contract-metadata.json'}
        names.update(r['path'] for s in ['artifacts','generationAndValidationInputs','authorityInputs'] for r in manifest[s])
        names.update(r['path'] for r in manifest['implementedChangeRequests'])
        for name in names:
            p=self.repo/name; p.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(REPO/name,p)
    def reader(self,repo,name): return original(REPO,name)
    def test_only_live_status_may_advance(self):
        (self.repo/STATUS).write_text('Later stage progress\n',encoding='utf8')
        out=self.root/'evidence'; record=snapshot(self.repo,out,self.reader)
        self.assertEqual((out/STATUS).read_bytes(),original(REPO,STATUS))
        self.assertEqual((self.repo/STATUS).read_text('utf8'),'Later stage progress\n')
        self.assertNotEqual(record['historicalProgress'][0]['currentSha256'],record['historicalProgress'][0]['publishedSha256'])
    def test_contract_mutation_rejected(self):
        with (self.repo/'contracts/openapi.yaml').open('ab') as f: f.write(b'\n')
        with self.assertRaisesRegex(ValueError,'Published input changed'): snapshot(self.repo,self.root/'evidence',self.reader)
    def test_fixture_mutation_rejected(self):
        with (self.repo/'contracts/validation/step07_handoff/fixtures.json').open('ab') as f: f.write(b'\n')
        with self.assertRaisesRegex(ValueError,'Published input changed'): snapshot(self.repo,self.root/'evidence',self.reader)
    def test_relabelled_manifest_rejected(self):
        with (self.repo/MANIFEST).open('ab') as f: f.write(b'\n')
        with self.assertRaisesRegex(ValueError,'manifest differs'): snapshot(self.repo,self.root/'evidence',self.reader)
    def test_wrong_historical_status_rejected(self):
        def bad(repo,name): return b'wrong version' if name==STATUS else self.reader(repo,name)
        with self.assertRaisesRegex(ValueError,'Published input changed'): snapshot(self.repo,self.root/'evidence',bad)

if __name__=='__main__': unittest.main(verbosity=2)
