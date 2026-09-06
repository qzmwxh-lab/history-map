const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');

function fixture({role='admin',rows=[],total=rows.length,writeError=null}={}) {
  const dom = new JSDOM(fs.readFileSync('admin.html','utf8'),{url:'https://example.com/history-map/admin.html',runScripts:'outside-only'});
  const win = dom.window;
  win.module = {exports:{}};
  win.eval(fs.readFileSync('security.js','utf8'));
  win.HistoryMapSecurity = win.module.exports;
  win.eval(fs.readFileSync('admin.js','utf8'));
  for(const dialog of win.document.querySelectorAll('dialog')) {
    dialog.showModal = () => {dialog.open=true;};
    dialog.close = () => {dialog.open=false;dialog.dispatchEvent(new win.Event('close'));};
  }
  const calls = []; let currentRole = role;
  const sb = {
    auth:{getUser:async()=>({data:{user:{id:'user1',email:'admin@example.com',app_metadata:{role:currentRole}}}}),onAuthStateChange(){},signOut:async()=>({})},
    from(table) {
      const call = {table,filters:[]}; calls.push(call);
      const q = {
        select(fields,options){call.fields=fields;call.options=options;return q;},
        eq(key,value){call.filters.push([key,value]);return q;},
        ilike(key,value){call.search=[key,value];return q;},
        order(){return q;},range(a,b){call.range=[a,b];return q;},
        update(payload){call.write=payload;return q;},insert(payload){call.write=payload;return q;},
        delete(){call.delete=true;return q;}, single(){return q;},
        then(resolve,reject){return Promise.resolve({data:rows,count:total,error:call.write?writeError:null}).then(resolve,reject);}
      }; return q;
    }
  };
  const app = win.module.exports.createAdmin(win.document,sb,{adminRole:'admin',storage:{vrBucket:'vr-media'}});
  return {app,doc:win.document,calls,revoke:()=>currentRole='member',close:()=>win.close()};
}

test('admin console rejects ordinary members before querying content',async()=>{
  const f=fixture({role:'member'});
  await assert.rejects(f.app.start(),/没有管理员权限/);
  assert.equal(f.calls.length,0);assert.equal(f.doc.getElementById('console').hidden,true);f.close();
});

test('overview uses server counts, pending list filters and paginates, unsafe names remain text',async()=>{
  const attack='<img src=x onerror=alert(1)>';
  const f=fixture({rows:[{id:'p1',n:attack,w:'地点',y:1900,status:'pending'}],total:35});
  await f.app.start();
  assert.equal(f.calls.length,4);assert.ok(f.calls.every(c=>c.options.head&&c.options.count==='exact'));
  await f.app.navigate('pending');
  assert.deepEqual(f.calls.at(-1).range,[0,19]);assert.deepEqual(f.calls.at(-1).filters,[['status','pending']]);
  assert.equal(f.doc.querySelector('#table-body img'),null);assert.ok(f.doc.getElementById('table-body').textContent.includes(attack));
  assert.equal(f.doc.getElementById('next').disabled,false);
  f.app.state.page=1; await f.app.load();assert.deepEqual(f.calls.at(-1).range,[20,39]);f.close();
});

test('failed save preserves edit form and reports server rejection',async()=>{
  const f=fixture({writeError:{message:'RLS denied'}});
  await f.app.start();await f.app.navigate('points');
  await f.app.edit({id:'p1',n:'人物',w:'地点',y:1900,la:30,ln:110,status:'pending'});
  await f.app.save({preventDefault(){}});
  assert.equal(f.doc.getElementById('editor').open,true);
  assert.equal(f.doc.getElementById('edit-error').textContent,'RLS denied');
  assert.equal(f.calls.at(-1).write.n,'人物');f.close();
});

test('role revocation before save clears console and performs no write',async()=>{
  const f=fixture();await f.app.start();await f.app.navigate('works');await f.app.edit({id:1,title:'作品'});
  f.revoke();await f.app.save({preventDefault(){}});
  assert.equal(f.doc.getElementById('console').hidden,true);assert.equal(f.doc.getElementById('editor').open,false);
  assert.ok(f.calls.every(c=>!c.write));f.close();
});

test('point coordinate validation prevents invalid writes',async()=>{
  const f=fixture();await f.app.start();await f.app.navigate('points');
  await f.app.edit({id:'p1',n:'人物',w:'地点',y:1900,la:91,ln:110,status:'pending'});
  await f.app.save({preventDefault(){}});
  assert.match(f.doc.getElementById('edit-error').textContent,/超出有效范围/);assert.ok(f.calls.every(c=>!c.write));f.close();
});

test('work links point to the existing hash-based panorama editor',async()=>{
  const f=fixture({rows:[{id:42,title:'作品'}]});await f.app.start();await f.app.navigate('works');
  assert.equal(f.doc.querySelector('#table-body a').getAttribute('href'),'./vr.html#/work/42');f.close();
});

test('successful work save closes editor and refreshes the list',async()=>{
  const f=fixture();await f.app.start();await f.app.navigate('works');await f.app.edit({id:42,title:'作品'});
  f.doc.querySelector('[name="title"]').value='更新作品';await f.app.save({preventDefault(){}});
  const write=f.calls.find(c=>c.write);
  assert.equal(write.write.title,'更新作品');assert.deepEqual(write.filters,[['id',42]]);
  assert.equal(f.doc.getElementById('editor').open,false);assert.ok(f.calls.at(-1).range);f.close();
});

test('approve button writes approved status for only the selected point',async()=>{
  const f=fixture({rows:[{id:'p1',n:'人物',status:'pending'}]});await f.app.start();await f.app.navigate('pending');
  [...f.doc.querySelectorAll('#table-body button')].find(el=>el.textContent==='审核发布').click();
  await new Promise(resolve=>setImmediate(resolve));
  const write=f.calls.find(c=>c.write);assert.equal(write.write.status,'approved');assert.deepEqual(write.filters,[['id','p1']]);f.close();
});

test('deletion requires confirmation and does not delete on cancel',async()=>{
  const f=fixture({rows:[{id:42,title:'作品'}]});await f.app.start();await f.app.navigate('works');
  [...f.doc.querySelectorAll('#table-body button')].find(el=>el.textContent==='删除').click();
  const dialog=f.doc.getElementById('confirm-dialog');assert.equal(dialog.open,true);
  dialog.returnValue='cancel';dialog.close();await new Promise(resolve=>setImmediate(resolve));
  assert.ok(f.calls.every(c=>!c.delete));f.close();
});

test('confirmed deletion targets the selected work',async()=>{
  const f=fixture({rows:[{id:42,title:'作品'}]});await f.app.start();await f.app.navigate('works');
  [...f.doc.querySelectorAll('#table-body button')].find(el=>el.textContent==='删除').click();
  const dialog=f.doc.getElementById('confirm-dialog');dialog.returnValue='delete';dialog.close();
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(f.calls.find(c=>c.delete).filters,[['id',42]]);f.close();
});
