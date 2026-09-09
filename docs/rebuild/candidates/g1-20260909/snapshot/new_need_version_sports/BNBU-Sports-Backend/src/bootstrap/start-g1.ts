import { startG1Runtime } from './g1-runtime.ts';

try {
    const runtime = await startG1Runtime(process.env);
    for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
        void runtime.close().catch(() => { process.stderr.write('G1_SHUTDOWN_FAILED\n'); process.exitCode = 1; });
    });
    process.stdout.write(JSON.stringify({ event: 'G1_LISTENING', address: runtime.address, profile: 'development-local-mail' }) + '\n');
} catch {
    // Configuration, credentials, SQL and provider payloads must not appear in process logs.
    process.stderr.write('G1_START_FAILED\n');
    process.exitCode = 1;
}
