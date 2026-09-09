import {RecordSubmissionFailure} from './submit-first-record.ts';
import {MaterialDeclarationFailure} from '../domain/material-declarations.ts';

/** Typed policy for Z's common envelope; arbitrary exception text is never a public error code. */
export function recordSubmissionErrorPolicy(error:unknown):{code:string;status:number}|null {
  if(error instanceof MaterialDeclarationFailure)return {code:'MATERIAL_BATCH_CONFLICT',status:409};
  if(!(error instanceof RecordSubmissionFailure))return null;
  const statuses:Record<RecordSubmissionFailure['code'],number>={
    INVALID_REQUEST:400,RECORD_DESCRIPTION_INVALID:422,FORBIDDEN:403,RESOURCE_NOT_FOUND:404,
    IDEMPOTENCY_KEY_REUSED:409,SESSION_TRANSITION_INVALID:409,VERSION_CONFLICT:412,
    FIRST_MATERIAL_ALREADY_ACCEPTED:409,FIRST_MATERIAL_DEADLINE_MISSED:409,
    MEDIA_CONTENT_INVALID:422,MEDIA_NOT_VERIFIED:409,DEPENDENCY_UNAVAILABLE:503
  };
  return {code:error.code,status:statuses[error.code]};
}
