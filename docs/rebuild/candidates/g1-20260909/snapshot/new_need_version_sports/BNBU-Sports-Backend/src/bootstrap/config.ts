export interface FoundationConfig {
  database: { host: string; port: number; database: string; user: string; password: string };
  host: string; port: number;
}
function port(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) throw new Error('INVALID_PORT_CONFIGURATION');
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error('INVALID_PORT_CONFIGURATION');
  return parsed;
}
export function readConfig(env: NodeJS.ProcessEnv): FoundationConfig {
  const required = (key: string): string => {
    const value = env[key];
    if (!value || !value.trim()) throw new Error('MISSING_REQUIRED_CONFIGURATION:' + key);
    return value;
  };
  return {
    database: { host: required('PGHOST'), port: port(env.PGPORT, 5432),
      database: required('PGDATABASE'), user: required('PGUSER'), password: required('PGPASSWORD') },
    host: env.LISTEN_HOST ?? '127.0.0.1', port: port(env.PORT, 3000)
  };
}
