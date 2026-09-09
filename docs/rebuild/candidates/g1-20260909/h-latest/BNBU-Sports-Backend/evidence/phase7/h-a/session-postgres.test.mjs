import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash, createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { Pool } from 'pg';
import { PostgresTransactionRunner } from '../../../src/shared/infrastructure/postgres.ts';
import { PostgresSessionRepository } from '../../../src/modules/exercise-session/infrastructure/persistence/repositories/postgres-session-repository.ts';
import { SessionAccessService } from '../../../src/modules/exercise-session/application/session-access.ts';
import { SessionCommandService } from '../../../src/modules/exercise-session/application/session-commands.ts';
import { PostgresSessionReplay } from '../../../src/modules/exercise-session/infrastructure/persistence/repositories/postgres-session-replay.ts';
import Fastify from 'fastify';
import { parse } from 'yaml';
import { createContractValidator, ContractInputError } from '../../../src/shared/api/contract-validator.ts';
import { registerSessionCommandRoutes } from '../../../src/modules/exercise-session/api/routes.ts';
import { SessionCommandFailure } from '../../../src/modules/exercise-session/application/session-commands.ts';
import { PostgresRecordAssetRepository } from '../../../src/modules/media-evidence/infrastructure/persistence/repositories/postgres-record-assets.ts';
import { PostgresFirstRecordRepository } from '../../../src/modules/exercise-record/infrastructure/persistence/repositories/postgres-first-record.ts';
import { FirstMaterialReceipt } from '../../../src/modules/exercise-record/domain/first-material.ts';
import { FirstMaterialTransferService } from '../../../src/modules/exercise-record/application/first-material-transfer.ts';
import { SessionQueryService } from '../../../src/modules/exercise-session/application/session-queries.ts';
import { registerSessionQueryRoutes } from '../../../src/modules/exercise-session/api/query-routes.ts';
import {SubmitFirstRecordService} from '../../../src/modules/exercise-record/application/submit-first-record.ts';
import {RecordSubmissionMediaService} from '../../../src/modules/media-evidence/application/record-submission-media.ts';
import {PostgresRecordReplay,PostgresRecordAcceptedOutbox} from '../../../src/modules/exercise-record/infrastructure/persistence/repositories/postgres-record-command-state.ts';
import {registerRecordSubmissionRoutes} from '../../../src/modules/exercise-record/api/submission-routes.ts';
import {FirstMaterialPreparationService} from '../../../src/modules/exercise-record/application/prepare-first-material.ts';
import {PostgresMaterialPreparation} from '../../../src/modules/exercise-record/infrastructure/persistence/repositories/postgres-material-preparation.ts';

