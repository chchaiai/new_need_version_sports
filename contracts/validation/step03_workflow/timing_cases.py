"""Finite protocol calculator over synthetic authoritative facts; NOT Backend tests."""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal as D


def instant(value):
    whole, fraction = (value[:-1].split('.') + ['0'])[:2] if '.' in value else (value[:-1], '0')
    return D(int(datetime.fromisoformat(whole).replace(tzinfo=timezone.utc).timestamp())) + D('0.'+fraction)


def union(intervals):
    result=[]
    for start,end in sorted(intervals):
        assert end >= start
        if result and start <= result[-1][1]: result[-1]=(result[-1][0],max(result[-1][1],end))
        else: result.append((start,end))
    return result


def elapsed(start,end,pauses):
    return end-start-sum((max(D(0),min(end,b)-max(start,a)) for a,b in union(pauses)), D(0))


def school_due(start,budget,calendar,pauses):
    """Every covered date is explicit; missing coverage returns None, never weekday guess."""
    cursor=start
    remaining=D(budget)
    while remaining:
        # Whole seconds choose the date; never round subsecond instants across midnight.
        local=datetime.fromtimestamp(int(cursor),timezone.utc)+timedelta(hours=8)
        key=local.date().isoformat()
        if key not in calendar: return None
        next_day=D(int(datetime.combine(local.date()+timedelta(days=1),datetime.min.time(),timezone.utc).timestamp()))-D(28800)
        available=[(cursor,next_day)] if calendar[key] else []
        for a,b in union(pauses):
            split=[]
            for left,right in available:
                if b<=left or a>=right: split.append((left,right)); continue
                if left<a: split.append((left,a))
                if b<right: split.append((b,right))
            available=split
        for left,right in available:
            if right-left >= remaining: return left+remaining
            remaining-=right-left
        cursor=next_day
    return cursor


def run(policy):
    rows=[]
    def check(name,actual,expected):
        rows.append({'name':name,'passed':actual==expected,'actual':str(actual),'expected':str(expected)})
    # Separate fixed expected answers; no expected value is computed from the policy under test.
    ended=instant('2026-09-07T02:00:00.000000001Z')
    for route,budget in [('ordinarySeconds',86400),('swimmingTimelySeconds',900),('swimmingOfflineSeconds',86400)]:
        for delta,expected in [(-D('0.000000001'),True),(D(0),False),(D('0.000000001'),False)]:
            check(route+'/'+str(delta),ended+D(budget)+delta < ended+D(policy['firstAcceptance'][route]),expected)
    for delta,expected in [(-D('0.000000001'),True),(D(0),False),(D('0.000000001'),False)]:
        check('same_batch_transfer/'+str(delta),ended+D(1800)+delta < ended+D(policy['lockedTransfer']['seconds']),expected)
    check('P02-R1_closed_before_first_receipt',instant('2026-09-07T04:00:00Z') < ended+D(policy['firstAcceptance']['ordinarySeconds']),True)
    check('P02-R2_removed_before_first_receipt',policy['historicalChain']['firstReceiptRequiredForProtection'],False)
    check('P02-R3_unaccepted_chain_still_blocks',set(policy['historicalChain']['retains']),{'ORIGINAL_FIRST_WINDOW','ORIGINAL_LOCKED_TRANSFER'})
    check('no_local_draft_creates_permission',policy['historicalChain']['required'],'SERVER_CONFIRMED_LEGAL_SESSION_OR_RECORD_BEFORE_LIFECYCLE_BOUNDARY')
    check('P02-R8_auth_precedes_replay',policy['replayOrder'][0],'AUTHENTICATION_AND_ORIGINAL_RESOURCE_SCOPE')
    check('P02-R10_old_receipt_precedes_new_deadline',policy['replayOrder'][1],'EXACT_COMMITTED_RECEIPT')
    for hours in [24,72]:
        budget=D(hours*3600)
        for delta,expected in [(-D('0.5'),True),(D(0),False),(D('0.5'),False)]:
            check(f'supplement_{hours}/'+str(delta),budget+delta<budget,expected)
    check('pause_union',elapsed(D(0),D(100),[(D(20),D(50)),(D(40),D(70)),(D(20),D(50))]),D(50))
    check('pause_only_intersection',elapsed(D(0),D(100),[(D(-20),D(10)),(D(90),D(120))]),D(80))
    check('subsecond_pause',elapsed(D(0),D('1.5'),[(D('0.1'),D('0.6'))]),D(1))
    # Synthetic calendar deliberately includes a working Saturday and a nonworking Monday.
    calendar={'2026-09-04':True,'2026-09-05':True,'2026-09-06':False,'2026-09-07':False,
              '2026-09-08':True,'2026-09-09':True,'2026-09-10':False}
    start=instant('2026-09-04T02:00:00.000000001Z')
    check('school_calendar_not_mon_fri',school_due(start,policy['teacherSla']['budgetSeconds'],calendar,[]),instant('2026-09-08T02:00:00.000000001Z'))
    pauses=[(instant('2026-09-04T04:00:00Z'),instant('2026-09-04T06:00:00Z')),
            (instant('2026-09-04T05:00:00Z'),instant('2026-09-04T06:00:00Z')),
            (instant('2026-09-04T16:00:00Z'),instant('2026-09-04T17:00:00Z'))]
    check('school_pause_union_day_intersection',school_due(start,172800,calendar,pauses),instant('2026-09-08T05:00:00.000000001Z'))
    nonworking_pause=[(instant('2026-09-06T02:00:00Z'),instant('2026-09-07T06:00:00Z'))]
    check('nonworking_pause_adds_nothing',school_due(start,172800,calendar,nonworking_pause),instant('2026-09-08T02:00:00.000000001Z'))
    incomplete=dict(calendar); incomplete.pop('2026-09-07')
    check('calendar_missing_day_is_unknown',school_due(start,172800,incomplete,[]),None)
    check('calendar_empty_is_unknown',school_due(start,172800,{},[]),None)
    check('Shanghai_midnight_boundary',school_due(instant('2026-09-04T16:00:00Z'),86400,calendar,[]),instant('2026-09-05T16:00:00Z'))
    check('last_nanosecond_of_working_day',school_due(instant('2026-09-05T15:59:59.999999999Z'),D('0.000000001'),calendar,[]),instant('2026-09-05T16:00:00Z'))
    check('first_nanosecond_after_working_day',school_due(instant('2026-09-05T16:00:00Z'),D('0.000000001'),calendar,[]),instant('2026-09-07T16:00:00.000000001Z'))
    # Incident recovery at90000 is earlier than actual entry unlock93600. Union prevents double compensation.
    charge=elapsed(D(0),D(93600),[(D(82800),D(90000)),(D(86400),D(93600))])
    check('P04_original_remaining_at_real_unlock',D(86400)-charge,D(3600))
    check('P04_later_legal_successor_protected',policy['expiryCorrection']['preserveLegalSuccessors'],True)
    check('P04_cannot_grant_new_budget',policy['expiryCorrection']['grantFullWindow'],False)
    return rows
