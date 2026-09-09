import { createHmac, randomBytes, randomInt, randomUUID, scrypt, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
import type { Clock, PasswordHasher, Secrets } from '../application/runtime.ts';
export const systemClock: Clock = { now: () => Date.now() };
function canonical(value: unknown): string {
    if (value === null || typeof value !== 'object') {
        const result = JSON.stringify(value);
        if (result === undefined)
            throw new Error('NON_CANONICAL_INPUT');
        return result;
    }
    if (Array.isArray(value))
        return '[' + value.map(canonical).join(',') + ']';
    return '{' + Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([key, v]) => JSON.stringify(key) + ':' + canonical(v)).join(',') + '}';
}
export class NodeSecrets implements Secrets {
    private readonly digestKey: Buffer;
    private readonly encryptionKey: Buffer;
    constructor(digestKey: Buffer, encryptionKey: Buffer) {
        if (digestKey.length !== 32 || encryptionKey.length !== 32 || digestKey.equals(encryptionKey))
            throw new Error('INVALID_SECRET_CONFIGURATION');
        this.digestKey = Buffer.from(digestKey);
        this.encryptionKey = Buffer.from(encryptionKey);
    }
    id() { return randomUUID(); }
    token() { return randomBytes(32).toString('base64url'); }
    otp() { return String(randomInt(0, 1000000)).padStart(6, '0'); }
    digest(purpose: string, value: unknown) { return createHmac('sha256', this.digestKey).update(purpose + '\0' + canonical(value)).digest('hex'); }
    equal(left: string, right: string) {
        const a = Buffer.from(left), b = Buffer.from(right);
        return a.length === b.length && timingSafeEqual(a, b);
    }
    seal(context: string, value: unknown) {
        const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
        cipher.setAAD(Buffer.from(context));
        const encrypted = Buffer.concat([cipher.update(canonical(value), 'utf8'), cipher.final()]);
        return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
    }
    open<T>(context: string, value: string): T {
        const bytes = Buffer.from(value, 'base64url');
        if (bytes.length < 28)
            throw new Error('INVALID_REPLAY_CIPHERTEXT');
        const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, bytes.subarray(0, 12));
        decipher.setAAD(Buffer.from(context));
        decipher.setAuthTag(bytes.subarray(12, 28));
        return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')) as T;
    }
}
const parameters = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 } as const;
const derive = (password: string, salt: Buffer) => new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 32, parameters, (error, value) => error ? reject(error) : resolve(value));
});
export class ScryptPasswords implements PasswordHasher {
    async hash(password: string) {
        const salt = randomBytes(16), key = await derive(password, salt);
        return '$scrypt$ln=17,r=8,p=1$' + salt.toString('base64url') + '$' + key.toString('base64url');
    }
    async verify(password: string, encoded: string) {
        const match = /^\$scrypt\$ln=17,r=8,p=1\$([A-Za-z0-9_-]{22})\$([A-Za-z0-9_-]{43})$/.exec(encoded);
        if (!match)
            throw new Error('INVALID_PASSWORD_PERSISTENCE');
        const actual = await derive(password, Buffer.from(match[1]!, 'base64url'));
        return timingSafeEqual(actual, Buffer.from(match[2]!, 'base64url'));
    }
}