// Dedicated disposable DB only. No environment/production credentials or implicit default target.
const pool = new Pool({host:'127.0.0.1',database:'p7_h_test',user:'p7_h_test',max:6,statement_timeout:4000});
const runner = new PostgresTransactionRunner(pool);
// Real SQL test adapter reproduces Z's documented row-lock protocol, not Z's full Identity implementation.
const lock = { async lockStudentOwner(scope,org,student) {
  const r = await runner.client(scope).query(`SELECT id FROM identity_access.user_subject
   WHERE id=$1 AND organization_id=$2 AND role_snapshot='STUDENT' AND closed_at IS NULL FOR NO KEY UPDATE`,[student,org]);
  if(r.rowCount!==1) throw new Error('FORBIDDEN');
}};
const repo = new PostgresSessionRepository(runner,lock);
const access = new SessionAccessService(repo);
const assets = new PostgresRecordAssetRepository(runner);
const records = new PostgresFirstRecordRepository(runner);
const transfers = new FirstMaterialTransferService(records,assets);
const org=randomUUID(), teacher=randomUUID(), semester=randomUUID(), course=randomUUID(), template=randomUUID(), rule=randomUUID();
const start=Date.parse('2026-09-09T15:59:59.000Z');
const migration=readFileSync('migrations/1500_exercise_session.sql','utf8').split('-- Down Migration');
before(async()=>{
  const db=await pool.query('SELECT current_database() AS db'); assert.equal(db.rows[0].db,'p7_h_test');
  for(const name of readdirSync('evidence/phase7/h-a/z-v1.3-migration-dependencies').sort()) {
    await pool.query(readFileSync('evidence/phase7/h-a/z-v1.3-migration-dependencies/'+name,'utf8').split('-- Down Migration')[0]);
  }
  // Validate H down/up before inserting any synthetic facts. No Z down or CASCADE executed.
  await pool.query(migration[0]); await pool.query(migration[1]); await pool.query(migration[0]);
  const replayMigration=readFileSync('migrations/1510_session_command_replay.sql','utf8').split('-- Down Migration');
  await pool.query(replayMigration[0]); await pool.query(replayMigration[1]); await pool.query(replayMigration[0]);
  const mediaMigration=readFileSync('migrations/1600_record_media_assets.sql','utf8').split('-- Down Migration');
  const recordMigration=readFileSync('migrations/1700_first_record_material.sql','utf8').split('-- Down Migration');
  await pool.query(mediaMigration[0]);await pool.query(recordMigration[0]);
  const commandMigration=readFileSync('migrations/1710_record_command_state.sql','utf8').split('-- Down Migration');
  await pool.query(commandMigration[0]);await pool.query(commandMigration[1]);
  await pool.query(recordMigration[1]);await pool.query(mediaMigration[1]);
  await pool.query(mediaMigration[0]);await pool.query(recordMigration[0]);
  await pool.query(commandMigration[0]);
  const preparationMigration=readFileSync('migrations/1720_material_preparation.sql','utf8').split('-- Down Migration');
  await pool.query(preparationMigration[0]);await pool.query(preparationMigration[1]);await pool.query(preparationMigration[0]);
  await pool.query("INSERT INTO identity_access.organization VALUES($1,'TEST','Test','Asia/Shanghai',now())",[org]);
  await pool.query("INSERT INTO identity_access.user_subject VALUES($1,$2,'TEACHER',now(),null)",[teacher,org]);
  await pool.query("INSERT INTO academic_term.semester VALUES($1,$2,'2026-2027','FIRST','Test','2026-09-01','2027-01-01','CURRENT',0,now(),now())",[semester,org]);
  await pool.query("INSERT INTO course_enrollment.rule_template_version VALUES($1,$2,1,'测试','Test',now())",[template,org]);
  const r={templateVersionId:template,courseRelatedTargetMinutes:600,otherTargetMinutes:600,thresholdMinutes:30,
    weeklyCountLimit:3,allowedIntervals:[{startsAt:start,endsAtExclusive:start+9999999}],regularCutoffAt:start+9999999,plannedSettlementAt:start+999999999};
  await pool.query(`INSERT INTO course_enrollment.course(id,organization_id,semester_id,responsible_teacher_subject_id,teacher_name_snapshot,
    name,status,join_open,rule,published_rule,version,target_revision,updated_at)
    VALUES($1,$2,$3,$4,'teacher','Test','OPEN',true,$5,$6,0,1,now())`,[course,org,semester,teacher,r,{...r,ruleVersionId:rule}]);
});
after(async()=>pool.end());
async function input(){
  const student=randomUUID(), enrollment=randomUUID();
  await pool.query("INSERT INTO identity_access.user_subject VALUES($1,$2,'STUDENT',now(),null)",[student,org]);
  await pool.query("INSERT INTO course_enrollment.enrollment(id,organization_id,semester_id,course_id,student_subject_id,status,joined_at,version) VALUES($1,$2,$3,$4,$5,'ACTIVE',now(),0)",[enrollment,org,semester,course,student]);
  return {sessionId:randomUUID(),organizationId:org,studentSubjectId:student,semesterId:semester,courseId:course,
    enrollmentId:enrollment,ruleVersionId:rule,makeupAuthorizationId:null,thresholdMinutes:30,startedAtMs:start,commandId:randomUUID()};
}
test('H migration down/up and nullable ordinary FK: real insert/read preserves Shanghai date',async()=>{
  const i=await input(); await runner.run(s=>repo.insert(s,i));
  const fact=await runner.run(s=>access.facts(s,org.toUpperCase(),i.sessionId.toUpperCase()));
  assert.equal(fact.businessDate,'2026-09-09'); assert.equal(fact.startedAtMs,start); assert.equal(fact.actualDurationMs,null);
});
test('real pause/resume/complete accumulates milliseconds and preserves original date',async()=>{
  const i=await input(); await runner.run(s=>repo.insert(s,i));
  for(const [action,version,at] of [['PAUSE',0,start+59999],['RESUME',1,start+120000],['COMPLETE',2,start+1860001]]) {
    await runner.run(s=>repo.transition(s,org,i.studentSubjectId,i.sessionId,action,version,at,randomUUID()));
  }
  const f=await runner.run(s=>repo.findLocked(s,org,i.sessionId));
  assert.equal(f.actualDurationMs,1800000); assert.equal(f.stateVersion,3); assert.equal(f.businessDate,'2026-09-09');
  assert.equal(f.activeIntervals.length,2);
  await assert.rejects(runner.run(s=>repo.transition(s,org,i.studentSubjectId,i.sessionId,'RESUME',3,start+2000000,randomUUID())),/INVALID_SESSION_TRANSITION/);
});
test('composite enrollment and rule keys reject mixed identities',async()=>{
  const a=await input(),b=await input();
  for(const changed of [{...a,enrollmentId:b.enrollmentId},{...a,ruleVersionId:randomUUID()}]) {
    await assert.rejects(runner.run(s=>repo.insert(s,changed)),e=>e.code==='23503');
  }
});
test('two actual competing starts produce exactly one durable active session',async()=>{
  const a=await input(),b={...a,sessionId:randomUUID(),commandId:randomUUID()};
  const results=await Promise.allSettled([runner.run(s=>repo.insert(s,a)),runner.run(s=>repo.insert(s,b))]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const rejected=results.find(r=>r.status==='rejected'); assert.equal(rejected.reason.code,'23505');
});
test('subsequent audit failure rolls back inserted Session and interval together',async()=>{
  const i=await input();
  await assert.rejects(runner.run(async s=>{await repo.insert(s,i); throw new Error('audit failure');}),/audit failure/);
  assert.equal(await runner.run(s=>repo.findLocked(s,org,i.sessionId)),null);
});
test('active deletion blocker uses same transaction; stale version leaves timing unchanged',async()=>{
  const i=await input(); await runner.run(s=>repo.insert(s,i));
  await assert.rejects(runner.run(s=>access.assertNoActive(s,org,i.studentSubjectId)),/ACTIVE_SESSION_EXISTS/);
  await assert.rejects(runner.run(s=>repo.transition(s,org,i.studentSubjectId,i.sessionId,'PAUSE',1,start+1000,randomUUID())),/STATE_VERSION_CONFLICT/);
  assert.equal((await runner.run(s=>repo.findLocked(s,org,i.sessionId))).stateVersion,0);
});
test('scope cannot be used after transaction end and cross-org read has no facts',async()=>{
  const i=await input(); await runner.run(s=>repo.insert(s,i)); let saved;
  await runner.run(async s=>{saved=s;});
  await assert.rejects(repo.findLocked(saved,org,i.sessionId),/TRANSACTION_SCOPE_INACTIVE/);
  assert.equal(await runner.run(s=>repo.findLocked(s,randomUUID(),i.sessionId)),null);
});
test('direct SQL cannot rewrite original identity or duration; incomplete interval set cannot commit',async()=>{
  const i=await input(); await runner.run(s=>repo.insert(s,i));
  await assert.rejects(pool.query('UPDATE exercise_session.session SET started_at=started_at+interval \'1 day\' WHERE id=$1',[i.sessionId]),/SESSION_TRANSITION_REJECTED/);
  await assert.rejects(runner.run(async s=>{
    await runner.client(s).query("UPDATE exercise_session.session SET status='COMPLETED',completed_at=started_at+interval '1 hour',actual_duration_ms=3600000,state_version=1 WHERE id=$1",[i.sessionId]);
  }),/TRANSACTION_UNAVAILABLE/);
  assert.equal((await runner.run(s=>repo.findLocked(s,org,i.sessionId))).status,'ACTIVE');
});
test('paused completion excludes pause; settled timing remains immutable',async()=>{
  const i=await input(); await runner.run(s=>repo.insert(s,i));
  await runner.run(s=>repo.transition(s,org,i.studentSubjectId,i.sessionId,'PAUSE',0,start+999,randomUUID()));
  await runner.run(s=>repo.transition(s,org,i.studentSubjectId,i.sessionId,'COMPLETE',1,start+90000,randomUUID()));
  const fact=await runner.run(s=>repo.findLocked(s,org,i.sessionId)); assert.equal(fact.actualDurationMs,999);
  await runner.run(s=>access.assertNoActive(s,org,i.studentSubjectId));
  await assert.rejects(pool.query('UPDATE exercise_session.session SET actual_duration_ms=1000 WHERE id=$1',[i.sessionId]),/SESSION_TRANSITION_REJECTED/);
});
test('subject closure and waiting start serialize even before any Session exists',async()=>{
  const i=await input(); let release, locked;
  const gate=new Promise(resolve=>{release=resolve;}); const acquired=new Promise(resolve=>{locked=resolve;});
  const closing=runner.run(async s=>{
    await lock.lockStudentOwner(s,org,i.studentSubjectId); locked(); await gate;
    await access.assertNoActive(s,org,i.studentSubjectId);
    await runner.client(s).query('UPDATE identity_access.user_subject SET closed_at=clock_timestamp() WHERE id=$1',[i.studentSubjectId]);
  });
  await acquired;
  let pid, entered; const enteredPromise=new Promise(resolve=>{entered=resolve;});
  const starting=runner.run(async s=>{
    pid=(await runner.client(s).query('SELECT pg_backend_pid() AS pid')).rows[0].pid; entered(); await repo.insert(s,i);
  });
  // Attach rejection immediately; inspect actual DB wait state rather than infer blocking from timing.
  const outcome=starting.then(()=>({ok:true}),error=>({ok:false,error}));
  try {
    await enteredPromise;
    let waiting=false;
    for(let attempt=0;attempt<100;attempt++) {
      const r=await pool.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1',[pid]);
      if(r.rows[0]?.wait_event_type==='Lock'){waiting=true;break;}
      await new Promise(resolve=>setTimeout(resolve,10));
    }
    assert.equal(waiting,true);
  } finally { release(); }
  await closing; const result=await outcome; assert.equal(result.ok,false); assert.match(result.error.message,/FORBIDDEN/);
  assert.equal(await runner.run(s=>repo.findLocked(s,org,i.sessionId)),null);
});

const key=randomBytes(32);
const secrets={id:randomUUID,digest:(purpose,value)=>createHash('sha256').update(purpose+'\0'+JSON.stringify(value)).digest('hex'),
  equal:(a,b)=>a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b)),
  seal(context,value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(context));
    return Buffer.concat([iv,cipher.update(JSON.stringify(value),'utf8'),cipher.final(),cipher.getAuthTag()]).toString('base64');},
  open(context,value){const bytes=Buffer.from(value,'base64'),decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));
    decipher.setAAD(Buffer.from(context));decipher.setAuthTag(bytes.subarray(-16));return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12,-16)),decipher.final()]).toString());}
};
// Real repositories with explicit test-only Identity/Course/activity providers; not Z integration.
async function submission(){
  const i=await finishedSession(),id=await allocatedAsset(i);
  let now=start+61000;
  const state={maintenance:false,denyIdentity:false,auditFailure:false,outboxFailure:false,activity:'ORDINARY'};
  const outbox=new PostgresRecordAcceptedOutbox(runner);
  const service=new SubmitFirstRecordService({transactions:runner,records,secrets,replay:new PostgresRecordReplay(runner),
    clock:{now:()=>now},ownerLock:lock,media:new RecordSubmissionMediaService(assets),
    sessions:{reference:(s,o,id)=>repo.reference(s,o,id),facts:(s,o,id)=>access.facts(s,o,id)},
    identity:{async authenticate(token,s,purpose){runner.client(s);
      if(token!=='test-token'||state.denyIdentity)throw new Error('AUTHENTICATION_REQUIRED');
      if(purpose==='BUSINESS'&&state.maintenance)throw new Error('SYSTEM_MAINTENANCE');
      return {organizationId:org,subjectId:i.studentSubjectId,role:'STUDENT'};}},
    mode:{async read(s){runner.client(s);return {mode:state.maintenance?'MAINTENANCE':'NORMAL'};}},
    courses:{async assertExistingChain(s,o,c,at){runner.client(s);assert.equal(o,org);assert.equal(c,course);assert.equal(at,start);}},
    eligibility:{async assertUnadjusted(s){runner.client(s);return {sourceRevision:1,activity:state.activity};}},
    audit:{async append(s,e){await runner.client(s).query('INSERT INTO audit.audit_event VALUES($1,$2,$3,$4,$5,$6,clock_timestamp())',
      [randomUUID(),org,state.auditFailure?randomUUID():e.actorSubjectId,e.action,e.resourceId,e.requestId]);}},
    outbox:{async append(s,e){await outbox.append(s,{...e,sourceRevision:state.outboxFailure?-1:e.sourceRevision});}}
  });
  const request={sessionId:i.sessionId,expectedSessionVersion:1,route:'ORDINARY',category:'OTHER',description:'Test material',
    delayExplanation:null,members:[{assetId:id,position:2,phase:null,checksumSha256:'ab'.repeat(32)}]};
  const metadata={key:randomUUID(),requestId:randomUUID()};
  return {i,id,state,service,request,metadata,time:at=>{now=at;},submit:()=>service.submit('test-token',metadata,request)};
}
test('Record concurrent same-key accepts exactly one immutable receipt/audit/outbox',async()=>{
  const f=await submission(),results=await Promise.all([f.submit(),f.submit()]);
  assert.deepEqual(results[0],results[1]);assert.equal(results[0].readiness,'PENDING_TRANSFER');
  for(const table of ['exercise_record.record','exercise_record.acceptance_outbox']){
    const r=await pool.query('SELECT count(*)::int AS n FROM '+table+' WHERE session_id=$1',[f.i.sessionId]);assert.equal(r.rows[0].n,1);
  }
  const audit=await pool.query('SELECT count(*)::int AS n FROM audit.audit_event WHERE resource_id=$1',[results[0].recordId]);assert.equal(audit.rows[0].n,1);
  await assert.rejects(pool.query('DELETE FROM exercise_record.acceptance_outbox WHERE record_id=$1',[results[0].recordId]),/RECORD_MATERIAL_IMMUTABLE/);
});
test('Record replay normalizes UUID/description and survives maintenance but not lost identity',async()=>{
  const f=await submission(),first=await f.submit();f.state.maintenance=true;f.time(start+999999999);
  const result=await f.service.submit('test-token',{...f.metadata,key:f.metadata.key.toUpperCase()},{...f.request,
    sessionId:f.request.sessionId.toUpperCase(),description:' Test material ',members:f.request.members.map(m=>({...m,assetId:m.assetId.toUpperCase(),checksumSha256:m.checksumSha256.toUpperCase()}))});
  assert.deepEqual(result,first);
  await assert.rejects(f.service.submit('test-token',f.metadata,{...f.request,description:'Changed'}),/IDEMPOTENCY_KEY_REUSED/);
  await assert.rejects(f.service.submit('test-token',{...f.metadata,key:randomUUID()},f.request),/SYSTEM_MAINTENANCE/);
  f.state.denyIdentity=true;await assert.rejects(f.submit(),/AUTHENTICATION_REQUIRED/);
});
test('Record audit and outbox SQL failures roll back record, members and replay',async()=>{
  for(const failure of ['auditFailure','outboxFailure']){
    const f=await submission();f.state[failure]=true;await assert.rejects(f.submit(),e=>['23503','23514'].includes(e.code));
    assert.equal(await runner.run(s=>records.findLocked(s,org,f.i.sessionId)),null);
    const r=await pool.query('SELECT count(*)::int AS n FROM exercise_record.command_replay WHERE subject=$1',[org+'/'+f.i.studentSubjectId+'/'+f.i.sessionId]);assert.equal(r.rows[0].n,0);
    f.state[failure]=false;assert.equal((await f.submit()).readiness,'PENDING_TRANSFER');
  }
});
test('Record command rejects stale session, wrong activity, cross-owner media and deadline equality',async()=>{
  const f=await submission();
  await assert.rejects(f.service.submit('test-token',f.metadata,{...f.request,expectedSessionVersion:0}),/VERSION_CONFLICT/);
  f.state.activity='SWIMMING';await assert.rejects(f.submit(),/MEDIA_CONTENT_INVALID/);f.state.activity='ORDINARY';
  const other=await submission();await assert.rejects(f.service.submit('test-token',f.metadata,{...f.request,members:other.request.members}));
  f.time(start+60000+86400000);await assert.rejects(f.submit(),/FIRST_MATERIAL_DEADLINE_MISSED/);
  assert.equal(await runner.run(s=>records.findLocked(s,org,f.i.sessionId)),null);
});
test('Record verified acceptance retains transfer microseconds; checksum mismatch never commits',async()=>{
  const f=await submission();await runner.run(s=>assets.recordUpload(s,org,f.id,0,'v1',BigInt(start+1000)*1000n+123n));
  await runner.run(s=>assets.recordInspection(s,org,f.id,1,inspection()));
  await assert.rejects(f.service.submit('test-token',f.metadata,{...f.request,members:f.request.members.map(m=>({...m,checksumSha256:'cd'.repeat(32)}))}));
  const result=await f.submit();assert.equal(result.readiness,'READY');assert.equal(result.transferCompletedAtUs,(BigInt(start+1000)*1000n+123n).toString());
  const bound=await runner.run(s=>assets.lock(s,org,f.i.studentSubjectId,f.i.sessionId,[f.id]));assert.equal(bound[0].status,'BOUND');assert.equal(bound[0].recordId,result.recordId);
  await assert.rejects(f.service.submit('test-token',{...f.metadata,key:randomUUID()},f.request),/FIRST_MATERIAL_ALREADY_ACCEPTED/);
});
test('Record real HTTP accepts frozen Contract request and immutable 201 response',async()=>{
  const f=await submission(),app=Fastify(),validator=createContractValidator(parse(readFileSync('/contracts/openapi.yaml','utf8')).components);
  registerRecordSubmissionRoutes(app,f.service,validator);await app.listen({host:'127.0.0.1',port:0});
  try{
    const url='http://127.0.0.1:'+app.server.address().port+'/api/v1/exercise-sessions/'+f.i.sessionId+'/record';
    const headers={'Content-Type':'application/json',Authorization:'Bearer test-token','Idempotency-Key':f.metadata.key};
    const body={submissionRoute:'ORDINARY',category:'OTHER',description:'Test material',expectedSessionVersion:1,
      items:[{mediaAssetId:f.id,position:2,phase:'GENERAL',checksumSha256:'ab'.repeat(32)}]};
    const response=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)}),value=await response.json();
    assert.equal(response.status,201,JSON.stringify(value));assert.equal(validator.accepts('FirstMaterialAcceptance',value),true);
    f.state.maintenance=true;
    const replay=await fetch(url,{method:'POST',headers,body:JSON.stringify(body)});assert.equal(replay.status,201);assert.deepEqual(await replay.json(),value);
  }finally{await app.close();}
});
test('Record offline route requires both verified phases, no continuation deadline and atomic binding',async()=>{
  const f=await submission(),second=await allocatedAsset(f.i);f.state.activity='SWIMMING';
  f.request.route='SWIMMING_OFFLINE';f.request.delayExplanation='Offline test evidence';
  f.request.members=[{...f.request.members[0],phase:'BEFORE'},{...f.request.members[0],assetId:second,position:5,phase:'AFTER'}];
  await assert.rejects(f.submit(),/MEDIA_NOT_VERIFIED/);
  for(const id of [f.id,second]){
    await runner.run(s=>assets.recordUpload(s,org,id,0,'v1',BigInt(start+1000)*1000n));
    await runner.run(s=>assets.recordInspection(s,org,id,1,inspection()));
  }
  f.state.auditFailure=true;await assert.rejects(f.submit(),e=>e.code==='23503');
  assert.equal(await runner.run(s=>records.findLocked(s,org,f.i.sessionId)),null);
  assert.deepEqual((await runner.run(s=>assets.lock(s,org,f.i.studentSubjectId,f.i.sessionId,[f.id,second]))).map(a=>a.status),['VERIFIED','VERIFIED']);
  f.state.auditFailure=false;const result=await f.submit();assert.equal(result.readiness,'READY');assert.equal(result.transferDueAtUs,null);
  assert.notEqual(result.transferCompletedAtUs,null);
  const validator=createContractValidator(parse(readFileSync('/contracts/openapi.yaml','utf8')).components);
  const {firstAcceptanceProjection}=await import('../../../src/modules/exercise-record/api/submission-routes.ts');
  assert.equal(validator.accepts('FirstMaterialAcceptance',firstAcceptanceProjection(result)),true);
  assert.deepEqual((await runner.run(s=>assets.lock(s,org,f.i.studentSubjectId,f.i.sessionId,[f.id,second]))).map(a=>a.status),['BOUND','BOUND']);
});
async function preparation(){
  const f=await submission(),accepted=await f.submit(),prepared=new PostgresMaterialPreparation(runner);
  const state={denySource:false,eventId:randomUUID()};
  const service=new FirstMaterialPreparationService({records,media:assets,prepared,ids:{id:()=>state.eventId},
    policy:{async assertUnadjusted(s){runner.client(s);if(state.denySource)throw new Error('SOURCE_UNAVAILABLE');return {sourceRevision:3};}}});
  const args={organizationId:org,ownerSubjectId:f.i.studentSubjectId,sessionId:f.i.sessionId,batchId:accepted.batchId,
    endedAtUs:BigInt(start+60000)*1000n,observedAtUs:BigInt(start+2000000)*1000n};
  const run=(input=args)=>runner.run(async s=>{
    await lock.lockStudentOwner(s,org,f.i.studentSubjectId);await repo.findLocked(s,org,f.i.sessionId);
    return service.prepare(s,input);
  });
  const verify=async()=>{
    await runner.run(s=>assets.recordUpload(s,org,f.id,0,'v1',BigInt(start+62000)*1000n+123n));
    await runner.run(s=>assets.recordInspection(s,org,f.id,1,{...inspection(),verifiedAtUs:BigInt(start+1900000)*1000n}));
  };
  return {...f,accepted,prepared,state,args,run,verify};
}
test('pending material preparation does not fabricate ready event or binding',async()=>{
  const f=await preparation();await assert.rejects(f.run(),/MATERIAL_NOT_READY/);
  assert.equal(await runner.run(s=>f.prepared.find(s,f.accepted.materialId)),null);
  assert.equal((await runner.run(s=>assets.lock(s,org,f.i.studentSubjectId,f.i.sessionId,[f.id])))[0].status,'ALLOCATED');
});
test('on-time immutable bytes remain eligible after late inspection; prepare binds once',async()=>{
  const f=await preparation();await f.verify();const result=await f.run();
  assert.equal(result.completedAtUs,BigInt(start+62000)*1000n+123n);assert.equal(result.sourceRevision,3);
  assert.equal((await runner.run(s=>assets.lock(s,org,f.i.studentSubjectId,f.i.sessionId,[f.id])))[0].status,'BOUND');
  const repeated=await f.run({...f.args,observedAtUs:f.args.observedAtUs+1000000n});assert.deepEqual(repeated,result);
  await assert.rejects(pool.query('UPDATE exercise_record.material_preparation SET source_revision=4 WHERE material_id=$1',[f.accepted.materialId]),/RECORD_MATERIAL_IMMUTABLE/);
});
test('two preparation workers serialize and keep one durable event',async()=>{
  const f=await preparation();await f.verify();const results=await Promise.all([f.run(),f.run()]);assert.deepEqual(results[0],results[1]);
  const r=await pool.query('SELECT count(*)::int AS n FROM exercise_record.material_preparation WHERE material_id=$1',[f.accepted.materialId]);assert.equal(r.rows[0].n,1);
});
test('ready event SQL failure rolls back material binding',async()=>{
  const a=await preparation();await a.verify();await a.run();
  const b=await preparation();await b.verify();b.state.eventId=a.state.eventId;
  await assert.rejects(b.run(),e=>e.code==='23505');
  assert.equal((await runner.run(s=>assets.lock(s,org,b.i.studentSubjectId,b.i.sessionId,[b.id])))[0].status,'VERIFIED');
  assert.equal(await runner.run(s=>b.prepared.find(s,b.accepted.materialId)),null);
  b.state.eventId=randomUUID();await b.run();
});
test('preparation rejects wrong original batch/owner and unavailable authoritative timeline',async()=>{
  const f=await preparation();await f.verify();
  await assert.rejects(f.run({...f.args,batchId:randomUUID()}),/MATERIAL_BATCH_CONFLICT/);
  await assert.rejects(f.run({...f.args,ownerSubjectId:randomUUID()}),/MATERIAL_SCOPE_MISMATCH/);
  f.state.denySource=true;await assert.rejects(f.run(),/SOURCE_UNAVAILABLE/);
  assert.equal(await runner.run(s=>f.prepared.find(s,f.accepted.materialId)),null);
});
test('preparation rejects bytes at exact transfer endpoint without a review verdict',async()=>{
  const f=await preparation();
  await runner.run(s=>assets.recordUpload(s,org,f.id,0,'v1',BigInt(f.accepted.transferDueAtUs)));
  await runner.run(s=>assets.recordInspection(s,org,f.id,1,{...inspection(),verifiedAtUs:BigInt(start+1900000)*1000n}));
  await assert.rejects(f.run(),/MATERIAL_TRANSFER_DEADLINE_MISSED/);
  assert.equal(await runner.run(s=>f.prepared.find(s,f.accepted.materialId)),null);
});
test('preparation cannot use inspection evidence from after its observation time',async()=>{
  const f=await preparation();await f.verify();
  await assert.rejects(f.run({...f.args,observedAtUs:BigInt(start+1800000)*1000n}),/MATERIAL_FACTS_INCONSISTENT/);
  assert.equal(await runner.run(s=>f.prepared.find(s,f.accepted.materialId)),null);
});
async function commands(){
  const i=await input();let admitted=0,now=start;const switches={denyIdentity:false,denyAdmission:false,auditFailure:false,maintenance:false};
  const service=new SessionCommandService({transactions:runner,repository:repo,replay:new PostgresSessionReplay(runner),secrets,
    clock:{now:()=>now},
    mode:{async read(scope){runner.client(scope);return {mode:switches.maintenance?'MAINTENANCE':'NORMAL'};}},
    identity:{async authenticate(token,scope,purpose){runner.client(scope);if(token!=='test-token'||switches.denyIdentity)throw new Error('AUTHENTICATION_REQUIRED');
      if(purpose==='BUSINESS'&&switches.maintenance)throw new Error('SYSTEM_MAINTENANCE');
      return {organizationId:org,subjectId:i.studentSubjectId,role:'STUDENT'};}},
    admission:{async authorizeSessionStart(scope,request){admitted++;if(switches.denyAdmission)throw new Error('MAKEUP_NOT_ALLOWED');
      assert.equal(request.courseId,course);assert.equal(request.expectedRuleVersionId,rule);await lock.lockStudentOwner(scope,org,i.studentSubjectId);
      return {organizationId:org,studentSubjectId:i.studentSubjectId,enrollmentId:i.enrollmentId,enrollmentVersion:0,admittedAt:start,
        course:{courseId:course,semesterId:semester,ruleVersionId:rule,thresholdMinutes:30},makeupAuthorization:null};}},
    courses:{async assertExistingChain(scope,organization,id,accepted){runner.client(scope);assert.equal(organization,org);assert.equal(id,course);assert.equal(accepted,start);}},
    audit:{async append(scope,event){await runner.client(scope).query(
      'INSERT INTO audit.audit_event VALUES($1,$2,$3,$4,$5,$6,clock_timestamp())',
      [randomUUID(),org,switches.auditFailure?randomUUID():event.actorSubjectId,event.action,event.resourceId,event.requestId]);}}
  });
  return {service,i,switches,admitted:()=>admitted,time:at=>{now=at;},request:{courseId:course,expectedRuleVersionId:rule,makeupAuthorizationId:null}};
}
test('application start replay is encrypted, byte-stable and does not reapply expired admission',async()=>{
  const f=await commands(),command={key:randomUUID(),requestId:randomUUID()};
  const first=await f.service.start('test-token',command,f.request);f.switches.denyAdmission=true;
  const second=await f.service.start('test-token',{...command,requestId:randomUUID()},{...f.request,courseId:course.toUpperCase()});
  assert.deepEqual(second,first);assert.equal(f.admitted(),1);
  const rows=await pool.query('SELECT sealed_result FROM exercise_session.command_replay WHERE subject=$1',[org+'/'+f.i.studentSubjectId+'/'+course]);
  assert.equal(rows.rows[0].sealed_result.includes(first.facts.sessionId),false);
});
test('application concurrent identical commands commit once and return identical result',async()=>{
  const f=await commands(),command={key:randomUUID(),requestId:randomUUID()};
  const results=await Promise.all([f.service.start('test-token',command,f.request),f.service.start('test-token',command,f.request)]);
  assert.deepEqual(results[0],results[1]);assert.equal(f.admitted(),1);
  const audit=await pool.query('SELECT count(*)::int AS count FROM audit.audit_event WHERE resource_id=$1',[results[0].facts.sessionId]);
  assert.equal(audit.rows[0].count,1);
});
test('changed command with same key is rejected and live identity is checked before replay',async()=>{
  const f=await commands(),command={key:randomUUID(),requestId:randomUUID()};await f.service.start('test-token',command,f.request);
  await assert.rejects(f.service.start('test-token',command,{...f.request,expectedRuleVersionId:randomUUID()}),/IDEMPOTENCY_KEY_REUSED/);
  f.switches.denyIdentity=true;await assert.rejects(f.service.start('test-token',command,f.request),/AUTHENTICATION_REQUIRED/);
});
test('real audit FK failure rolls back Session, intervals and replay; same command can then succeed',async()=>{
  const f=await commands(),command={key:randomUUID(),requestId:randomUUID()};f.switches.auditFailure=true;
  await assert.rejects(f.service.start('test-token',command,f.request),e=>e.code==='23503');
  assert.equal(await runner.run(s=>repo.hasActive(s,org,f.i.studentSubjectId)),false);
  const count=await pool.query('SELECT count(*)::int AS count FROM exercise_session.command_replay WHERE subject=$1',[org+'/'+f.i.studentSubjectId+'/'+course]);
  assert.equal(count.rows[0].count,0);f.switches.auditFailure=false;
  assert.equal((await f.service.start('test-token',command,f.request)).facts.status,'ACTIVE');
});
test('application transitions use original chain; replay cannot add time or repeat audit',async()=>{
  const f=await commands(),first=await f.service.start('test-token',{key:randomUUID(),requestId:randomUUID()},f.request);
  f.switches.denyAdmission=true;f.time(start+60000);
  const command={key:randomUUID(),requestId:randomUUID()},request={sessionId:first.facts.sessionId,expectedVersion:0,action:'COMPLETE'};
  const complete=await f.service.transition('test-token',command,request);f.time(start+120000);
  assert.deepEqual(await f.service.transition('test-token',command,request),complete);
  assert.equal(complete.facts.actualDurationMs,60000);assert.equal(f.admitted(),1);
});
test('real HTTP -> module routes -> application -> PostgreSQL follows frozen request/response Contract',async()=>{
  const f=await commands();
  const raw=readFileSync('/contracts/openapi.yaml','utf8').replaceAll('\r\n','\n');
  assert.equal(createHash('sha256').update(raw).digest('hex'),'5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed');
  const validator=createContractValidator(parse(raw).components),app=Fastify();
  // Minimal test-only error adapter. Production Z error/rate-limit integration remains separate.
  app.setErrorHandler((error,request,reply)=>{
    const code=error instanceof ContractInputError?'INVALID_REQUEST':error instanceof SessionCommandFailure?error.code:'INTERNAL_ERROR';
    const statuses={INVALID_REQUEST:400,FORBIDDEN:403,RESOURCE_NOT_FOUND:404,SESSION_ALREADY_ACTIVE:409,
      SESSION_TRANSITION_INVALID:409,VERSION_CONFLICT:412,IDEMPOTENCY_KEY_REUSED:409,DEPENDENCY_UNAVAILABLE:503};
    reply.code(statuses[code]??500).send({code});
  });
  registerSessionCommandRoutes(app,f.service,validator);
  await app.listen({host:'127.0.0.1',port:0});
  const address=app.server.address();const baseUrl='http://127.0.0.1:'+address.port+'/api/v1/exercise-sessions';
  const key=randomUUID();const headers={'Content-Type':'application/json','Authorization':'Bearer test-token','Idempotency-Key':key};
  try{
    const bad=await fetch(baseUrl,{method:'POST',headers,body:JSON.stringify({...f.request,actualDurationSeconds:3600})});
    assert.equal(bad.status,400);
    const first=await fetch(baseUrl,{method:'POST',headers,body:JSON.stringify(f.request)});
    assert.equal(first.status,201);assert.ok(first.headers.get('x-request-id'));
    const body=await first.json();assert.equal(validator.accepts('ExerciseSession',body),true);assert.equal(body.elapsedActiveSeconds,0);
    const replay=await fetch(baseUrl,{method:'POST',headers:{...headers,'Idempotency-Key':key.toUpperCase()},body:JSON.stringify(f.request)});
    assert.deepEqual(await replay.json(),body);
    f.time(start+60000);
    const completed=await fetch(baseUrl+'/'+body.sessionId+'/complete',{method:'POST',headers:{...headers,'Idempotency-Key':randomUUID()},body:JSON.stringify({expectedVersion:0})});
    assert.equal(completed.status,200);const end=await completed.json();assert.equal(validator.accepts('ExerciseSession',end),true);
    assert.equal(end.actualDurationSeconds,60);assert.equal(end.status,'COMPLETED');assert.equal(end.businessDate,'2026-09-09');
    const stale=await fetch(baseUrl+'/'+body.sessionId+'/resume',{method:'POST',headers:{...headers,'Idempotency-Key':randomUUID()},body:JSON.stringify({expectedVersion:0})});
    assert.equal(stale.status,412);
  }finally{await app.close();}
});
async function mediaAsset(i,kind='IMAGE'){
  const id=randomUUID();await pool.query(`INSERT INTO media_evidence.record_asset(id,organization_id,owner_subject_id,session_id,object_key,
    media_kind,declared_content_type,declared_byte_size,status,created_at,version)
    VALUES($1,$2,$3,$4,$5,$6,$7,100,'ALLOCATED',$8,0)`,[id,org,i.studentSubjectId,i.sessionId,'test/'+id,kind,kind==='IMAGE'?'image/jpeg':'video/mp4',new Date(start)]);
  return id;
}
async function finishedSession(){const i=await input();await runner.run(s=>repo.insert(s,i));
  await runner.run(s=>repo.transition(s,org,i.studentSubjectId,i.sessionId,'COMPLETE',0,start+60000,randomUUID()));return i;}
