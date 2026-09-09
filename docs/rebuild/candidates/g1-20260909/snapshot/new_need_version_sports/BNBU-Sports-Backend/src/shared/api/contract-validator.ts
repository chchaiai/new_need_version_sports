import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { components } from './contract.generated.ts';
export type SchemaName = keyof components['schemas'];
export class ContractInputError extends Error {
  constructor() { super('CONTRACT_INPUT_REJECTED'); this.name = 'ContractInputError'; }
}
export function createContractValidator(componentsDocument: object) {
  const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: true,
    coerceTypes: false, useDefaults: false, removeAdditional: false, ownProperties: true, $data: false });
  // ajv-formats 3.0.1 exposes its CommonJS plugin through .default under NodeNext.
  addFormats.default(ajv, { mode: 'full' });
  const id = 'urn:bnbu:backend:contract:1.3.0';
  ajv.addSchema({ $id: id, components: componentsDocument });
  return {
    accepts(schema: SchemaName, value: unknown): boolean {
      const validate = ajv.getSchema(id + '#/components/schemas/' + schema);
      if (!validate) throw new Error('UNKNOWN_CONTRACT_SCHEMA');
      return validate(value) === true;
    },
    parse<S extends SchemaName>(schema: S, value: unknown): components['schemas'][S] {
      if (!this.accepts(schema, value)) throw new ContractInputError();
      return value as components['schemas'][S];
    }
  };
}
export type ContractValidator = ReturnType<typeof createContractValidator>;
