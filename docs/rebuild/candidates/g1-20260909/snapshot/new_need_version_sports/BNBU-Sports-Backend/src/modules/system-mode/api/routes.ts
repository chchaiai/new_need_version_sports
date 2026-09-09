import type { FastifyInstance } from 'fastify';
import type { ContractValidator } from '../../../shared/api/contract-validator.ts';
import { route, instant } from '../../../shared/api/route-kit.ts';
import type { TransactionRunner } from '../../../shared/application/transactions/transaction-runner.ts';
import type { ModeAccess } from '../application/public/system-mode.ts';
export function registerSystemMode(app: FastifyInstance, v: ContractValidator, mode: ModeAccess, tx: TransactionRunner, org: string) {
    route(app, v, 'GET', '/system-mode', 'SystemMode', 200, async () => {
        const state = await tx.run(s => mode.read(s, org));
        return { ...state, updatedAt: instant(state.updatedAt) };
    });
}
