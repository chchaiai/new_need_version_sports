import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lockMaterialDeclarations} from '../domain/material-declarations.ts';
const a={assetId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',position:2,phase:null,checksumSha256:'AB'.repeat(32)};
const b={...a,assetId:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',position:6};
test('declarations normalize case and order without changing Contract positions',()=>{
  const result=lockMaterialDeclarations([b,{...a,assetId:a.assetId.toUpperCase()}]);
  assert.deepEqual(result.map(x=>x.position),[2,6]);assert.equal(result[0]?.checksumSha256,'ab'.repeat(32));
  assert.ok(Object.isFrozen(result));assert.ok(Object.isFrozen(result[0]));
});
test('declarations reject duplicate asset identities, positions and malformed checksums',()=>{
  for(const pair of [[a,{...b,assetId:a.assetId.toUpperCase()}],[a,{...b,position:2}],[a,{...b,checksumSha256:'bad'}]]){
    assert.throws(()=>lockMaterialDeclarations(pair),/MATERIAL_BATCH_CONFLICT/);
  }
});
test('declarations reject invalid ranges and phase without treating labels as proof',()=>{
  for(const position of [-1,7,0.5])assert.throws(()=>lockMaterialDeclarations([{...a,position}]),/MATERIAL_BATCH_CONFLICT/);
  assert.throws(()=>lockMaterialDeclarations([]),/MATERIAL_BATCH_CONFLICT/);
  assert.equal(lockMaterialDeclarations([{...a,phase:'BEFORE'}])[0]?.phase,'BEFORE');
});
