import type { TransactionScope } from '../../../shared/application/transactions/transaction-runner.ts';
import { ensure } from '../../../shared/application/runtime.ts';
import type { ModeRepository } from './ports/mode-repository.ts';
import type { ModeAccess } from './public/system-mode.ts';
export class ModeService implements ModeAccess {
    private readonly repository: ModeRepository;
    constructor(repository: ModeRepository) { this.repository = repository; }
    async read(scope: TransactionScope, organizationId: string) {
        const state = await this.repository.read(scope, organizationId);
        ensure(state, 'DEPENDENCY_UNAVAILABLE', 503);
        return state;
    }
    async assertAllowed(scope: TransactionScope, organizationId: string, role: 'STUDENT' | 'TEACHER' | 'ADMIN', action: 'BUSINESS' | 'PASSWORD_CHANGE' | 'SECURITY_READ' | 'LOGOUT') {
        const state = await this.read(scope, organizationId);
        // Logout remains a revocation-only security action. Admin business is not generally reopened.
        ensure(state.mode === 'NORMAL' || action === 'LOGOUT' || (role === 'ADMIN' && action !== 'BUSINESS'), 'SYSTEM_MAINTENANCE', 503);
    }
}
