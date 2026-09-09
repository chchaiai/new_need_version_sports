import type { FastifyInstance } from 'fastify';
import type { ContractValidator } from '../../../shared/api/contract-validator.ts';
import type { components } from '../../../shared/api/contract.generated.ts';
import { route, bearer, command, instant } from '../../../shared/api/route-kit.ts';
import { IdentityService, type ActorView, type TokenPair } from '../application/identity-service.ts';
export function actorWire(a: ActorView): components['schemas']['CurrentActor'] {
    return { ...a, adminPermissions: a.adminPermissions.map(p => {
            if (!['COURSE_VIEW', 'SEMESTER', 'USERS_ACCOUNTS', 'FEEDBACK', 'GLOBAL_RULES', 'SYSTEM_MODE', 'HELP_CENTER', 'AUDIT_QUERY'].includes(p))
                throw new Error('UNKNOWN_PERMISSION_FACT');
            return p as components['schemas']['AdminPermission'];
        }) };
}
export function tokenWire(p: TokenPair): components['schemas']['SessionTokenPair'] { return { ...p, accessExpiresAt: instant(p.accessExpiresAt), refreshExpiresAt: instant(p.refreshExpiresAt), actor: actorWire(p.actor) }; }
export function registerIdentity(app: FastifyInstance, v: ContractValidator, service: IdentityService) {
    route(app, v, 'POST', '/auth/sessions/password', 'SessionTokenPair', 201, async (r) => tokenWire(await service.passwordLogin(v.parse('PasswordSessionRequest', r.body), command(r))));
    route(app, v, 'POST', '/auth/sessions/student', 'SessionTokenPair', 201, async (r) => tokenWire(await service.studentLogin(v.parse('StudentSessionRequest', r.body), command(r))));
    route(app, v, 'POST', '/auth/sessions/refresh', 'SessionTokenPair', 200, async (r) => tokenWire(await service.refresh(v.parse('RefreshSessionRequest', r.body).refreshToken, command(r))));
    route(app, v, 'POST', '/auth/sessions/current/logout', 'CommandAccepted', 200, r => service.logout(bearer(r), false, command(r)));
    route(app, v, 'POST', '/auth/sessions/logout-all', 'CommandAccepted', 200, r => service.logout(bearer(r), true, command(r)));
    route(app, v, 'GET', '/me', 'CurrentActor', 200, async (r) => actorWire(await service.me(bearer(r))));
    route(app, v, 'GET', '/me/account-deletion-impact', 'AccountDeletionImpact', 200, r => service.accountDeletionImpact(bearer(r)));
    route(app, v, 'POST', '/me/account-deletion', 'DeletionResult', 200, r => service.deleteAccount(bearer(r), v.parse('AccountDeletionRequest', r.body), command(r)));
    route(app, v, 'PUT', '/me/verified-email', 'CurrentActor', 200, async (r) => actorWire(await service.changeEmail(bearer(r), v.parse('VerifiedEmailChangeRequest', r.body), command(r))));
    route(app, v, 'PUT', '/me/password', 'CurrentActor', 200, async (r) => actorWire(await service.changePassword(bearer(r), v.parse('PasswordChangeRequest', r.body), command(r))));
    route(app, v, 'POST', '/auth/password/reset', 'CommandAccepted', 200, r => service.resetPassword(v.parse('PasswordResetRequest', r.body), command(r)));
    route(app, v, 'POST', '/auth/challenges', 'AuthChallenge', 202, async (r) => { const result = await service.requestChallenge(v.parse('AuthChallengeRequest', r.body), command(r)); return { ...result, expiresAt: instant(result.expiresAt) }; });
}
