import ts from 'typescript';
import { posix } from 'node:path';
export interface Source { path: string; text: string }
export const tableOwners: Readonly<Record<string, string>> = {
  'foundation_probe.certification_kind': 'applications-certification'
};
const sharedAllowlist = new Set([
  'src/shared/api/contract.generated.ts', 'src/shared/api/contract-validator.ts',
  'src/shared/application/transactions/transaction-runner.ts', 'src/shared/infrastructure/postgres.ts'
]);
const layerOf = (p: string) => p.match(/\/(api|application|domain|infrastructure|bootstrap)\//)?.[1];
const moduleOf = (p: string) => p.match(/^src\/modules\/([^/]+)\//)?.[1];
export function architectureFindings(sources: Source[]): string[] {
  const findings: string[] = [];
  const graph = new Map<string, string[]>();
  for (const source of sources) {
    const path = source.path, layer = layerOf('/' + path);
    const ownModule = moduleOf(path);
    if (path.startsWith('src/shared/') && !sharedAllowlist.has(path)) findings.push('shared-allowlist:' + path);
    const ast = ts.createSourceFile(path, source.text, ts.ScriptTarget.Latest, true);
    const imports: string[] = [];
    const visit = (node: ts.Node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier))
        imports.push(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
        findings.push('dynamic-import:' + path);
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'query') {
        const argument = node.arguments[0];
        const sql = argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) ? argument.text : undefined;
        if (ownModule && sql === undefined) findings.push('uninspectable-module-sql:' + path);
        if (sql !== undefined) {
          for (const match of sql.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+([a-z_][a-z_0-9.]*)/gi)) {
            const table = match[1]!.toLowerCase();
            if (ownModule && tableOwners[table] !== ownModule) findings.push('table-ownership:' + path + ':' + table);
          }
          if (/\b(?:BEGIN|COMMIT|ROLLBACK|SAVEPOINT)\b/i.test(sql) && path !== 'src/shared/infrastructure/postgres.ts')
            findings.push('transaction-control-owner:' + path);
        }
      }
      if (ts.isInterfaceDeclaration(node) && /Repository$/.test(node.name.text) && !path.includes('/application/ports/'))
        findings.push('port-placement:' + path);
      if (ts.isClassDeclaration(node) && node.name && /Repository$/.test(node.name.text) && !path.includes('/infrastructure/persistence/repositories/'))
        findings.push('repository-implementation-placement:' + path);
      if ((layer === 'domain' || layer === 'application') && ts.isPropertyAccessExpression(node) &&
          /^(process|console|Date|Math)$/.test(node.expression.getText(ast)))
        findings.push('inner-global-io:' + path);
      ts.forEachChild(node, visit);
    };
    visit(ast);
    for (const specifier of imports) {
      const relative = specifier.startsWith('.');
      const target = relative ? posix.normalize(posix.join(posix.dirname(path), specifier)) : specifier;
      if (relative) graph.set(path, [...(graph.get(path) ?? []), target]);
      const targetLayer = layerOf('/' + target), otherModule = moduleOf(target);
      if (ownModule && otherModule && ownModule !== otherModule) findings.push('module-isolation:' + path);
      if (path.startsWith('src/shared/') && otherModule) findings.push('shared-module-dependency:' + path);
      if (layer !== 'bootstrap' && targetLayer === 'bootstrap') findings.push('bootstrap-inversion:' + path);
      const forbidden: Record<string, string[]> = {
        domain: ['api', 'application', 'infrastructure', 'bootstrap'],
        application: ['api', 'infrastructure', 'bootstrap'], api: ['domain', 'infrastructure', 'bootstrap'],
        infrastructure: ['api', 'bootstrap']
      };
      if (targetLayer && (forbidden[layer ?? ''] ?? []).includes(targetLayer)) findings.push('layer-direction:' + path);
      if ((layer === 'domain' || layer === 'application') && !relative) findings.push('inner-framework:' + path);
      if (target.includes('contract.generated') && layer !== 'api') findings.push('dto-leak:' + path);
      if ((specifier === 'pg' || /prisma|typeorm|sequelize/.test(specifier)) && layer !== 'infrastructure')
        findings.push('database-type-leak:' + path);
      if (target.includes('/tests/')) findings.push('test-code-in-production:' + path);
    }
    if (path.includes('/application/') && /\b(?:Pool|PoolClient|QueryResult|QueryResultRow)\b/.test(source.text))
      findings.push('row-in-application:' + path);
    if (path.includes('/domain/') && /@(?:Entity|Column|Serializable)|JSON\.(parse|stringify)/.test(source.text))
      findings.push('domain-serialization:' + path);
    if (layer !== 'infrastructure' && layer !== 'bootstrap' && /\.(?:query|connect|commit|rollback)\(/.test(source.text))
      findings.push('database-io-location:' + path);
  }
  const visited = new Set<string>(), active = new Set<string>();
  const walk = (path: string) => {
    if (active.has(path)) { findings.push('import-cycle:' + path); return; }
    if (visited.has(path)) return;
    active.add(path);
    for (const next of graph.get(path) ?? []) walk(next);
    active.delete(path); visited.add(path);
  };
  for (const path of graph.keys()) walk(path);
  return findings;
}
