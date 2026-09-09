import { CompatibilityValue } from '../domain/value.ts';
export type CommandVariant = 'scalar' | 'exemption' | 'certification' | 'rule-add' | 'rule-update' |
  'rule-delete' | 'maintenance' | 'normal' | 'ordinary' | 'swim-timely' | 'swim-offline' |
  'review-pass' | 'review-return' | 'review-invalid' | 'correction-valid' | 'correction-invalid';
export interface ProbeCommand { variant: CommandVariant; data: unknown }
export interface ProbeResult { variant: CommandVariant; data: unknown }
export function executeRepresentationProbe(command: ProbeCommand): ProbeResult {
  const value = new CompatibilityValue(command.variant, command.data);
  return { variant: value.variant, data: structuredClone(value.data) };
}
