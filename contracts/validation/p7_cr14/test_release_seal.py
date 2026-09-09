"""Negative controls exercise the same release gate used before consumer verification."""
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from verify_release import ROOT,verify

class SealTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=Path(self.temp.name)
  manifest='contracts/validation/p7_cr14/release-manifest.json'
  names=set(json.loads((ROOT/manifest).read_bytes())['inputs'])|{manifest}
  for name in names:
   p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,p)
 def test_current_seal(self):verify(self.root)
 def mutate(self,name):
  with (self.root/name).open('ab') as f:f.write(b'\n')
  with self.assertRaises(ValueError):verify(self.root)
 def test_changed_contract(self):self.mutate('contracts/openapi.yaml')
 def test_changed_fixture(self):self.mutate('contracts/validation/p7_cr14/fixtures.json')
 def test_changed_android_binding(self):self.mutate('BNBU-ANDROID/contract-validation/contract-lock.json')
 def test_changed_web_binding(self):self.mutate('BNBU-Sports-Web-new/portal-teacher-admin/scripts/verify-phase5b-contract.mjs')
 def test_changed_source(self):self.mutate('contracts/src/g1_clarifications.py')

if __name__=='__main__':unittest.main(verbosity=2)
