const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
function fixture(options={}) {
  const dom=new JSDOM(fs.readFileSync('reset-password.html','utf8'),{url:'https://example.com/history-map/reset-password.html'+(options.hash||''),runScripts:'outside-only'});
  const w=dom.window;w.module={exports:{}};w.eval(fs.readFileSync('password-recovery.js','utf8'));
  let listener;const calls=[];
  const sb={auth:{
    onAuthStateChange(cb){listener=cb;},
    async getSession(){if(options.recovery) listener('PASSWORD_RECOVERY',{user:{id:1}});return {data:{session:null},error:options.sessionError};},
    async resetPasswordForEmail(email,opts){calls.push({email,opts});return {error:options.sendError};},
    async getUser(){return {data:{user:{id:1}}};},
    async updateUser(payload){calls.push({update:payload});return {error:options.updateError};},
    async signOut(){calls.push({logout:true});listener('SIGNED_OUT',null);return {};}
  }};
  const app=w.module.exports.createRecovery(w.document,sb);
  const $=id=>w.document.getElementById(id);
  $('recovery-email').value='test@example.com';
  const passwords=(a,b=a)=>{$('new-password').value=a;$('confirm-password').value=b;};
  return {app,$,calls,passwords,w,close:()=>w.close()};
}
const event={preventDefault(){}};
test('reset email uses deployment subpath, neutral confirmation, and cooldown',async()=>{
  const f=fixture();await f.app.request(event);await f.app.request(event);
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].opts.redirectTo,'https://example.com/history-map/reset-password.html');
  assert.match(f.$('recovery-error').textContent,/一分钟/);f.close();
});
test('network failure is visible and permits retry without false success',async()=>{
  const f=fixture({sendError:{message:'Failed to fetch'}});await f.app.request(event);
  assert.match(f.$('recovery-error').textContent,/无法连接/);assert.equal(f.$('recovery-status').textContent,'');
  await f.app.request(event);assert.equal(f.calls.length,2);f.close();
});
test('ordinary page visit cannot update password without recovery event',async()=>{
  const f=fixture();await f.app.init();f.passwords('test-password-1234');await f.app.update(event);
  assert.equal(f.calls.length,0);assert.match(f.$('recovery-error').textContent,/有效重置链接/);f.close();
});
test('valid recovery opens password form and removes token from URL',async()=>{
  const f=fixture({recovery:true,hash:'#access_token=fixture&type=recovery'});await f.app.init();
  assert.equal(f.$('recovery-update').hidden,false);assert.equal(f.$('recovery-request').hidden,true);assert.equal(f.w.location.hash,'');f.close();
});
test('expired recovery error is rendered and URL cleared',async()=>{
  const f=fixture({hash:'#error=access_denied&error_code=otp_expired'});await f.app.init();
  assert.match(f.$('recovery-error').textContent,/过期/);assert.equal(f.$('recovery-update').hidden,true);assert.equal(f.w.location.hash,'');f.close();
});
test('short or mismatched passwords never reach update API',async()=>{
  const f=fixture({recovery:true});await f.app.init();f.passwords('short');await f.app.update(event);
  assert.match(f.$('recovery-error').textContent,/12/);
  f.passwords('test-password-1234','not-the-same');await f.app.update(event);
  assert.match(f.$('recovery-error').textContent,/不一致/);assert.equal(f.calls.length,0);f.close();
});
test('successful reset clears passwords, signs out and prevents repeat update',async()=>{
  const f=fixture({recovery:true});await f.app.init();f.passwords('test-password-1234');await f.app.update(event);
  assert.equal(f.calls[0].update.password,'test-password-1234');assert.ok(f.calls[1].logout);
  assert.equal(f.$('new-password').value,'');assert.match(f.$('recovery-status').textContent,/密码已重置/);
  await f.app.update(event);assert.equal(f.calls.length,2);f.close();
});
test('rejected password update clears fields and allows another attempt',async()=>{
  const f=fixture({recovery:true,updateError:{message:'Password policy rejected'}});await f.app.init();f.passwords('test-password-1234');await f.app.update(event);
  assert.equal(f.$('new-password').value,'');assert.equal(f.$('recovery-update').hidden,false);
  assert.match(f.$('recovery-error').textContent,/policy/);assert.equal(f.calls.length,1);f.close();
});