async function recordRow(i){const id=randomUUID();await pool.query(`INSERT INTO exercise_record.record(id,organization_id,owner_subject_id,session_id,category,description,accepted_at,accept_command_id)
  VALUES($1,$2,$3,$4,'OTHER','Test material',$5,$6)`,[id,org,i.studentSubjectId,i.sessionId,new Date(start+61000),randomUUID()]);return id;}
async function manifest(i,recordId,ids){const mid=randomUUID();await runner.run(async s=>{
  await runner.client(s).query(`INSERT INTO exercise_record.first_material(id,record_id,organization_id,owner_subject_id,session_id,batch_id,accepted_at,transfer_due_at,required_asset_ids,window_kind)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'ORDINARY')`,[mid,recordId,org,i.studentSubjectId,i.sessionId,randomUUID(),new Date(start+61000),new Date(start+1861000),ids]);
  for(const [position,id] of ids.entries())await runner.client(s).query(`INSERT INTO exercise_record.first_material_asset(material_id,asset_id,organization_id,owner_subject_id,session_id,position,declared_checksum_sha256)
    VALUES($1,$2,$3,$4,$5,$6,$7)`,[mid,id,org,i.studentSubjectId,i.sessionId,position,Buffer.alloc(32,0xab)]);
});return mid;}
test('first manifest locks ALLOCATED assets without claiming their technical readiness',async()=>{
  const i=await finishedSession(),id=await mediaAsset(i),record=await recordRow(i),mid=await manifest(i,record,[id]);
  const r=await pool.query('SELECT status FROM media_evidence.record_asset WHERE id=$1',[id]);assert.equal(r.rows[0].status,'ALLOCATED');
  assert.ok(mid);
});
test('record cannot refer to ACTIVE Session or take a second first receipt',async()=>{
  const i=await input();await runner.run(s=>repo.insert(s,i));await assert.rejects(recordRow(i),e=>e.code==='23503');
  await runner.run(s=>repo.transition(s,org,i.studentSubjectId,i.sessionId,'COMPLETE',0,start+1000,randomUUID()));
  await recordRow(i);await assert.rejects(recordRow(i),e=>e.code==='23505');
});
test('locked manifest cannot gain new members after acceptance, nor rewrite original links',async()=>{
  const i=await finishedSession(),a=await mediaAsset(i),b=await mediaAsset(i),record=await recordRow(i),mid=await manifest(i,record,[a]);
  await assert.rejects(pool.query(`INSERT INTO exercise_record.first_material_asset VALUES($1,$2,$3,$4,$5,1,null,$6)`,[mid,b,org,i.studentSubjectId,i.sessionId,Buffer.alloc(32,0xab)]),/LOCKED_MANIFEST_MISMATCH/);
  await assert.rejects(pool.query('DELETE FROM exercise_record.first_material_asset WHERE material_id=$1',[mid]),/RECORD_MATERIAL_IMMUTABLE/);
  await assert.rejects(pool.query('UPDATE exercise_record.first_material SET required_asset_ids=$2 WHERE id=$1',[mid,[a,b]]),/RECORD_MATERIAL_IMMUTABLE/);
});
test('material rejects cross-owner asset and empty/missing membership cannot commit',async()=>{
  const a=await finishedSession(),b=await finishedSession(),other=await mediaAsset(b),record=await recordRow(a);
  await assert.rejects(manifest(a,record,[other]),e=>e.code==='23503');
  await assert.rejects(manifest(a,record,[]),e=>e.code==='23514');
});
test('authoritative transfer microseconds retained; invalid video cannot become VERIFIED',async()=>{
  const i=await finishedSession(),id=await mediaAsset(i,'VIDEO');
  await pool.query("UPDATE media_evidence.record_asset SET status='UPLOADED',uploaded_at=$2,object_version='v1',version=1 WHERE id=$1",[id,'2026-09-09T16:00:00.123456Z']);
  const r=await pool.query("SELECT to_char(uploaded_at AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI:SS.US') AS instant FROM media_evidence.record_asset WHERE id=$1",[id]);
  assert.equal(r.rows[0].instant,'2026-09-09 16:00:00.123456');
  await assert.rejects(pool.query(`UPDATE media_evidence.record_asset SET status='VERIFIED',verified_at=$2,content_type='video/mp4',byte_size=100,
    checksum_sha256=$3,duration_ms=15001,has_audio=true,version=2 WHERE id=$1`,[id,new Date(start+90000),Buffer.alloc(32)]),e=>e.code==='23514');
});
test('verified object identity is immutable and binding must reference same Record owner/session',async()=>{
  const i=await finishedSession(),id=await mediaAsset(i),record=await recordRow(i);
  await pool.query("UPDATE media_evidence.record_asset SET status='UPLOADED',uploaded_at=$2,object_version='v1',version=1 WHERE id=$1",[id,new Date(start+1000)]);
  await pool.query(`UPDATE media_evidence.record_asset SET status='VERIFIED',verified_at=$2,content_type='image/jpeg',byte_size=100,checksum_sha256=$3,version=2 WHERE id=$1`,[id,new Date(start+2000),Buffer.alloc(32)]);
  await assert.rejects(pool.query("UPDATE media_evidence.record_asset SET status='BOUND',record_id=$2,object_version='v2',version=3 WHERE id=$1",[id,record]),/MEDIA_OBJECT_IMMUTABLE/);
  await assert.rejects(pool.query("UPDATE media_evidence.record_asset SET status='BOUND',record_id=$2,version=3 WHERE id=$1",[id,randomUUID()]),e=>e.code==='23503');
  await pool.query("UPDATE media_evidence.record_asset SET status='BOUND',record_id=$2,version=3 WHERE id=$1",[id,record]);
  await assert.rejects(pool.query('DELETE FROM media_evidence.record_asset WHERE id=$1',[id]),/MEDIA_HISTORY_IMMUTABLE/);
});

