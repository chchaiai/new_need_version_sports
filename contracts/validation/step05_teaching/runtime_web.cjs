"use strict";
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const [inputPath, depsPath, outputPath] = process.argv.slice(2);
const deps=createRequire(path.join(path.resolve(depsPath),'package.json'));
const Ajv=deps('ajv/dist/2020').default;
const input=JSON.parse(fs.readFileSync(inputPath,'utf8'));
function translate(value) {
  if (typeof value==='string' && value.startsWith('#/components/schemas/')) return value.replace('#/components/schemas/','#/$defs/');
  if (Array.isArray(value)) return value.map(translate);
  if (value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,translate(v)]));
  return value;
}
// OAS annotations are inert; JSON Schema constraints stay active. No coercion/default insertion/field removal.
const ajv=new Ajv({strict:true,strictTypes:false,allErrors:true,coerceTypes:false,useDefaults:false,removeAdditional:false});
deps('ajv-formats')(ajv,{mode:'full'});
for (const keyword of ['discriminator','example','xml','externalDocs']) ajv.addKeyword({keyword});
const id='urn:bnbu:step05:'+input.candidateSha256;
ajv.addSchema({$id:id,$schema:'https://json-schema.org/draft/2020-12/schema',$defs:translate(input.spec.components.schemas)});
const validators={};
const results=[];
let roundtrips=0;
for (const row of input.cases) {
  const validate=validators[row.schema] ||= ajv.compile({$ref:id+'#/$defs/'+row.schema});
  const payload=structuredClone(row.payload);
  const valid=validate(payload);
  assert.deepEqual(payload,row.payload,'Validator mutated input '+row.name);
  results.push({name:row.name,passed:valid===row.expectedValid,actualValid:valid,expectedValid:row.expectedValid});
  if(valid) {assert.deepEqual(JSON.parse(JSON.stringify(payload)),row.payload);roundtrips++;}
}
const result={candidateSha256:input.candidateSha256,caseCount:results.length,passed:results.filter(r=>r.passed).length,roundtrips,results};
fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({caseCount:result.caseCount,passed:result.passed,roundtrips}));
assert.equal(result.passed,result.caseCount);
