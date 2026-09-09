import type {FastifyInstance} from 'fastify';
import type {ContractValidator} from '../../../shared/api/contract-validator.ts';
import type {SessionQueryService} from '../application/session-queries.ts';
import {sessionProjection} from './session-projection.ts';
export function registerSessionQueryRoutes(app:FastifyInstance,service:SessionQueryService,validator:ContractValidator):void{
  app.get<{Params:{sessionId:string}}>('/api/v1/exercise-sessions/:sessionId',async(request,reply)=>{
    const match=typeof request.headers.authorization==='string'?/^Bearer ([^\s]+)$/i.exec(request.headers.authorization):null;
    const result=sessionProjection(await service.get(match?.[1]??'',request.params.sessionId));
    if(!validator.accepts('ExerciseSession',result))throw new Error('SESSION_OUTPUT_CONTRACT_INVALID');
    return reply.header('X-Request-Id',request.id).code(200).send(result);
  });
}
