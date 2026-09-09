export class Failure extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, status: number) { super(code); this.name = 'Failure'; this.code = code; this.status = status; }
}
export function ensure(condition: unknown, code: string, status = 409): asserts condition {
    if (!condition)
        throw new Failure(code, status);
}
