import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RecordSubmissionFailure} from '../application/submit-first-record.ts';
import {recordSubmissionErrorPolicy} from '../application/submission-error-policy.ts';
import {MaterialDeclarationFailure} from '../domain/material-declarations.ts';

test('submission errors retain frozen HTTP distinctions',()=>{
  const codes={INVALID_REQUEST:400,RECORD_DESCRIPTION_INVALID:422,FORBIDDEN:403,RESOURCE_NOT_FOUND:404,
    IDEMPOTENCY_KEY_REUSED:409,SESSION_TRANSITION_INVALID:409,VERSION_CONFLICT:412,
    FIRST_MATERIAL_ALREADY_ACCEPTED:409,FIRST_MATERIAL_DEADLINE_MISSED:409,
    MEDIA_CONTENT_INVALID:422,MEDIA_NOT_VERIFIED:409,DEPENDENCY_UNAVAILABLE:503} as const;
  for(const [code,status] of Object.entries(codes))assert.deepEqual(recordSubmissionErrorPolicy(new RecordSubmissionFailure(code as keyof typeof codes)),{code,status});
  assert.deepEqual(recordSubmissionErrorPolicy(new MaterialDeclarationFailure()),{code:'MATERIAL_BATCH_CONFLICT',status:409});
});
test('unknown or spoofed submission exceptions are not classified from text',()=>{
  assert.equal(recordSubmissionErrorPolicy(new Error('INVALID_REQUEST')),null);
  assert.equal(recordSubmissionErrorPolicy({code:'FORBIDDEN'}),null);
});
