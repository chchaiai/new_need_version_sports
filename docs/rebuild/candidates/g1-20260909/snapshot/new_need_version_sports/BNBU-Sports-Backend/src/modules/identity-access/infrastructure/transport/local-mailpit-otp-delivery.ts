import type { OtpDelivery } from '../../application/ports/dependencies.ts';
import { Failure } from '../../../../shared/application/runtime.ts';
/** Development-only local inbox. No SMTP relay, remote credentials or production fallback. */
export class LocalMailpitOtpDelivery implements OtpDelivery {
    private readonly origin: string;
    constructor(origin: string) {
        const url = new URL(origin);
        if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]', 'mailpit'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/')
            throw new Error('INVALID_LOCAL_MAIL_CONFIGURATION');
        this.origin = url.origin;
    }
    async send(email: string, code: string, purpose: string): Promise<void> {
        try {
            const response = await fetch(this.origin + '/api/v1/send', {
                method: 'POST', redirect: 'error', signal: AbortSignal.timeout(2000),
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ From: { Email: 'no-reply@bnbu-sports.test', Name: 'BNBU Sports Local' },
                    To: [{ Email: email }], Subject: 'BNBU Sports / ' + purpose,
                    Text: '您的验证码 / Verification code: ' + code + '\n请勿向他人提供验证码。Do not share this code.' })
            });
            if (response.status !== 200)
                throw new Error('MAIL_REJECTED');
            const result: unknown = await response.json();
            if (!result || typeof result !== 'object' || !('ID' in result) || typeof result.ID !== 'string' || !result.ID)
                throw new Error('MAIL_RECEIPT_INVALID');
        }
        catch {
            throw new Failure('DEPENDENCY_UNAVAILABLE', 503);
        }
    }
}
