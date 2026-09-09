import { expect, test } from 'vitest';
import { publicationPlan, type PlanCatalog } from '../../../src/modules/course-enrollment/domain/publication-plan.ts';
import { validateRule, type Rule } from '../../../src/modules/course-enrollment/domain/course.ts';
const start = Date.parse('2026-10-01T00:00:00Z');
function fixture(count: number) {
    const dates = Array.from({ length: count }, (_, i) => start + Math.floor(i / 3) * 7 * 86400000 + (i % 3) * 86400000);
    const rule: Rule = { templateVersionId: 'template', courseRelatedTargetMinutes: 610, otherTargetMinutes: 590, thresholdMinutes: 30, weeklyCountLimit: 3, allowedIntervals: dates.map(t => ({ startsAt: t, endsAtExclusive: t + 3600000 })), regularCutoffAt: start + 100 * 86400000, plannedSettlementAt: start + 107 * 86400000 };
    const catalog: PlanCatalog = { version: 'synthetic-calendar-v1', complete: true, slots: dates.flatMap((t, i) => ['COURSE_RELATED', 'OTHER'].map(category => ({ id: i + '/' + category, category: category as 'COURSE_RELATED' | 'OTHER', startsAt: t, endsAtExclusive: t + 3600000 }))) };
    return { rule, catalog };
}
test('610/590 cannot use only twenty dates despite total capacity 1200', () => { const { rule, catalog } = fixture(20); expect(publicationPlan(rule, catalog, start - 1).result).toBe('INFEASIBLE'); });
test('twenty-one dates produce a complete non-overlapping two-category witness', () => { const { rule, catalog } = fixture(21), p = publicationPlan(rule, catalog, start - 1); expect(p.result).toBe('FEASIBLE'); expect(p.witness).toHaveLength(21); expect(new Set(p.witness.map(i => i.startsAt)).size).toBe(21); });
test('partial catalog and exhausted search never report infeasibility', () => { const { rule, catalog } = fixture(20); expect(publicationPlan(rule, { ...catalog, complete: false }, start - 1).result).toBe('UNAVAILABLE'); expect(publicationPlan(rule, catalog, start - 1, 1).result).toBe('UNAVAILABLE'); });
test('invalid or duplicated Owner slots fail closed', () => { const { rule, catalog } = fixture(21); expect(publicationPlan(rule, { ...catalog, slots: [...catalog.slots, catalog.slots[0]!] }, start - 1).result).toBe('UNAVAILABLE'); expect(publicationPlan(rule, { ...catalog, slots: catalog.slots.map(s => ({ ...s, endsAtExclusive: s.startsAt + 29 * 60000 })) }, start - 1).result).toBe('UNAVAILABLE'); });
test('weekly limit and overlapping cross-midnight slots are enforced', () => { const { rule, catalog } = fixture(21); expect(publicationPlan({ ...rule, weeklyCountLimit: 2 }, catalog, start - 1).result).toBe('INFEASIBLE'); });
test('course draft rejects invalid totals, dates and closeout duration', () => { const { rule } = fixture(21); expect(() => validateRule({ ...rule, otherTargetMinutes: 591 }, start - 1, start + 200 * 86400000)).toThrow('COURSE_TARGET_TOTAL_INVALID'); expect(() => validateRule({ ...rule, plannedSettlementAt: rule.regularCutoffAt }, start - 1, start + 200 * 86400000)).toThrow('VALIDATION_FAILED'); });
