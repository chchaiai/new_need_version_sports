import { LocalMailpitOtpDelivery } from '../modules/identity-access/infrastructure/transport/local-mailpit-otp-delivery.ts';
/** Explicit opt-in only; production must provide its own approved OtpDelivery. */
export function createLocalMailDelivery(env: NodeJS.ProcessEnv) {
    if (env.NODE_ENV === 'production' || env.P7_MAIL_MODE !== 'local_mailpit' || !env.P7_LOCAL_MAILPIT_URL)
        throw new Error('LOCAL_MAIL_EXPLICIT_CONFIGURATION_REQUIRED');
    return new LocalMailpitOtpDelivery(env.P7_LOCAL_MAILPIT_URL);
}