async function allocatedAsset(i,kind='IMAGE'){
  const id=randomUUID();await runner.run(s=>assets.allocate(s,{id,organizationId:org,ownerSubjectId:i.studentSubjectId,
    sessionId:i.sessionId,objectKey:'repository-test/'+id,mediaKind:kind,declaredContentType:kind==='IMAGE'?'image/jpeg':'video/mp4',
    declaredByteSize:100,createdAtUs:BigInt(start)*1000n}));return id;
}
function inspection(objectVersion='v1') {return {objectVersion,verifiedAtUs:BigInt(start+3000)*1000n,
  contentType:'image/jpeg',byteSize:100,checksumSha256:'ab'.repeat(32),durationMilliseconds:null,hasAudio:null};}
test('media repository preserves exact completion and verified facts through binding and replay',async()=>{
  const i=await finishedSession(),id=await allocatedAsset(i),record=await recordRow(i);await manifest(i,record,[id]);
  const at=BigInt(start+1000)*1000n+123n;
  await runner.run(s=>assets.recordUpload(s,org,id,0,'v1',at));
  await runner.run(s=>assets.recordInspection(s,org,id,1,inspection()));
  await runner.run(s=>assets.bind(s,org,i.studentSubjectId,i.sessionId,record,[id]));
  await runner.run(s=>assets.bind(s,org,i.studentSubjectId,i.sessionId,record,[id.toUpperCase()]));
  const [fact]=await runner.run(s=>assets.lock(s,org,i.studentSubjectId,i.sessionId,[id]));
  assert.equal(fact.status,'BOUND');assert.equal(fact.version,3);assert.equal(fact.completedAtUs,at);
  assert.equal(fact.checksumSha256,'ab'.repeat(32));assert.equal(fact.recordId,record);assert.ok(Object.isFrozen(fact));
});
test('media repository denies wrong owner, duplicate identifiers and stale object inspections',async()=>{
  const i=await finishedSession(),other=await finishedSession(),id=await allocatedAsset(i);
  await assert.rejects(runner.run(s=>assets.lock(s,org,other.studentSubjectId,i.sessionId,[id])),/MEDIA_SCOPE_MISMATCH/);
  await assert.rejects(runner.run(s=>assets.lock(s,org,i.studentSubjectId,i.sessionId,[id,id.toUpperCase()])),/MEDIA_SET_INVALID/);
  await runner.run(s=>assets.recordUpload(s,org,id,0,'v1',BigInt(start+1000)*1000n));
  await assert.rejects(runner.run(s=>assets.recordInspection(s,org,id,1,inspection('v2'))),/MEDIA_VERSION_CONFLICT/);
  const [fact]=await runner.run(s=>assets.lock(s,org,i.studentSubjectId,i.sessionId,[id]));assert.equal(fact.status,'UPLOADED');assert.equal(fact.version,1);
});
test('media batch binding rolls back earlier updates if any locked member is not ready',async()=>{
  const i=await finishedSession(),a=await allocatedAsset(i),b=await allocatedAsset(i),record=await recordRow(i);
  await manifest(i,record,[a,b]);
  const ids=[a,b].sort();await runner.run(s=>assets.recordUpload(s,org,ids[0],0,'v1',BigInt(start+1000)*1000n));
  await runner.run(s=>assets.recordInspection(s,org,ids[0],1,inspection()));
  await assert.rejects(runner.run(s=>assets.bind(s,org,i.studentSubjectId,i.sessionId,record,ids)),/MEDIA_NOT_READY/);
  const facts=await runner.run(s=>assets.lock(s,org,i.studentSubjectId,i.sessionId,ids));
  assert.equal(facts[0].status,'VERIFIED');assert.equal(facts[0].recordId,null);assert.equal(facts[1].status,'ALLOCATED');
});

