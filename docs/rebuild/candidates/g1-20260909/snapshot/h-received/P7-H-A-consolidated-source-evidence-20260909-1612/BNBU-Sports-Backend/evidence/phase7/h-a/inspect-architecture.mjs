import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { architectureFindings } from '../../../tests/architecture/rules.ts';
function sources(dir) {
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const path=dir+'/'+entry.name;
    return entry.isDirectory()?sources(path):/\.(ts|mjs)$/.test(path)?[{path,text:readFileSync(path,'utf8')}]:[];
  });
}
const findings=architectureFindings(sources('src'));
const pendingOwnerRegistration={
  'exercise_session.session':'exercise-session','exercise_session.active_interval':'exercise-session',
  'exercise_session.command_replay':'exercise-session','media_evidence.record_asset':'media-evidence',
  'exercise_record.record':'exercise-record','exercise_record.first_material':'exercise-record',
  'exercise_record.first_material_asset':'exercise-record',
  'exercise_record.command_replay':'exercise-record','exercise_record.acceptance_outbox':'exercise-record'
};
const unexpected=findings.filter(f=>{
  const match=/^table-ownership:src\/modules\/([^/]+)\/infrastructure\/persistence\/repositories\/[^:]+:([^:]+)$/.exec(f);
  return !match||pendingOwnerRegistration[match[2]]!==match[1];
});
const report={findings,unexpected,officialGatePassed:findings.length===0,
  pendingOwnerRegistration};
writeFileSync('/evidence/h-a-current-architecture-diagnosis.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(unexpected.length>0) process.exitCode=1;
