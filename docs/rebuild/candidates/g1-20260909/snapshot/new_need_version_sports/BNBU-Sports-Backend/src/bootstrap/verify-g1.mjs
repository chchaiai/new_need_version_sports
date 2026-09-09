import ts from 'typescript';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {readContract,readFixtures,digest} from './contract-input.mjs';
const dir='evidence/phase7/G1-Z';mkdirSync(dir,{recursive:true});
// Historical suites write their original relative paths only inside this disposable container.
mkdirSync('evidence/phase7/7.0',{recursive:true});
const summary={technicalStatus:'RUNNING',trackStatus:'IN_PROGRESS',gateStatus:'NOT_INTEGRATED_WITH_H',startedAt:new Date().toISOString(),node:process.version,architecture:process.arch,steps:[],sourceManifest:[]};
function save(){writeFileSync(dir+'/summary.json',JSON.stringify(summary,null,2)+'\n');}save();
try{
 if(process.version!=='v24.19.0')throw new Error('NODE_VERSION_MISMATCH');
 const contract=readContract();readFixtures();summary.contract={version:contract.document.info.version,sha:contract.canonicalSha256};
 summary.lockSha256=digest(readFileSync('package-lock.json'));
 const audit=JSON.parse(readFileSync('/build-audit/dependency-audit.json','utf8'));
 const auditMeta=JSON.parse(readFileSync('/build-audit/dependency-audit.json.meta.json','utf8'));
 if(!auditMeta.passed||auditMeta.lockfileSha256!==summary.lockSha256||audit.metadata?.vulnerabilities?.total!==0)throw new Error('DEPENDENCY_AUDIT_MISMATCH');
 summary.audit=auditMeta;
 writeFileSync(dir+'/dependency-audit.json',JSON.stringify(audit,null,2)+'\n');
 function files(p){for(const f of readdirSync(p,{withFileTypes:true})){const path=p+'/'+f.name;if(f.isDirectory())files(path);else summary.sourceManifest.push({path,sha256:digest(readFileSync(path))});}}
 for(const p of ['src','tests','migrations'])files(p);
 for(const path of ['package.json','package-lock.json','tsconfig.json','eslint.config.mjs','vitest.config.ts','Dockerfile.test','docker-compose.g1.yml'])summary.sourceManifest.push({path,sha256:digest(readFileSync(path))});
 const operations=[];
 for(const entry of summary.sourceManifest.filter(f=>f.path.startsWith('src/modules/')&&f.path.includes('/api/')&&f.path.endsWith('.ts'))){
  const ast=ts.createSourceFile(entry.path,readFileSync(entry.path,'utf8'),ts.ScriptTarget.Latest,true);
  function visit(node){
   if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='route'){
    const method=node.arguments[2]?.text?.toLowerCase(),route=node.arguments[3]?.text;
    if(!method||!route)throw new Error('UNINSPECTABLE_API_REGISTRATION');
    const path=route.replace(/:([a-zA-Z0-9_]+)/g,'{$1}'),operation=contract.document.paths[path]?.[method];
    if(!operation)throw new Error('UNCONTRACTED_API:'+method+':'+path);
    operations.push({method:method.toUpperCase(),path,operationId:operation.operationId,source:entry.path});
   }
   ts.forEachChild(node,visit);
  }visit(ast);
 }
 if(new Set(operations.map(o=>o.operationId)).size!==operations.length)throw new Error('DUPLICATE_API_REGISTRATION');
 const all=Object.values(contract.document.paths).flatMap(p=>Object.values(p).filter(o=>o?.operationId).map(o=>o.operationId));
 writeFileSync(dir+'/api-inventory.json',JSON.stringify({kind:'REGISTERED_OPERATIONS_NOT_FULL_COVERAGE',registeredCount:operations.length,contractCount:all.length,operations,notClaimed:all.filter(id=>!operations.some(o=>o.operationId===id))},null,2)+'\n');
 summary.registeredOperations=operations.length;
 const commands=[['versions','npm',['ls','--depth=0']],['codegen','npm',['run','contract:check']],['typecheck','npm',['run','typecheck']],['lint','npm',['run','lint']],
 ['contract','npx',['--no-install','vitest','run','tests/contract','--reporter=json','--outputFile='+dir+'/vitest-contract.json']],
 ['architecture','npx',['--no-install','vitest','run','tests/architecture','--reporter=json','--outputFile='+dir+'/vitest-architecture.json']],
 ['foundation','npx',['--no-install','vitest','run','tests/integration/foundation','--reporter=json','--outputFile='+dir+'/vitest-foundation.json']],
 ['g1','npx',['--no-install','vitest','run','tests/integration/g1','tests/unit/g1','--reporter=json','--outputFile='+dir+'/vitest-g1.json']]];
 for(const [name,command,args] of commands){
  const r=spawnSync(command,args,{encoding:'utf8',maxBuffer:20*1024*1024});
  writeFileSync(dir+'/'+name+'.log',(r.stdout??'')+(r.stderr??''));
  if(name==='architecture')writeFileSync(dir+'/architecture-findings.json',readFileSync('evidence/phase7/7.0/architecture.json'));
  summary.steps.push({name,command:[command,...args],cwd:process.cwd(),exitCode:r.status});save();
  console.log(name+': '+r.status);if(r.status!==0)throw new Error('STEP_FAILED:'+name);
 }
 summary.tests={};
 for(const suite of ['contract','architecture','foundation','g1']){
  const result=JSON.parse(readFileSync(dir+'/vitest-'+suite+'.json','utf8'));
  summary.tests[suite]={total:result.numTotalTests,passed:result.numPassedTests,failed:result.numFailedTests,skipped:result.numPendingTests};
  if(result.numFailedTests!==0||result.numPendingTests!==0||result.numPassedTests!==result.numTotalTests)throw new Error('INCOMPLETE_SUITE:'+suite);
 }
 summary.totalTests=Object.values(summary.tests).reduce((total,s)=>total+s.total,0);
 summary.technicalStatus='PASS';summary.trackStatus='IMPLEMENTATION_CHECKED';
 summary.integrationBoundaries={mail:'LOCAL_MAILPIT_HTTP_DELIVERY_AND_INBOX_VERIFIED_NOT_EXTERNAL_SMTP',runtime:'DEVELOPMENT_PROCESS_HTTP_AND_CLEAN_RESTART_VERIFIED',calendar:'SHA_PINNED_FILE_ADAPTER_VERIFIED_WITH_SYNTHETIC_INPUT_ONLY_AUTHORITATIVE_SOURCE_PENDING',subAdminPermissionProvider:'REAL_POSTGRES_PROVIDER_TESTED',accountDeletionActivity:'STRICT_POSTGRES_TEST_PORT_NOT_H_REPOSITORY',adminResponsibilities:'TEST_PORT_ONLY',semesterSettlement:'AUTHORITATIVE_NONEMPTY_SEMESTER_PROVIDER_NOT_INTEGRATED',teacherClosure:'AUTHORITATIVE_SETTLEMENT_PROVIDER_NOT_INTEGRATED',hSessionMediaRecord:'NOT_INTEGRATED'};
}catch(error){summary.technicalStatus='FAIL';summary.failure=error.message;process.exitCode=1;}
summary.finishedAt=new Date().toISOString();save();
