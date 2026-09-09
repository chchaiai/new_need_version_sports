/** Pure accounting of confirmed exclusions. This does not decide which business window
 * is eligible, authorize a correction, reopen a terminal record or infer an incident.
 * The caller must supply a versioned, complete authoritative timeline through observedAtUs.
 */
export interface ConfirmedExclusion {startsAtUs:bigint;endsAtUs:bigint|null}
export class ExcludedTimeFailure extends Error {
  readonly code='TIMELINE_UNAVAILABLE';
  constructor(){super('TIMELINE_UNAVAILABLE');this.name='ExcludedTimeFailure';}
}
export function excludedTime(input:{startsAtUs:bigint;observedAtUs:bigint;coverageStartsAtUs:bigint;coverageThroughUs:bigint;
  revision:number;intervals:readonly ConfirmedExclusion[]}) {
  const instants=[input.startsAtUs,input.observedAtUs,input.coverageStartsAtUs,input.coverageThroughUs];
  if(instants.some(n=>typeof n!=='bigint'||n<0n)||input.observedAtUs<input.startsAtUs||
    input.coverageStartsAtUs>input.startsAtUs||input.coverageThroughUs<input.observedAtUs||
    !Number.isSafeInteger(input.revision)||input.revision<0)throw new ExcludedTimeFailure();
  const clipped: {startsAtUs:bigint;endsAtUs:bigint}[]=[];
  let paused=false;
  for(const interval of input.intervals){
    if(typeof interval.startsAtUs!=='bigint'||interval.startsAtUs<0n||
      (interval.endsAtUs!==null&&(typeof interval.endsAtUs!=='bigint'||interval.endsAtUs<=interval.startsAtUs)))throw new ExcludedTimeFailure();
    // Known future scheduled ends are not actual restoration facts.
    if(interval.startsAtUs>input.observedAtUs||(interval.endsAtUs!==null&&interval.endsAtUs>input.observedAtUs))throw new ExcludedTimeFailure();
    if(interval.endsAtUs===null)paused=true;
    const from=interval.startsAtUs<input.startsAtUs?input.startsAtUs:interval.startsAtUs;
    const to=interval.endsAtUs??input.observedAtUs;
    if(to>from)clipped.push({startsAtUs:from,endsAtUs:to});
  }
  clipped.sort((a,b)=>a.startsAtUs<b.startsAtUs?-1:a.startsAtUs>b.startsAtUs?1:0);
  const union:{startsAtUs:bigint;endsAtUs:bigint}[]=[];
  for(const interval of clipped){
    const last=union.at(-1);
    if(last&&interval.startsAtUs<=last.endsAtUs){if(interval.endsAtUs>last.endsAtUs)last.endsAtUs=interval.endsAtUs;}
    else union.push({...interval});
  }
  const excludedUs=union.reduce((total,interval)=>total+interval.endsAtUs-interval.startsAtUs,0n);
  return Object.freeze({revision:input.revision,observedAtUs:input.observedAtUs,excludedUs,
    countedUs:input.observedAtUs-input.startsAtUs-excludedUs,paused,
    intervals:Object.freeze(union.map(interval=>Object.freeze(interval)))});
}
