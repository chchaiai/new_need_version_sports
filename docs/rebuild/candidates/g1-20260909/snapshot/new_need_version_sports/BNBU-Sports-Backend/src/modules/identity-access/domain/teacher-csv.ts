import { ensure } from '../../../shared/domain/failure.ts';
export interface TeacherInput {
    employeeId: string;
    name: string;
    email: string;
    college: string | null;
}
export interface TeacherValidationRow {
    rowNumber: number;
    employeeId: string | null;
    name: string | null;
    email: string | null;
    college: string | null;
    errors: string[];
}
export function parseTeachers(text: string, domains: readonly string[]): TeacherValidationRow[] {
    ensure(!text.includes('\uFFFD'), 'VALIDATION_FAILED', 422);
    text = text.replace(/^\uFEFF/, '');
    const records: {
        line: number;
        cells: string[];
    }[] = [], cells: string[] = [];
    let field = '', quoted = false, closed = false, line = 1, start = 1;
    const pushField = () => { cells.push(field); field = ''; closed = false; };
    const pushRow = () => { pushField(); if (cells.length > 1 || cells.some(c => c.length))
        records.push({ line: start, cells: [...cells] }); cells.length = 0; start = line + 1; };
    for (let i = 0; i < text.length; i++) {
        const c = text[i]!;
        if (quoted) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                }
                else {
                    quoted = false;
                    closed = true;
                }
            }
            else {
                field += c;
                if (c === '\n')
                    line++;
            }
            continue;
        }
        if (c === '"') {
            ensure(field.length === 0 && !closed, 'VALIDATION_FAILED', 422);
            quoted = true;
            continue;
        }
        if (c === ',') {
            pushField();
            continue;
        }
        if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n')
                i++;
            pushRow();
            line++;
            continue;
        }
        ensure(!closed, 'VALIDATION_FAILED', 422);
        field += c;
    }
    ensure(!quoted, 'VALIDATION_FAILED', 422);
    if (field.length || closed || cells.length)
        pushRow();
    const header = records.shift()?.cells.map(c => c.trim());
    ensure(header && new Set(header).size === header.length && ['employee_id', 'name', 'email'].every(h => header.includes(h)) && header.every(h => ['employee_id', 'name', 'email', 'college'].includes(h)), 'VALIDATION_FAILED', 422);
    const emails = new Map<string, TeacherValidationRow[]>(), employees = new Map<string, TeacherValidationRow[]>();
    const result = records.map(r => {
        const get = (key: string) => r.cells[header.indexOf(key)]?.trim() || null;
        const employeeId = get('employee_id'), name = get('name'), raw = get('email')?.toLowerCase() ?? null, college = get('college'), errors: string[] = [];
        if (r.cells.length !== header.length)
            errors.push('COLUMN_COUNT');
        if (!employeeId)
            errors.push('EMPLOYEE_ID_REQUIRED');
        if (!name)
            errors.push('NAME_REQUIRED');
        const validEmail = raw !== null && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) && domains.includes(raw.split('@')[1]!);
        if (!validEmail)
            errors.push('INVALID_SCHOOL_EMAIL');
        const row = { rowNumber: r.line, employeeId, name, email: validEmail ? raw : null, college, errors };
        if (raw)
            emails.set(raw, [...(emails.get(raw) ?? []), row]);
        if (employeeId)
            employees.set(employeeId, [...(employees.get(employeeId) ?? []), row]);
        return row;
    });
    for (const [index, code] of [[emails, 'DUPLICATE_EMAIL'], [employees, 'DUPLICATE_EMPLOYEE_ID']] as const)
        for (const rows of index.values())
            if (rows.length > 1)
                for (const row of rows)
                    row.errors.push(code);
    return result;
}
