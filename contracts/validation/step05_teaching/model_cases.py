"""Finite design oracles against trusted synthetic source facts, not a Backend."""
from copy import deepcopy
from itertools import product


def run(policy):
    results=[]
    def check(name,actual,expected):results.append({'name':name,'passed':actual==expected,'actual':actual,'expected':expected})
    # A command has an immutable original selection. Failure never leaves a prefix written.
    def commit(rows,selected,complete=True,versions=True,receipt=None,authorized=True):
        before=deepcopy(rows)
        if not authorized:return before,'DENIED'
        if receipt is not None:return before,'ORIGINAL_RECEIPT'
        if not complete or not versions or not selected or len(selected)!=len(set(selected)):return before,'REJECTED'
        if any(i not in rows or rows[i]['state']!='READY' or rows[i]['matches']!=1 or not rows[i]['guards'] for i in selected):return before,'REJECTED'
        after=deepcopy(rows)
        for i in selected:after[i]['state']='CONFIRMED'
        return after,'COMMITTED'
    for bad_position,matches,complete,versions in product(range(3),[0,1,2],[False,True],[False,True]):
        rows={i:{'state':'READY','matches':1,'guards':True} for i in range(4)};rows[bad_position]['matches']=matches
        after,result=commit(rows,[0,1,2],complete,versions)
        expected='COMMITTED' if matches==1 and complete and versions else 'REJECTED'
        name=f'atomic/{bad_position}/{matches}/{complete}/{versions}'
        check(name,result,expected);check(name+'/unselected',after[3],rows[3])
        if expected=='REJECTED':check(name+'/no_prefix',after,rows)
    rows={i:{'state':'READY','matches':1,'guards':True} for i in range(3)}
    for selection in [[],[0,0],[0,1,0],[0,7]]:check('selection/'+str(selection),commit(rows,selection)[1],'REJECTED')
    check('replay/no_new_write',commit(rows,[0],False,False,'receipt')[0],rows)
    check('replay/authorization_before_receipt',commit(rows,[0],receipt='r',authorized=False)[1],'DENIED')
    # Explicit teacher interpretation: decimal text is never guessed.
    def seconds(text):
        if text.isdigit():return int(text)
        parts=text.split(':')
        if len(parts)==2 and parts[0].isdigit() and len(parts[1])==2 and parts[1].isdigit() and int(parts[1])<60:return int(parts[0])*60+int(parts[1])
        return None
    for txt,expected in [('4.30',None),('4:30',270),('270',270),('4:60',None),('258.0',None),('0',0),('4:3',None)]:check('time/'+txt,seconds(txt),expected)
    check('time/explicit_mismatch',seconds('4:30')==258,False)
    # Roster counts alone never prove identity/completeness; errors count toward the cap.
    def roster_publish(raw_count,identities,terminal,complete):return raw_count<=500 and raw_count>0 and terminal and complete and len(identities)==len(set(identities))
    for count,complete,terminal,duplicate in product([499,500,501],[False,True],[False,True],[False,True]):
        ids=['s1','s1' if duplicate else 's2'];check(f'roster/{count}/{complete}/{terminal}/{duplicate}',roster_publish(count,ids,terminal,complete),count<=500 and complete and terminal and not duplicate)
    check('roster/equal_counts_wrong_identities',set(['s1','s2'])==set(['s2','s3']),False)
    check('roster/verified_and_joined_and_identity',[(v and j and i) for v,j,i in product([False,True],repeat=3)],[False]*7+[True])
    # Callback acceptance binds all original identities, not just task success.
    keys=['batch','task','attempt','input','service','policy','draft'];bound={k:'original' for k in keys}
    def callback(got,teacher_done):return not teacher_done and got==bound
    check('callback/current_pending',callback(bound,False),True)
    check('callback/teacher_done',callback(bound,True),False)
    for key in keys:check('callback/stale/'+key,callback({**bound,key:'later'},False),False)
    # Manual mode and eligibility are separate. Recovery never reopens a decided task.
    for org,course,hard,done in product([False,True],repeat=4):
        route='FINAL_UNCHANGED' if done else ('HARD_REJECT' if not hard else ('ORIGINAL_TEACHER' if org or course else 'TECHNICAL_PENDING'))
        expected='FINAL_UNCHANGED' if done else 'HARD_REJECT' if not hard else 'ORIGINAL_TEACHER' if org or course else 'TECHNICAL_PENDING'
        check(f'manual/{org}/{course}/{hard}/{done}',route,expected)
    for actor,accepted,matching,purpose in product(['SUPER','SUBADMIN','TEACHER'],[False,True],[False,True],['VLM_REVIEW','ROSTER_OCR']):
        may_auto=actor=='SUPER' and accepted and matching and purpose=='VLM_REVIEW'
        check(f'auto/{actor}/{accepted}/{matching}/{purpose}',may_auto,(actor,accepted,matching,purpose)==('SUPER',True,True,'VLM_REVIEW'))
    # Projection is built from safe sources. This models a template guard, not NLP filtering.
    safe_keys={'enrollmentId','distanceMeters','durationSeconds','testedOn','outcome'}
    teacher={'enrollmentId':'s1','durationSeconds':270,'score':99,'level':'A','remark':'private'}
    student={k:v for k,v in teacher.items() if k in safe_keys}
    check('privacy/positive_allowlist',student,{'enrollmentId':'s1','durationSeconds':270})
    for stage in ['CREATE','READ','REPLAY','COUNT','EXPORT','CACHE','LOG']:
        for approved,clean in product([False,True],repeat=2):check(f'privacy/{stage}/{approved}/{clean}',approved and clean,approved is True and clean is True)
    for current_role,owner,member,audit in product(['TEACHER','STUDENT','ADMIN'],[False,True],[False,True],[False,True]):
        may_read=current_role=='TEACHER' and audit
        check(f'history/{current_role}/{owner}/{member}/{audit}',may_read,current_role=='TEACHER' and audit)
    check('policy/atomic',policy['endurance']['missingOrMultipleRuleMatch'],'REJECT_WHOLE_COMMAND')
    return results
