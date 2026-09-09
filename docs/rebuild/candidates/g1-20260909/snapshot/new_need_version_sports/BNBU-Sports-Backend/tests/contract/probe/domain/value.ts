/** Compatibility representation model only: no Auth/Course/Review business behavior. */
type Value = null | boolean | number | string | readonly Value[] | { readonly [key: string]: Value };
const variants = ['scalar', 'exemption', 'certification', 'rule-add', 'rule-update', 'rule-delete',
  'maintenance', 'normal', 'ordinary', 'swim-timely', 'swim-offline', 'review-pass',
  'review-return', 'review-invalid', 'correction-valid', 'correction-invalid'] as const;
export type Variant = typeof variants[number];
function copyValue(value: unknown): Value {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return Object.freeze(value.map(copyValue));
  if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype)
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, child]) => [key, copyValue(child)])));
  throw new Error('UNREPRESENTABLE_VALUE');
}
export class CompatibilityValue {
  readonly variant: Variant;
  readonly data: Value;
  constructor(variant: string, data: unknown) {
    if (!variants.some(v => v === variant)) throw new Error('UNKNOWN_INTERNAL_VARIANT');
    this.variant = variant as Variant;
    this.data = copyValue(data);
    Object.freeze(this);
  }
}