function receiptFor(i,ids){return FirstMaterialReceipt.accept({organizationId:org,ownerSubjectId:i.studentSubjectId,sessionId:i.sessionId,
  recordId:randomUUID(),batchId:randomUUID(),endedAtUs:BigInt(start+60000)*1000n,acceptedAtUs:BigInt(start+61000)*1000n+789n,
  window:'ORDINARY',offlineExplanation:null,requiredAssetIds:ids});}
function recordDetails(ids){return {materialId:randomUUID(),commandId:randomUUID(),category:'OTHER',description:'Original evidence',
  members:ids.map((assetId,position)=>({assetId,position,phase:null,checksumSha256:'ab'.repeat(32)}))};}
test('record repository persists exact receipt and ordered immutable asset set',async()=>{
  const i=await finishedSession(),ids=[await allocatedAsset(i),await allocatedAsset(i)],receipt=receiptFor(i,ids),details=recordDetails(ids);
  await runner.run(s=>records.insert(s,receipt,details));
  const stored=await runner.run(s=>records.findLocked(s,org,i.sessionId));
  assert.equal(stored.recordId,receipt.fact.recordId);assert.equal(stored.acceptedAtUs,receipt.fact.acceptedAtUs);
  assert.equal(stored.transferDueAtUs,receipt.transferDueAtUs);assert.deepEqual(stored.members,details.members);
  assert.equal(await runner.run(s=>records.findLocked(s,randomUUID(),i.sessionId)),null);
  assert.equal(Object.isFrozen(stored.members),true);
});
test('record repository rejects reordered batch before writes and cannot renew first acceptance',async()=>{
  const i=await finishedSession(),ids=[await allocatedAsset(i),await allocatedAsset(i)],receipt=receiptFor(i,ids);
  await assert.rejects(runner.run(s=>records.insert(s,receipt,recordDetails([...ids].reverse()))),/RECORD_MANIFEST_MISMATCH/);
  assert.equal(await runner.run(s=>records.findLocked(s,org,i.sessionId)),null);
  await runner.run(s=>records.insert(s,receipt,recordDetails(ids)));
  await assert.rejects(runner.run(s=>records.insert(s,receiptFor(i,ids),recordDetails(ids))),e=>e.code==='23505');
  assert.equal((await runner.run(s=>records.findLocked(s,org,i.sessionId))).acceptedAtUs,receipt.fact.acceptedAtUs);
});
test('record repository and media binding participate in the same rollback boundary',async()=>{
  const i=await finishedSession(),id=await allocatedAsset(i),receipt=receiptFor(i,[id]);
  await runner.run(s=>assets.recordUpload(s,org,id,0,'v1',BigInt(start+1000)*1000n));
  await runner.run(s=>assets.recordInspection(s,org,id,1,inspection()));
  await assert.rejects(runner.run(async s=>{
    await records.insert(s,receipt,recordDetails([id]));await assets.bind(s,org,i.studentSubjectId,i.sessionId,receipt.fact.recordId,[id]);
    await runner.client(s).query('INSERT INTO audit.audit_event VALUES($1,$2,$3,$4,$5,$6,clock_timestamp())',
      [randomUUID(),org,randomUUID(),'RECORD_ACCEPT',receipt.fact.recordId,randomUUID()]);
  }),e=>e.code==='23503');
  assert.equal(await runner.run(s=>records.findLocked(s,org,i.sessionId)),null);
  assert.equal((await runner.run(s=>assets.lock(s,org,i.studentSubjectId,i.sessionId,[id])))[0].status,'VERIFIED');
});

