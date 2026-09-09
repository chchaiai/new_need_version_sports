/** Opaque scope: the driver and database rows never cross this boundary. */
export interface TransactionScope { readonly scope: 'foundation-transaction' }
export interface TransactionRunner {
  run<T>(work: (scope: TransactionScope) => Promise<T>): Promise<T>;
}
/** Stable Port failure; driver details stay in Infrastructure. */
export class TransactionUnavailableError extends Error {
  constructor() { super('TRANSACTION_UNAVAILABLE'); this.name = 'TransactionUnavailableError'; }
}
