"""Finite independent oracles and source/publication predicate models.

Provider authentication, identity proof, calendar completeness and transactional locks
are trusted inputs here. These tests do not prove the future Backend implements them.
"""
from collections import Counter
from copy import deepcopy
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from itertools import combinations
import random
from accepted_selection_reference import select_credit, eligible_minutes, business_week


def exhaustive(rows, targets, cert, threshold, weekly, previous=()):
    """Enumerate all subsets independently of the accepted DP's transitions."""
    ordered=sorted(rows,key=lambda r:(r['started_at'],r['id']))
    feasible=[]
    for size in range(len(ordered)+1):
        for ids in combinations(range(len(ordered)),size):
            subset=[ordered[i] for i in ids]
            if len({r['day'] for r in subset})!=len(subset):continue
            if any(n>weekly for n in Counter(business_week(r['day']) for r in subset).values()):continue
            completed=[min(t,c) for t,c in zip(targets,cert)];amount={r['id']:0 for r in rows}
            for r in subset:
                m=int(r['active_seconds']//60);q=0 if m<threshold else min(m,60)
                amount[r['id']]=min(q,targets[r['category']]-completed[r['category']])
                completed[r['category']]+=amount[r['id']]
            if any(amount[r['id']]<=0 for r in subset):continue
            chosen=tuple(r['id'] for r in subset)
            membership=tuple(i in ids for i in range(len(ordered)))
            feasible.append((sum(completed),membership,chosen,tuple(completed),amount))
    best=max(feasible,key=lambda v:(v[0],v[1]));old=set(previous)
    if len(old)==len(previous):
        match=next((v for v in feasible if set(v[2])==old and v[0]==best[0]),None)
        if match is not None:best=match
    return {'selected_ids':best[2],'certification_counted':tuple(min(t,c) for t,c in zip(targets,cert)),
            'category_totals':best[3],'total':best[0],'record_actual':best[4]}


def run(policy):
    results=[]
    def check(name,actual,expected=True):results.append({'name':name,'passed':actual==expected})
    def row(i,day=0,seconds=3600,category=0,hour=10):
        return {'id':str(i),'day':date(2026,9,7)+timedelta(days=day),'started_at':datetime(2026,9,7,hour,tzinfo=timezone.utc)+timedelta(days=day),'active_seconds':seconds,'category':category}
    for h in policy['rule']['thresholdMinutes']:
        for seconds,expected in [(h*60-1,0),(h*60,h),(h*60+59,h),(5400,60)]:check(f'floor/{h}/{seconds}',eligible_minutes(seconds,h),expected)
    check('active-sum-before-floor',eligible_minutes(Decimal('899.9')+Decimal('899.9')+Decimal('0.2'),30),30)
    check('under-threshold-subsecond',eligible_minutes(Decimal('1799.999999999'),30),0)
    check('same-day-max-not-first',select_credit([row(1,seconds=1800),row(2,hour=12)],(600,600),(0,0),30,3)['record_actual'],{'1':0,'2':60})
    joint=[row(1,0,3600,0),row(2,0,3540,1,12),row(3,1,3600,0)]
    check('joint-not-daily-longest',select_credit(joint,(600,600),(540,540),30,2)['total'],1199)
    check('joint-selected-set',select_credit(joint,(600,600),(540,540),30,2)['selected_ids'],('2','3'))
    weekly=[row(i,i,s) for i,s in enumerate([1800,2700,3600,3600])]
    for k,expected in [(2,120),(3,165),(4,195)]:check('weekly/'+str(k),select_credit(weekly,(600,600),(0,0),30,k)['total'],expected)
    check('full-target-valid-zero-count',select_credit([row(1,seconds=5400)],(600,600),(600,600),30,3)['record_actual'],{'1':0})
    tie=[row(1,0,3600),row(2,1,1800)]
    check('retain-whole-previous-optimal',select_credit(tie,(600,600),(570,600),30,3,['2'])['selected_ids'],('2',))
    check('fallback-earliest-when-no-prior',select_credit(tie,(600,600),(570,600),30,3)['selected_ids'],('1',))
    check('certification-first-partial',select_credit([row(1)],(600,600),(570,500),30,3)['record_actual'],{'1':30})
    check('zero-category-target',select_credit([row(1)],(0,1200),(0,0),30,3)['total'],0)
    rows=[row(i,i) for i in range(3)]
    after=select_credit(rows,(600,600),(570,500),30,3);before=select_credit(rows,(600,600),(0,500),30,3)
    check('certification-revocation-recompute-not-subtract',after['total']-before['total'],420)
    # Independent subset oracle checks full identity and per-record amounts, not only total.
    rng=random.Random(5042026)
    for i in range(80):
        n=rng.randrange(0,9);r=[row(j,rng.randrange(12),rng.choice([1799,1800,2700,3600,5400]),rng.randrange(2),j+7) for j in range(n)]
        target=rng.choice([(600,600),(0,1200),(610,590)]);cert=tuple(rng.randrange(0,1250) for _ in range(2));h=rng.choice([30,45,60]);k=rng.choice([2,3,4])
        expected=exhaustive(r,target,cert,h,k);actual=select_credit(r,target,cert,h,k)
        check(f'oracle/{i}',actual,expected)
        check(f'prior-checkpoint/{i}',select_credit(r,target,cert,h,k,actual['selected_ids']),exhaustive(r,target,cert,h,k,actual['selected_ids']))
        perm=deepcopy(r);rng.shuffle(perm);check(f'reordering/{i}',select_credit(perm,target,cert,h,k,actual['selected_ids']),actual)
        if r:
            smaller=select_credit(r[:-1],target,cert,h,k);check(f'candidate-add-monotonic/{i}',actual['total']>=smaller['total'])
    # Independent counting-column identities, including pending and formula loss.
    facts=[('VALID',90,60,30),('INVALID',90,60,0),(None,45,45,0),('VALID',29,0,0)]
    invalid=sum(m for result,m,q,a in facts if result=='INVALID');unselected=sum(q-a for result,m,q,a in facts if result=='VALID');excluded=sum(m-q for result,m,q,a in facts if result=='VALID')
    check('invalid-column-actual-not-q',invalid,90);check('valid-uncounted-only-q-minus-a',unselected,30);check('formula-exclusion-separate',excluded,59)
    check('valid-minute-reconciliation',sum(m for result,m,q,a in facts if result=='VALID'),sum(a for result,m,q,a in facts if result=='VALID')+unselected+excluded)
    check('1199-rounded100-not-target',(round(100*1199/1200),1199==1200),(100,False))
    # Absolute Shanghai start day survives crossing midnight and supplementary acceptance.
    local=datetime.fromisoformat('2026-09-06T15:45:00+00:00').astimezone(timezone(timedelta(hours=8)))
    check('original-sunday-week',business_week(local.date()),date(2026,8,31))
    # Necessary feasibility bounds are not sufficient: two categories need separate days.
    check('20days600600',sum((t+59)//60 for t in [600,600])<=20)
    check('20days610590',sum((t+59)//60 for t in [610,590])<=20,False)
    check('21days610590',sum((t+59)//60 for t in [610,590])<=21)
    # Time comparisons use arbitrary precision server instants, never client/HTTP timestamps.
    expiry=Decimal('1000');grace=policy['invitation']['graceSeconds'];eps=Decimal('0.000000001')
    def eligible(registered,accepted,terminated=False,identity=True,unique=True):
        return identity and unique and not terminated and registered<expiry and accepted<expiry+grace
    for name,registered,accepted,terminated,expected in [
        ('last-nanosecond',expiry-eps,expiry+grace-eps,False,True),('equal-registration',expiry,expiry+1,False,False),
        ('late-registration',expiry+eps,expiry+1,False,False),('equal-grace',expiry-1,expiry+grace,False,False),
        ('late-grace',expiry-1,expiry+grace+eps,False,False),('natural-expiry-old-flow',expiry-1,expiry,False,True),
        ('revoke-within-grace',expiry-1,expiry+1,True,False)]:check('invitation/'+name,eligible(registered,accepted,terminated),expected)
    check('invitation-no-identity-bypass',eligible(expiry-1,expiry+1,identity=False),False)
    check('invitation-no-unique-class-bypass',eligible(expiry-1,expiry+1,unique=False),False)
    check('invitation/registration-before-email-verification',not policy['invitation']['registrationNeedsVerifiedEmail'] and expiry-1<expiry)
    check('invitation/otp-completed-during-grace',policy['invitation']['finalJoinNeedsVerifiedEmail'] and eligible(expiry-1,expiry+1,identity=True))
    class FlowModel:
        def __init__(self):self.receipt=None;self.enrollments=0
        def complete(self,actor,command,body,now,terminated=False):
            if actor!='verified-owner':return 'FORBIDDEN'
            if self.receipt:
                return 'REPLAY' if self.receipt==(actor,command,body) else 'CONFLICT'
            if not eligible(expiry-1,now,terminated):return 'REJECT'
            self.receipt=(actor,command,body);self.enrollments+=1;return 'COMMITTED'
    flow=FlowModel();check('flow/first',flow.complete('verified-owner','k','body',expiry+1),'COMMITTED')
    check('flow/exact-old-success-after-revoke',flow.complete('verified-owner','k','body',expiry+grace,True),'REPLAY')
    check('flow/no-other-subject-receipt',flow.complete('other','k','body',expiry+2),'FORBIDDEN')
    check('flow/changed-command',flow.complete('verified-owner','k','changed',expiry+2),'CONFLICT');check('flow/one-enrollment',flow.enrollments,1)
    # Immutable manifest/content and complete independent enrollment set; no client ready flag.
    base={'members':['a','b'],'manifestMembers':['a','b'],'membershipVersion':'m1','sources':{o:'v1' for o in policy['settlement']['ownerSources']},
        'rows':{'a':{'course':'course','source':'a1','checkpoint':'cp-a','value':1199},'b':{'course':'course','source':'b1','checkpoint':'cp-b','value':600}},
        'previous':'p1','blockers':[],'complete':True,'sourceProtected':True}
    authoritative=deepcopy(base)
    def freeze_ok(prepared,current):
        return (current['complete'] and current['sourceProtected'] and not current['blockers'] and
            set(current['sources'])==set(policy['settlement']['ownerSources']) and all(current['sources'].values()) and
            len(current['members'])==len(set(current['members'])) and len(prepared['manifestMembers'])==len(set(prepared['manifestMembers'])) and
            set(prepared['manifestMembers'])==set(current['members'])==set(prepared['rows']) and
            prepared['membershipVersion']==current['membershipVersion'] and prepared['sources']==current['sources'] and
            prepared['rows']==current['rows'] and prepared['previous']==current['previous'])
    check('settlement/unmet-targets-settle',freeze_ok(base,authoritative))
    mutations=[('missing-member-row',lambda p,c:p['rows'].pop('b')),('manifest-and-rows-both-omit',lambda p,c:(p['manifestMembers'].remove('b'),p['rows'].pop('b'))),
        ('duplicate-manifest-member',lambda p,c:p['manifestMembers'].append('a')),('unavailable-source',lambda p,c:c.__setitem__('complete',False)),
        ('no-source-protection',lambda p,c:c.__setitem__('sourceProtected',False)),('member-set-drift',lambda p,c:c['members'].append('c')),
        ('membership-version-drift',lambda p,c:c.__setitem__('membershipVersion','m2')),('predecessor-drift',lambda p,c:c.__setitem__('previous','p2')),
        ('value1199-replaced1200',lambda p,c:p['rows']['a'].__setitem__('value',1200)),('old-checkpoint',lambda p,c:c['rows']['a'].__setitem__('checkpoint','cp-a2')),
        ('wrong-course',lambda p,c:p['rows']['a'].__setitem__('course','other'))]
    for name,change in mutations:
        prep=deepcopy(base);curr=deepcopy(authoritative);change(prep,curr);check('settlement/'+name,freeze_ok(prep,curr),False)
    for owner in policy['settlement']['ownerSources']:
        for change in ['missing','changed','empty']:
            curr=deepcopy(authoritative)
            if change=='missing':curr['sources'].pop(owner)
            else:curr['sources'][owner]='v2' if change=='changed' else ''
            check('settlement/'+owner+'/'+change,freeze_ok(base,curr),False)
    for blocker in ['FIRST_MATERIAL_PENDING','LOCKED_TRANSFER_PENDING','UNFINISHED_SESSION','SUPPLEMENT_WINDOW_ACTIVE','TECHNICAL_PROCESSING','REVIEW_PENDING','APPLICATION_PENDING','ROSTER_PENDING','ENDURANCE_PENDING']:
        curr=deepcopy(authoritative);curr['blockers']=[blocker];check('settlement/block/'+blocker,freeze_ok(base,curr),False)
    # Copy-on-commit finite failure model, not a DB isolation/crash-recovery test.
    old={'pointer':'v1','versions':{'v1':deepcopy(base)},'receipts':{},'audit':[]}
    for fail in ['head','rows','manifest','receipt','pointer','audit']:
        durable=deepcopy(old);staged=deepcopy(old)
        for stage in ['head','rows','manifest','receipt','pointer','audit']:
            if stage==fail:break
            if stage=='head':staged['versions']['v2']=deepcopy(base)
            if stage=='receipt':staged['receipts']['cmd']='v2'
            if stage=='pointer':staged['pointer']='v2'
            if stage=='audit':staged['audit'].append('v2')
        check('atomic-model/fail-'+fail,durable,old)
    corrected=deepcopy(old);corrected['versions']['v2']={**deepcopy(base),'previous':'v1'};corrected['pointer']='v2';corrected['receipts']['cmd1']='v1'
    check('correction/old-report-kept',corrected['versions']['v1'],old['versions']['v1'])
    check('correction/historical-removed-member-kept',corrected['versions']['v2']['members'],['a','b'])
    check('receipt/no-pointer-rewind',(corrected['receipts']['cmd1'],corrected['pointer']),('v1','v2'))
    # New-start closure and original legal chain continuation use independent predicates.
    def continue_chain(server_legal,scope_valid,deadline_valid):return server_legal and scope_valid and deadline_valid
    check('closure/pre-receipt-chain-continues',continue_chain(True,True,True));check('closure/local-draft-not-chain',continue_chain(False,True,True),False)
    check('closure/expired-not-extended',continue_chain(True,True,False),False)
    cutoff=Decimal(1000);end=cutoff+policy['closeout']['days']*86400
    def makeup(now,grant,opened=True,member=True,current=True):return grant and opened and member and current and cutoff<=now<end
    check('makeup/named-only',makeup(cutoff+1,False),False);check('makeup/valid',makeup(cutoff+1,True))
    check('makeup/settlement-delayed-no-extension',makeup(end,True),False);check('makeup/closed',makeup(cutoff+1,True,opened=False),False)
    def archivable(courses,results,complete):return complete and len(courses)==len(set(courses)) and set(courses)==set(results) and all(v=='CURRENT_UNBLOCKED_SETTLED' for v in results.values())
    check('archive/full-course-set',archivable(['a','b'],{'a':'CURRENT_UNBLOCKED_SETTLED','b':'CURRENT_UNBLOCKED_SETTLED'},True))
    check('archive/partial-page',archivable(['a','b'],{'a':'CURRENT_UNBLOCKED_SETTLED'},True),False)
    check('archive/unknown-not-empty',archivable([],{},False),False)
    check('archive/past-report-not-current',archivable(['a'],{'a':'PAST_REPORT'},True),False)
    return results
