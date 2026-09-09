"""Synthetic transport acceptance vectors for H/Z. This is not a server implementation."""
import json
import re
from urllib.parse import parse_qsl
from jsonschema import Draft202012Validator
from verify import EXPECTED_OPS, ops

def vectors(spec):
 rows=[]
 common=[('',True),('limit=1',True),('limit=100',True),('limit=0001',True),('limit=0',False),
         ('limit=101',False),('limit=2.5',False),('limit=1e1',False),('limit=%2B1',False),
         ('limit=-1',False),('limit=%201',False),('limit=1%20',False),('limit=1%0A',False),
         ('limit=',False),('limit=%EF%BC%91',False),('limit=2&limit=3',False),
         ('limit=2&%6cimit=3',False),('cursor=a&cursor=b',False)]
 for name in sorted(EXPECTED_OPS):
  for i,(query,valid) in enumerate(common):rows.append(dict(name=f'{name}/{i}',operationId=name,query=query,expectedValid=valid,error=None if valid else 'INVALID_REQUEST',status=None if valid else 400))
  parameters={p.get('name'):p for p in ops(spec)[name].get('parameters',[]) if p.get('in')=='query'}
  for key,value in [('read','maybe'),('status','INVALID'),('q','')]:
   if key in parameters:rows.append(dict(name=f'{name}/{key}',operationId=name,query=key+'='+value,expectedValid=False,error='INVALID_REQUEST',status=400))
 return rows

def validate(spec,operation,query):
 op=ops(spec)[operation];params={p['name']:p for p in op.get('parameters',[]) if p.get('in')=='query'}
 pairs=parse_qsl(query,keep_blank_values=True);seen=set()
 for name,value in pairs:
  if name not in params:continue  # Unknown-parameter policy is outside this CR.
  if name in seen:return False
  seen.add(name)
  schema=params[name]['schema']
  if name=='cursor':continue  # Opaque cursor validity requires the real server/binding.
  if name=='limit':
   if re.fullmatch('[0-9]+',value) is None:return False
   # Numeric meaning is bounded without parsing arbitrary-size attacker input as a float.
   significant=value.lstrip('0') or '0'
   if len(significant)>3:return False
   value=int(significant)
  elif schema.get('type')=='boolean':
   if value not in ['true','false']:return False
   value=value=='true'
  if not Draft202012Validator(schema).is_valid(value):return False
 return True
