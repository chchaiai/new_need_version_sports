import {test} from 'node:test';
import assert from 'node:assert/strict';
import {excludedTime,ExcludedTimeFailure} from '../domain/excluded-time.ts';
const base={startsAtUs:100n,observedAtUs:1000n,coverageStartsAtUs:0n,coverageThroughUs:1000n,revision:2,intervals:[]};
test('confirmed timeline excludes only overlap, including pre-window start',()=>{
  const r=excludedTime({...base,intervals:[{startsAtUs:0n,endsAtUs:200n},{startsAtUs:800n,endsAtUs:900n}]});
  assert.equal(r.excludedUs,200n);assert.equal(r.countedUs,700n);assert.equal(r.paused,false);
});
test('maintenance and incident overlap, duplicates and touching endpoints are unioned once',()=>{
  const r=excludedTime({...base,intervals:[{startsAtUs:400n,endsAtUs:600n},{startsAtUs:200n,endsAtUs:500n},
    {startsAtUs:600n,endsAtUs:700n},{startsAtUs:200n,endsAtUs:500n}]});
  assert.equal(r.excludedUs,500n);assert.equal(r.countedUs,400n);assert.equal(r.intervals.length,1);
});
test('open pause uses observed server time, never a predicted restoration',()=>{
  const r=excludedTime({...base,intervals:[{startsAtUs:800n,endsAtUs:null}]});
  assert.equal(r.paused,true);assert.equal(r.countedUs,700n);assert.equal(r.excludedUs,200n);
  assert.throws(()=>excludedTime({...base,intervals:[{startsAtUs:800n,endsAtUs:1200n}]}),ExcludedTimeFailure);
});
test('missing coverage and unknown revision fail closed',()=>{
  for(const delta of [{coverageStartsAtUs:101n},{coverageThroughUs:999n},{revision:-1},{revision:1.5}])assert.throws(()=>excludedTime({...base,...delta}),ExcludedTimeFailure);
});
test('invalid or future intervals are not silently discarded',()=>{
  for(const interval of [{startsAtUs:200n,endsAtUs:200n},{startsAtUs:200n,endsAtUs:199n},{startsAtUs:-1n,endsAtUs:0n},{startsAtUs:1001n,endsAtUs:null}])
    assert.throws(()=>excludedTime({...base,intervals:[interval]}),ExcludedTimeFailure);
});
test('exact microseconds and immutable input/output survive accounting',()=>{
  const intervals=Object.freeze([Object.freeze({startsAtUs:101n,endsAtUs:102n})]);
  const r=excludedTime({...base,intervals});assert.equal(r.excludedUs,1n);assert.equal(r.countedUs,899n);
  assert.equal(Object.isFrozen(r),true);assert.equal(Object.isFrozen(r.intervals[0]),true);assert.equal(r.revision,2);
});
test('zero elapsed time and pause starting at observation retain strict boundaries',()=>{
  const r=excludedTime({...base,observedAtUs:100n,intervals:[{startsAtUs:100n,endsAtUs:null}]});
  assert.equal(r.countedUs,0n);assert.equal(r.excludedUs,0n);assert.equal(r.paused,true);
});
