import type { TransactionScope } from './transactions/transaction-runner.ts';
/** Generic runtime primitives shared by independent modules; no business models. */
export interface Clock {
    now(): number;
}
export interface Secrets {
    id(): string;
    token(): string;
    otp(): string;
    digest(purpose: string, value: unknown): string;
    equal(left: string, right: string): boolean;
    seal(context: string, value: unknown): string;
    open<T>(context: string, value: string): T;
}
export interface PasswordHasher {
    hash(password: string): Promise<string>;
    verify(password: string, encoded: string): Promise<boolean>;
}
export interface CommandIdentity {
    key: string;
    requestId: string;
}
export interface ReplayStore {
    reserve(scope: TransactionScope, subject: string, operation: string, keyDigest: string, fingerprint: string): Promise<{
        fingerprint: string;
        result: string | null;
    }>;
    finish(scope: TransactionScope, subject: string, operation: string, keyDigest: string, result: string): Promise<void>;
}
export { Failure, ensure } from '../domain/failure.ts';
import { ensure } from '../domain/failure.ts';
export async function replay<T>(store: ReplayStore, secrets: Secrets, scope: TransactionScope, subject: string, operation: string, command: CommandIdentity, input: unknown, execute: () => Promise<T>): Promise<T> {
    const key = secrets.digest('idempotency-key', command.key);
    const fingerprint = secrets.digest('command/' + operation, input);
    const context = subject + '/' + operation + '/' + key;
    const saved = await store.reserve(scope, subject, operation, key, fingerprint);
    ensure(secrets.equal(saved.fingerprint, fingerprint), 'IDEMPOTENCY_KEY_REUSED');
    if (saved.result !== null)
        return secrets.open<T>(context, saved.result);
    const result = await execute();
    await store.finish(scope, subject, operation, key, secrets.seal(context, result));
    return result;
}
