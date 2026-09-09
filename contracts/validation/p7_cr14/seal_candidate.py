"""Author-only candidate sealing. Does not accept tests, publish or invent a source commit."""
import hashlib
import json
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[3]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
 tracked=subprocess.check_output(['git','-C',str(ROOT),'ls-files','-z']).decode().split('\0')
 added=subprocess.check_output(['git','-C',str(ROOT),'ls-files','--others','--exclude-standard','-z']).decode().split('\0')
 inputs={}
 exact={'contracts/openapi.yaml','contracts/operation-catalog.md','contracts/contract-metadata.json',
        'BNBU-ANDROID/settings.gradle.kts','BNBU-ANDROID/build.gradle.kts','BNBU-ANDROID/gradle.properties'}
 prefixes=('contracts/src/','contracts/scripts/','contracts/change-requests/CR-20260909-',
           'contracts/validation/','docs/business/','BNBU-ANDROID/contract-validation/','BNBU-ANDROID/tools/phase6/',
           'BNBU-Sports-Web-new/frontend/student/','BNBU-Sports-Web-new/portal-teacher-admin/')
 excluded={'contracts/validation/p7_cr14/release-manifest.json'}
 for name in sorted(set(tracked+added)):
  if not name or name in excluded:continue
  p=ROOT/name
  authority=name.startswith(('contracts/change-requests/CR-20260909-','docs/business/')) and p.suffix=='.md'
  if authority or name in exact or (name.startswith(prefixes) and p.suffix in {'.py','.kt','.java','.ts','.tsx','.js','.mjs','.cjs','.json','.mustache','.kts','.properties'}):
   inputs[name]=sha(p)
 meta=json.loads((ROOT/'contracts/contract-metadata.json').read_bytes())
 manifest=dict(version=meta['contractVersion'],status=meta['contractStatus'],sha256=meta['openapiSha256'],
  baseCommit='f95c3833870fe0da55a297aa28c958ec53e9e935',sourceCommit=None,publication='LOCAL_CANDIDATE_NOT_PUBLISHED',
  scope='Sealed source, authority and generation/consumer inputs. Tests and human acceptance are separate evidence; no H/Z backend pass.',inputs=inputs)
 Path(__file__).with_name('release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
 print(f'Sealed {len(inputs)} candidate input files; no publication or test claim.')

if __name__=='__main__':main()