async function transferFixture(){
  const i=await finishedSession(),id=await allocatedAsset(i),receipt=receiptFor(i,[id]);
  await runner.run(s=>records.insert(s,receipt,recordDetails([id])));
  return {i,id,receipt,request:{organizationId:org,ownerSubjectId:i.studentSubjectId,sessionId:i.sessionId,batchId:receipt.fact.batchId,
    endedAtUs:BigInt(start+60000)*1000n,observedAtUs:receipt.transferDueAtUs+1000000n}};
}
test('transfer application uses authoritative completion rather than later request time or content readiness',async()=>{
  const f=await transferFixture();
  await assert.rejects(runner.run(s=>transfers.evaluate(s,f.request)),/OBJECTS_INCOMPLETE/);
  const completion=f.receipt.transferDueAtUs-1n;
  await runner.run(s=>assets.recordUpload(s,org,f.id,0,'v1',completion));
  const result=await runner.run(s=>transfers.evaluate(s,f.request));
  assert.equal(result.transferCompletedAtUs,completion);assert.equal(result.inspectionComplete,false);
  assert.equal(result.requiresTeacherAnomalyReview,false);
  await runner.run(s=>assets.recordInspection(s,org,f.id,1,{...inspection(),verifiedAtUs:f.request.observedAtUs}));
  assert.equal((await runner.run(s=>transfers.evaluate(s,f.request))).inspectionComplete,true);
});
test('transfer application rejects exact deadline, foreign owner and a substituted batch',async()=>{
  const f=await transferFixture();await runner.run(s=>assets.recordUpload(s,org,f.id,0,'v1',f.receipt.transferDueAtUs));
  await assert.rejects(runner.run(s=>transfers.evaluate(s,f.request)),/TRANSFER_WINDOW_EXPIRED/);
  await assert.rejects(runner.run(s=>transfers.evaluate(s,{...f.request,ownerSubjectId:randomUUID()})),/MATERIAL_SCOPE_MISMATCH/);
  await assert.rejects(runner.run(s=>transfers.evaluate(s,{...f.request,batchId:randomUUID()})),/BATCH_MISMATCH/);
});

