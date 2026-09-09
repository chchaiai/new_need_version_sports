import type { Rule } from './course.ts';
export interface PlanSlot {
    id: string;
    category: 'COURSE_RELATED' | 'OTHER';
    startsAt: number;
    endsAtExclusive: number;
}
export interface PlanCatalog {
    version: string;
    complete: boolean;
    slots: PlanSlot[];
}
export interface PlanResult {
    result: 'FEASIBLE' | 'INFEASIBLE' | 'UNAVAILABLE';
    proofKind: 'LEGAL_COMPLETE_WITNESS' | 'EXACT_EXHAUSTIVE_PROOF' | 'NONE';
    witness: PlanSlot[];
}
const day = (instant: number) => Math.floor((instant + 8 * 3600000) / 86400000);
const week = (d: number) => d - ((d + 3) % 7 + 7) % 7;
/** Exact finite Owner catalog search. Never infer infeasibility from truncated inputs or exhausted budget. */
export function publicationPlan(rule: Rule, catalog: PlanCatalog, now: number, budget = 250000): PlanResult {
    const unavailable: PlanResult = { result: 'UNAVAILABLE', proofKind: 'NONE', witness: [] };
    if (!catalog.version || !Number.isSafeInteger(budget) || budget < 1)
        return unavailable;
    const ids = new Set<string>(), dates = new Map<number, PlanSlot[]>();
    for (const slot of catalog.slots) {
        const minutes = Math.floor((slot.endsAtExclusive - slot.startsAt) / 60000);
        if (ids.has(slot.id) || !slot.id || !['COURSE_RELATED', 'OTHER'].includes(slot.category) || !Number.isFinite(slot.startsAt) || !Number.isFinite(slot.endsAtExclusive) || minutes < rule.thresholdMinutes || slot.startsAt < now || !rule.allowedIntervals.some(i => i.startsAt <= slot.startsAt && slot.endsAtExclusive <= i.endsAtExclusive))
            return unavailable;
        ids.add(slot.id);
        const d = day(slot.startsAt);
        dates.set(d, [...(dates.get(d) ?? []), slot]);
    }
    type State = {
        x: number;
        y: number;
        k: number;
        end: number;
        witness: PlanSlot[];
    };
    let states = new Map<string, State>([['0/0/0', { x: 0, y: 0, k: 0, end: -Infinity, witness: [] }]]), lastWeek: number | undefined, work = 0;
    for (const [d, slots] of [...dates.entries()].sort(([a], [b]) => a - b)) {
        if (lastWeek !== week(d)) {
            const reset = new Map<string, State>();
            for (const s of states.values()) {
                const key = s.x + '/' + s.y + '/0';
                if (!reset.has(key) || reset.get(key)!.end > s.end)
                    reset.set(key, { ...s, k: 0 });
            }
            states = reset;
            lastWeek = week(d);
        }
        const next = new Map(states);
        for (const s of states.values())
            for (const slot of slots) {
                if (++work > budget)
                    return unavailable;
                if (s.k >= rule.weeklyCountLimit || slot.startsAt < s.end)
                    continue;
                const q = Math.min(60, Math.floor((slot.endsAtExclusive - slot.startsAt) / 60000));
                const x = Math.min(rule.courseRelatedTargetMinutes, s.x + (slot.category === 'COURSE_RELATED' ? q : 0));
                const y = Math.min(rule.otherTargetMinutes, s.y + (slot.category === 'OTHER' ? q : 0));
                if (x === s.x && y === s.y)
                    continue;
                const value = { x, y, k: s.k + 1, end: slot.endsAtExclusive, witness: [...s.witness, slot] };
                if (x === rule.courseRelatedTargetMinutes && y === rule.otherTargetMinutes)
                    return { result: 'FEASIBLE', proofKind: 'LEGAL_COMPLETE_WITNESS', witness: value.witness };
                const key = x + '/' + y + '/' + value.k;
                if (!next.has(key) || next.get(key)!.end > value.end)
                    next.set(key, value);
            }
        states = next;
    }
    return catalog.complete ? { result: 'INFEASIBLE', proofKind: 'EXACT_EXHAUSTIVE_PROOF', witness: [] } : unavailable;
}
