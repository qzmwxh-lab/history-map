import test from 'node:test';import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/invite.ts';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-service-key',INVITE_REDIRECT_URL:'https://preview.example.com/zh/login/'};
const request=(body,origin='https://preview.example.com')=>new Request('https://preview.example.com/api/invite',{method:'POST',headers:{origin,Authorization:'Bearer user-token','Content-Type':'application/json'},body:JSON.stringify(body)});
test('invitation endpoint rejects foreign origins before checking credentials',async()=>{const response=await onRequest({request:request({email:'a@example.com',role:'contributor'},'https://attacker.example'),env});assert.equal(response.status,403);});
test('invitation endpoint verifies admin and never accepts administrator role escalation',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async()=>{calls++;return Response.json({app_metadata:{role:'contributor'}});};
 assert.equal((await onRequest({request:request({email:'a@example.com',role:'contributor'}),env})).status,403);assert.equal(calls,1);
 globalThis.fetch=async()=>Response.json({app_metadata:{role:'admin'}});
 assert.equal((await onRequest({request:request({email:'a@example.com',role:'admin'}),env})).status,400);
 }finally{globalThis.fetch=original;}
});
test('invitation endpoint assigns only permitted role after successful invite',async()=>{
 const original=globalThis.fetch;const calls=[];
 try{globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});return calls.length===1?Response.json({app_metadata:{role:'admin'}}):calls.length===2?Response.json({id:'new-user',app_metadata:{}}):Response.json({});};
 assert.equal((await onRequest({request:request({email:'a@example.com',role:'reviewer'}),env})).status,200);
 assert.equal(calls.length,3);assert.equal(JSON.parse(calls[2].options.body).app_metadata.role,'reviewer');
 assert.equal(new URL(calls[1].url).searchParams.get('redirect_to'),env.INVITE_REDIRECT_URL);
 }finally{globalThis.fetch=original;}
});