test('offline timing receipt persists null continuation and requires pre-acceptance inspection facts',async()=>{
  // Timing/storage boundary only; not evidence of swimming phase authenticity or full submission authorization.
  const i=await finishedSession(),id=await allocatedAsset(i),ordinary=receiptFor(i,[id]);
  const completed=BigInt(start+1000)*1000n,verified=BigInt(start+3000)*1000n;
  await runner.run(s=>assets.recordUpload(s,org,id,0,'v1',completed));
  await runner.run(s=>assets.recordInspection(s,org,id,1,inspection()));
  const receipt=FirstMaterialReceipt.accept({...ordinary.fact,window:'SWIMMING_OFFLINE',offlineExplanation:'Original offline evidence'},
    [{assetId:id,organizationId:org,ownerSubjectId:i.studentSubjectId,sessionId:i.sessionId,completedAtUs:completed,verifiedAtUs:verified}]);
  await runner.run(s=>records.insert(s,receipt,recordDetails([id])));
  const stored=await runner.run(s=>records.findLocked(s,org,i.sessionId));assert.equal(stored.transferDueAtUs,null);
  const result=await runner.run(s=>transfers.evaluate(s,{organizationId:org,ownerSubjectId:i.studentSubjectId,sessionId:i.sessionId,
    batchId:receipt.fact.batchId,endedAtUs:receipt.fact.endedAtUs,observedAtUs:receipt.fact.acceptedAtUs+1000000n}));
  assert.equal(result.inspectionComplete,true);assert.equal(result.requiresTeacherAnomalyReview,true);
});

