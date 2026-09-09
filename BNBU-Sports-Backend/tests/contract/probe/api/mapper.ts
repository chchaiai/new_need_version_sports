import type { ContractValidator, SchemaName } from '../../../../src/shared/api/contract-validator.ts';
import type { components } from '../../../../src/shared/api/contract.generated.ts';
import type { ProbeCommand, ProbeResult, CommandVariant } from '../application/execute.ts';
function impossible(value: never): never { throw new Error('UNMAPPED_WIRE_VARIANT:' + value); }
function variant(validator: ContractValidator, schema: SchemaName, input: unknown): CommandVariant {
  switch (schema) {
    case 'CreateStudentApplicationRequest': {
      const dto: components['schemas']['CreateStudentApplicationRequest'] = validator.parse(schema, input);
      switch (dto.applicationType) { case 'EXEMPTION': return 'exemption'; case 'CERTIFICATION': return 'certification'; default: return impossible(dto); }
    }
    case 'ReviseEnduranceRuleTableRequest': {
      const dto = validator.parse(schema, input);
      switch (dto.change.action) { case 'ADD': return 'rule-add'; case 'UPDATE': return 'rule-update'; case 'DELETE': return 'rule-delete'; default: return impossible(dto.change); }
    }
    case 'SwitchSystemModeRequest': {
      const dto = validator.parse(schema, input);
      switch (dto.targetMode) { case 'NORMAL': return 'normal'; case 'MAINTENANCE': return 'maintenance'; default: return impossible(dto); }
    }
    case 'SubmitExerciseRecordRequest': {
      const dto = validator.parse(schema, input);
      switch (dto.submissionRoute) { case 'ORDINARY': return 'ordinary'; case 'SWIMMING_TIMELY': return 'swim-timely'; case 'SWIMMING_OFFLINE': return 'swim-offline'; default: return impossible(dto); }
    }
    case 'AppendRecordReviewRequest': {
      const dto = validator.parse(schema, input);
      switch (dto.action) { case 'PASS': return 'review-pass'; case 'RETURN_SUPPLEMENT': return 'review-return'; case 'INVALID': return 'review-invalid'; default: return impossible(dto); }
    }
    case 'CorrectExerciseRecordReviewRequest': {
      const dto = validator.parse(schema, input);
      switch (dto.result) { case 'VALID': return 'correction-valid'; case 'INVALID': return 'correction-invalid'; default: return impossible(dto); }
    }
    default: return 'scalar';
  }
}
const wireVariants: Record<Exclude<CommandVariant, 'scalar'>, readonly [string, string]> = {
  exemption: ['applicationType', 'EXEMPTION'], certification: ['applicationType', 'CERTIFICATION'],
  'rule-add': ['change.action', 'ADD'], 'rule-update': ['change.action', 'UPDATE'], 'rule-delete': ['change.action', 'DELETE'],
  normal: ['targetMode', 'NORMAL'], maintenance: ['targetMode', 'MAINTENANCE'],
  ordinary: ['submissionRoute', 'ORDINARY'], 'swim-timely': ['submissionRoute', 'SWIMMING_TIMELY'], 'swim-offline': ['submissionRoute', 'SWIMMING_OFFLINE'],
  'review-pass': ['action', 'PASS'], 'review-return': ['action', 'RETURN_SUPPLEMENT'], 'review-invalid': ['action', 'INVALID'],
  'correction-valid': ['result', 'VALID'], 'correction-invalid': ['result', 'INVALID']
};
export function toProbeCommand(validator: ContractValidator, schema: SchemaName, input: unknown): ProbeCommand {
  const parsed = validator.parse(schema, input);
  const tag = variant(validator, schema, parsed);
  const data: unknown = structuredClone(parsed);
  if (tag !== 'scalar') {
    const [key] = wireVariants[tag];
    const object = data as Record<string, unknown>;
    if (key === 'change.action') delete (object.change as Record<string, unknown>).action;
    else delete object[key];
  }
  return { variant: tag, data };
}
export function fromProbeResult(result: ProbeResult): unknown {
  const data: unknown = structuredClone(result.data);
  if (result.variant !== 'scalar') {
    const [key, value] = wireVariants[result.variant];
    const object = data as Record<string, unknown>;
    if (key === 'change.action') (object.change as Record<string, unknown>).action = value;
    else object[key] = value;
  }
  return data;
}
