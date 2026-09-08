"""Local-only reproduction. Requires pinned toolchain from Step02; never installs or touches Git."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from datetime import datetime, timezone


def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def main():
    parser=argparse.ArgumentParser()
    for name in ['repo','output','toolchain','original-contracts']: parser.add_argument('--'+name,type=Path,required=True)
    a=parser.parse_args();repo=a.repo.resolve();out=a.output.resolve();out.mkdir(parents=True,exist_ok=False)
    tool=json.loads(a.toolchain.read_text(encoding='utf-8'))
    for artifact in tool['artifacts']: assert sha(artifact['path'])==artifact['sha256'],artifact['path']
    modules=Path(tool['nodeRoot'])/'node_modules';node=tool['node'];java=Path(tool['javaHome'])/'bin/java.exe'
    src=repo/'contracts/validation/step04_courses';prior=repo/'contracts/validation/step03_workflow';old=repo/'contracts/validation/step02_discriminators';spec=repo/'contracts/openapi.yaml'
    logs=[];env=dict(os.environ,REDOCLY_TELEMETRY='off',PYTHONDONTWRITEBYTECODE='1')
    def run(name,command,expected=0):
        command=list(map(str,command));before=datetime.now(timezone.utc).isoformat()
        r=subprocess.run(command,cwd=repo,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace')
        (out/(name+'.log')).write_text(r.stdout+r.stderr,encoding='utf-8')
        logs.append({'name':name,'command':command,'cwd':str(repo),'startedAt':before,'exitCode':r.returncode,'expectedExit':expected})
        (out/'commands.json').write_text(json.dumps(logs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(name+': exit '+str(r.returncode),flush=True)
        if r.returncode!=expected: raise SystemExit(r.stdout[-2500:]+r.stderr[-3500:])
        return r
    py=[sys.executable,'-B','-X','utf8']
    run('01-build',py+[repo/'contracts/scripts/build_contract.py'])
    generated=['openapi.yaml','operation-catalog.md','contract-metadata.json']
    identity={name:sha(repo/'contracts'/name) for name in generated}
    run('02-repeat-build',py+[repo/'contracts/scripts/build_contract.py'])
    assert identity=={name:sha(repo/'contracts'/name) for name in generated}
    for name in generated: shutil.copyfile(repo/'contracts'/name,out/name)
    run('03-verify',py+[repo/'contracts/scripts/verify_contract.py'])
    ready=run('04-readiness',py+[repo/'contracts/scripts/check_rc_readiness.py'],1)
    assert 'DRAFT' in ready.stdout+ready.stderr
    run('05-workflow-cases',py+[src/'run_checks.py','--spec',spec,'--output',out/'checks'])
    run('05b-step03-regression',py+[prior/'run_checks.py','--spec',spec,'--output',out/'prior-workflow'])
    run('05c-step03-js',[node,prior/'runtime_web.cjs',out/'prior-workflow/runtime-input.json',tool['ajvRoot'],out/'prior-workflow/web-result.json'])
    run('06-old-mapping-regression',py+[old/'run_checks.py','--spec',spec,'--baseline',a.original_contracts/'openapi.yaml','--output',out/'old-mapping'])
    run('07-workflow-js',[node,src/'runtime_web.cjs',out/'checks/runtime-input.json',tool['ajvRoot'],out/'checks/web-result.json'])
    run('08-old-mapping-js',[node,old/'runtime_web.cjs',out/'old-mapping/runtime-input.json',tool['ajvRoot'],out/'old-mapping/web-result.json'])
    # The library defaults to treating default-valued fields as required. Preserve
    # the actual optional windowHours request semantics instead (official CLI option).
    run('09-typescript-generate',[node,modules/'openapi-typescript/bin/cli.js',spec,'--default-non-nullable','false','--output',out/'api.d.ts'])
    fixtures=json.loads((out/'checks/runtime-input.json').read_text(encoding='utf-8'))['cases']
    good=[r for r in fixtures if r.get('typed') and r['expectedValid']]
    ts=['import type { components } from "./api";','type S = components["schemas"];']
    for i,row in enumerate(good): ts.append(f'const x{i}: S["{row["schema"]}"] = '+json.dumps(row['payload'],ensure_ascii=False)+';')
    for i,(name,field) in enumerate([('CoursePlanEvidence','result'),('StudentCourseProgress','state'),('SettlementReportVersion','kind')]):
        for j,value in enumerate(['UNKNOWN',None,1]):
            ts += ['// @ts-expect-error invalid discriminator must fail in the actual generated type',f'const bad{i}_{j}: S["{name}"]["{field}"] = '+json.dumps(value)+';']
    ts += ['console.log(JSON.stringify(['+','.join('x'+str(i) for i in range(len(good)))+']));']
    (out/'typed-fixtures.ts').write_text('\n'.join(ts)+'\n',encoding='utf-8')
    run('10-typescript-compile',[node,modules/'typescript/bin/tsc','--strict','--target','ES2022','--module','commonjs','--outDir',out/'ts',out/'typed-fixtures.ts'])
    wire=run('11-typescript-wire',[node,out/'ts/typed-fixtures.js']);assert json.loads(wire.stdout)==[r['payload'] for r in good]
    config=dict(generatorName='kotlin',library='jvm-okhttp4',inputSpec=str(spec),modelPackage='bnbu.cr005.review',apiPackage='bnbu.cr005.review.api',invokerPackage='bnbu.cr005.review.infrastructure',
                globalProperties=dict(models='',modelDocs='false',modelTests='false',apis='false',apiDocs='false',apiTests='false',supportingFiles='false'),
                additionalProperties=dict(sourceFolder='src/main/kotlin',dateLibrary='java8',serializationLibrary='gson',collectionType='list',enumPropertyNaming='original',modelMutable='false'),
                schemaMappings={'MediaAsset_contentType':'kotlin.String?','MediaAsset_byteSize':'kotlin.Long?','MediaAsset_checksumSha256':'kotlin.String?',
                                'MediaAsset_durationMilliseconds':'kotlin.Long?','MediaAsset_hasAudio':'kotlin.Boolean?','MediaAsset_widthPixels':'kotlin.Int?',
                                'MediaAsset_rejectionCode':'MediaFinalizationRejectionCode?'},
                importMappings={'MediaFinalizationRejectionCode?':'bnbu.cr005.review.MediaFinalizationRejectionCode'})
    wrappers=['AddEnduranceRuleIntervalChange','CertificationDetails','CertificationKind','CreateCertificationApplicationRequest','CreateExemptionApplicationRequest',
              'CreateStudentApplicationRequest','DeleteEnduranceRuleIntervalChange','EnterMaintenanceRequest','MaintenanceAnnouncement','ReturnNormalRequest',
              'ReviseEnduranceRuleTableRequest','ReviseEnduranceRuleTableRequestChange','SwitchSystemModeRequest','UpdateEnduranceRuleIntervalChange']
    for label in ['base-models','selected-wrappers']:
        config['outputDir']=str(out/label)
        if label=='selected-wrappers':
            config['library']='jvm-retrofit2';config['additionalProperties']['generateOneOfAnyOfWrappers']='true'
            config['globalProperties']['models']=','.join('ReviseEnduranceRuleTableRequest_change' if n=='ReviseEnduranceRuleTableRequestChange' else n for n in wrappers)
        c=out/(label+'.config.json');c.write_text(json.dumps(config,indent=2)+'\n',encoding='utf-8')
        run('12-'+label,[java,'-jar',tool['generatorJar'],'generate','-c',c])
    rel=Path('src/main/kotlin/bnbu/cr005/review');base=out/'base-models'/rel;selected=out/'selected-wrappers'/rel;mixed=out/'models';mixed.mkdir()
    assert {p.stem for p in selected.glob('*.kt')}==set(wrappers)
    for p in base.glob('*.kt'): shutil.copyfile(p,mixed/p.name)
    for p in selected.glob('*.kt'): shutil.copyfile(p,mixed/p.name)
    model_manifest=[{'file':p.name,'source':str((selected/p.name if p.stem in wrappers else base/p.name).relative_to(out)),'sha256':sha(p)} for p in sorted(mixed.glob('*.kt'))]
    (out/'model-manifest.json').write_text(json.dumps(model_manifest,indent=2)+'\n',encoding='utf-8')
    compiler_cp=os.pathsep.join(tool['kotlinCompilerClasspath']);model_cp=os.pathsep.join(tool['modelClasspath']);jar=out/'models.jar'
    args=['-no-stdlib','-no-reflect','-jvm-target','17','-classpath',model_cp,'-d',str(jar)]+[str(p) for p in sorted(mixed.glob('*.kt'))]
    argfile=out/'compile.args';argfile.write_text('\n'.join('"'+x.replace('\\','/')+'"' for x in args)+'\n',encoding='utf-8')
    run('13-kotlin-compile',[java,'-cp',compiler_cp,'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','@'+str(argfile)])
    classes=out/'jvm-classes';classes.mkdir();runtime_cp=model_cp+os.pathsep+str(jar)
    run('14-old-jvm-probe-compile',[Path(tool['javaHome'])/'bin/javac.exe','-encoding','UTF-8','--release','17','-cp',runtime_cp,'-d',classes,
                                  old/'kotlin/ClosedFieldGuardFactory.java',old/'kotlin/RunCases.java'])
    run('15-old-kotlin-runtime',[java,'-cp',runtime_cp+os.pathsep+str(classes),'RunCases',out/'old-mapping/runtime-input.json',out/'old-mapping/kotlin-result.json'])
    run('16-lint',[node,modules/'@redocly/cli/bin/cli.js','lint',spec,'--config',repo/'contracts/redocly.yaml'])
    result={'candidateSha256':sha(spec),'generatedFiles':identity,'commands':logs,'allExpectedExits':True,
            'kotlinModelsCompiled':len(model_manifest),'step02SelectedWrapperModels':len(wrappers),'step04TypeScriptLegalFixtures':len(good),
            'step04TypeScriptNegativeAssertions':9,'priorStep03KotlinUnionRuntime':'PENDING_STEP6_CANDIDATE_GATE_AND_PHASE6_CONSUMER_VALIDATION',
            'rcReadiness':'EXPECTED_BLOCKED_DRAFT','backend':'NOT_RUN_PHASE7_0_COMPATIBILITY_AND_PHASE7_RUNTIME',
            'newModelAndroidRuntime':'PENDING_STEP6_CANDIDATE_GATE_AND_PHASE6_CONSUMER_VALIDATION','priorWorkflowReport':'prior-workflow/python-result.json','schemaReport':'checks/python-result.json','javascriptReport':'checks/web-result.json'}
    assert identity['openapi.yaml']==sha(spec)
    (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k!='commands'},ensure_ascii=False),flush=True)

if __name__=='__main__':main()