test('database disallows offline continuation deadlines and null ordinary deadlines',async()=>{
  for(const window of ['ORDINARY','SWIMMING_OFFLINE']){
    const i=await finishedSession(),id=await allocatedAsset(i),record=await recordRow(i);
    await assert.rejects(pool.query(`INSERT INTO exercise_record.first_material
      (id,record_id,organization_id,owner_subject_id,session_id,batch_id,accepted_at,transfer_due_at,required_asset_ids,window_kind,offline_explanation)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'offline')`,[randomUUID(),record,org,i.studentSubjectId,i.sessionId,randomUUID(),
        new Date(start+61000),window==='ORDINARY'?null:new Date(start+1861000),[id],window]),e=>e.code==='23514');
  }
});

test('declared checksum is immutable and different inspected content cannot become a ready material',async()=>{
  const f=await transferFixture();await runner.run(s=>assets.recordUpload(s,org,f.id,0,'v1',BigInt(start+1000)*1000n));
  await runner.run(s=>assets.recordInspection(s,org,f.id,1,{...inspection(),checksumSha256:'cd'.repeat(32)}));
  await assert.rejects(runner.run(s=>transfers.evaluate(s,f.request)),/MEDIA_CONTENT_INVALID/);
  await assert.rejects(pool.query('UPDATE exercise_record.first_material_asset SET declared_checksum_sha256=$2 WHERE asset_id=$1',
    [f.id,Buffer.alloc(32,0xcd)]),/RECORD_MATERIAL_IMMUTABLE/);
});

test('noncontiguous Contract positions persist without renumbering; input array order is canonicalized',async()=>{
  const i=await finishedSession(),ids=[await allocatedAsset(i),await allocatedAsset(i)],receipt=receiptFor(i,ids),details=recordDetails(ids);
  details.members[0].position=2;details.members[1].position=6;
  await runner.run(s=>records.insert(s,receipt,{...details,members:[...details.members].reverse()}));
  const stored=await runner.run(s=>records.findLocked(s,org,i.sessionId));assert.deepEqual(stored.members,details.members);
});

test('maintenance permits exact committed start/transition replay but forbids a new command',async()=>{
  const f=await commands(),startCommand={key:randomUUID(),requestId:randomUUID()};
  const first=await f.service.start('test-token',startCommand,f.request);f.time(start+1000);
  const completeCommand={key:randomUUID(),requestId:randomUUID()},input={sessionId:first.facts.sessionId,expectedVersion:0,action:'COMPLETE'};
  const complete=await f.service.transition('test-token',completeCommand,input);f.switches.maintenance=true;
  assert.deepEqual(await f.service.start('test-token',startCommand,f.request),first);
  assert.deepEqual(await f.service.transition('test-token',completeCommand,input),complete);
  await assert.rejects(f.service.transition('test-token',{key:randomUUID(),requestId:randomUUID()},input),/SYSTEM_MAINTENANCE/);
  f.switches.denyIdentity=true;
  await assert.rejects(f.service.transition('test-token',completeCommand,input),/AUTHENTICATION_REQUIRED/);
});

function queries(actor){return new SessionQueryService({transactions:runner,repository:repo,clock:{now:()=>start+90000},
  identity:{async authenticate(token,scope){runner.client(scope);if(token!=='query-token')throw new Error('AUTHENTICATION_REQUIRED');return actor;}},
  courses:{async facts(scope,organization,id){const r=await runner.client(scope).query(
    'SELECT id,organization_id,responsible_teacher_subject_id FROM course_enrollment.course WHERE organization_id=$1 AND id=$2 FOR SHARE',[organization,id]);
    const row=r.rows[0];if(!row)throw new Error('RESOURCE_NOT_FOUND');return {courseId:row.id,organizationId:row.organization_id,responsibleTeacherSubjectId:row.responsible_teacher_subject_id};}}
});}
test('session query allows original owner and completed responsible-teacher projection only',async()=>{
  const i=await input();await runner.run(s=>repo.insert(s,i));
  const student=queries({subjectId:i.studentSubjectId,organizationId:org,role:'STUDENT'});
  const responsible=queries({subjectId:teacher,organizationId:org,role:'TEACHER'});
  assert.equal((await student.get('query-token',i.sessionId)).facts.status,'ACTIVE');
  await assert.rejects(responsible.get('query-token',i.sessionId),/FORBIDDEN/);
  await assert.rejects(queries({subjectId:randomUUID(),organizationId:org,role:'STUDENT'}).get('query-token',i.sessionId),/RESOURCE_NOT_FOUND/);
  await assert.rejects(queries({subjectId:randomUUID(),organizationId:org,role:'TEACHER'}).get('query-token',i.sessionId),/FORBIDDEN/);
  await assert.rejects(queries({subjectId:i.studentSubjectId,organizationId:randomUUID(),role:'STUDENT'}).get('query-token',i.sessionId),/RESOURCE_NOT_FOUND/);
  await runner.run(s=>repo.transition(s,org,i.studentSubjectId,i.sessionId,'COMPLETE',0,start+60000,randomUUID()));
  assert.equal((await responsible.get('query-token',i.sessionId)).facts.status,'COMPLETED');
});
test('real query HTTP response validates frozen Contract and does not require an idempotency key',async()=>{
  const i=await finishedSession(),service=queries({subjectId:i.studentSubjectId,organizationId:org,role:'STUDENT'});
  const validator=createContractValidator(parse(readFileSync('/contracts/openapi.yaml','utf8')).components),app=Fastify();
  registerSessionQueryRoutes(app,service,validator);await app.listen({host:'127.0.0.1',port:0});
  try{const response=await fetch('http://127.0.0.1:'+app.server.address().port+'/api/v1/exercise-sessions/'+i.sessionId,
    {headers:{Authorization:'Bearer query-token'}});
    assert.equal(response.status,200);assert.ok(response.headers.get('x-request-id'));
    assert.equal(validator.accepts('ExerciseSession',await response.json()),true);
  }finally{await app.close();}
});
