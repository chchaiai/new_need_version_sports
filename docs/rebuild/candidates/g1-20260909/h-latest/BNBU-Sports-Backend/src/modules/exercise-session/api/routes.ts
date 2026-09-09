import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ContractValidator } from '../../../shared/api/contract-validator.ts';
import { SessionCommandFailure, type SessionCommandService } from '../application/session-commands.ts';
import { sessionProjection } from './session-projection.ts';

const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function metadata(request:FastifyRequest) {
  const key=request.headers['idempotency-key'],authorization=request.headers.authorization;
  if(typeof key!=='string'||!uuidPattern.test(key))throw new SessionCommandFailure('INVALID_REQUEST');
  // An absent credential is passed to the live Identity port to classify as authentication failure.
  const match=typeof authorization==='string'?/^Bearer ([^\s]+)$/i.exec(authorization):null;
  return {token:match?.[1]??'',command:{key:key.toLowerCase(),requestId:request.id}};
}

/** Z bootstrap owns common error mapping, rate limits and production dependencies. */
export function registerSessionCommandRoutes(app:FastifyInstance,service:SessionCommandService,validator:ContractValidator):void {
  app.post('/api/v1/exercise-sessions',async(request,reply)=>{
    const meta=metadata(request),input=validator.parse('StartExerciseSessionRequest',request.body);
    const result=sessionProjection(await service.start(meta.token,meta.command,input));
    if(!validator.accepts('ExerciseSession',result))throw new Error('SESSION_OUTPUT_CONTRACT_INVALID');
    return reply.header('X-Request-Id',request.id).code(201).send(result);
  });
  for(const [segment,action] of [['pause','PAUSE'],['resume','RESUME'],['complete','COMPLETE']] as const) {
    app.post<{Params:{sessionId:string}}>('/api/v1/exercise-sessions/:sessionId/'+segment,async(request,reply)=>{
      const meta=metadata(request),input=validator.parse('ExerciseSessionTransitionRequest',request.body);
      if(!uuidPattern.test(request.params.sessionId))throw new SessionCommandFailure('INVALID_REQUEST');
      const result=sessionProjection(await service.transition(meta.token,meta.command,{...input,sessionId:request.params.sessionId,action}));
      if(!validator.accepts('ExerciseSession',result))throw new Error('SESSION_OUTPUT_CONTRACT_INVALID');
      return reply.header('X-Request-Id',request.id).code(200).send(result);
    });
  }
}
