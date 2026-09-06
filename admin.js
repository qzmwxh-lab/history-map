(function (root) {
  'use strict';
  function createAdmin(doc, sb, config) {
    const $ = id => doc.getElementById(id);
    const state = { user: null, tab: 'overview', page: 0, total: 0, rows: [], work: null, revision: 0, busy: false };
    const pageSize = 20;
    const schema = {
      points: { table: 'missionary_points', title: '历史点位', name: 'n', fields: [
        ['n','人物 / 名称','text',true], ['w','地点','text',true], ['y','年代','number',true],
        ['la','纬度','number',true,-90,90], ['ln','经度','number',true,-180,180],
        ['status','发布状态','select',true,['pending','approved']], ['d','历史描述','textarea'],
        ['n_en','英文名称'], ['w_en','英文地点'], ['d_en','英文描述','textarea'],
        ['img','图片 URL','url'], ['audio_url','音频 URL','url'], ['video_url','视频 URL','url'],
        ['vr360_url','全景 URL','url'], ['doc_url','文献 URL','url']
      ] },
      works: { table: 'vr_works', title: 'VR 全景作品', name: 'title', fields: [
        ['title','作品名称','text',true], ['location_name','地点'], ['description','作品描述','textarea'],
        ['lat','纬度','number',false,-90,90], ['lng','经度','number',false,-180,180], ['cover','封面 URL','url']
      ] },
      scenes: { table: 'vr_scenes', title: '全景场景', name: 'name', fields: [
        ['name','场景名称','text',true], ['media_type','媒体类型','select',true,['image','video']],
        ['media_url','媒体 URL（或上传文件）','url'], ['yaw','初始水平角','number',true,-180,180],
        ['pitch','初始俯仰角','number',true,-90,90], ['fov','视角','number',true,30,120],
        ['sort_order','排序序号','number',true,0]
      ] }
    };
    const spec = () => schema[state.tab === 'pending' ? 'points' : state.tab];
    const message = error => /fetch|network|load failed/i.test(error?.message || '') ? '无法连接认证或数据服务，请检查网络和 Supabase 项目地址。这不代表密码错误。' : error?.message || '操作失败，请检查网络连接和数据库权限。';
    const node = (tag, text, cls) => { const el = doc.createElement(tag); if (text != null) el.textContent = text; if (cls) el.className = cls; return el; };
    const button = (text, action) => { const el = node('button',text); el.type = 'button'; el.addEventListener('click', () => run(action)); return el; };
    function lock() {
      state.user = null; state.revision++; state.rows = [];
      $('console').hidden = true; $('login').hidden = false; $('table-body').replaceChildren();
      $('fields').replaceChildren(); $('account').textContent = ''; $('notice').textContent = '';
      for (const el of doc.querySelectorAll('.stats strong')) el.textContent = '—';
      for (const id of ['editor','confirm-dialog']) if ($(id).open) $(id).close();
    }
    async function authorize() {
      if (!sb) throw new Error('认证服务未加载，请检查网络后刷新页面。');
      const { data, error } = await sb.auth.getUser();
      if (error || !root.HistoryMapSecurity.isAdminUser(data?.user,config.adminRole)) {
        lock(); throw new Error(error ? message(error) : '该账号没有管理员权限，请联系项目负责人授权。');
      }
      state.user = data.user;
      return data.user;
    }
    async function run(action) {
      try { await action(); } catch (error) { (state.user ? $('notice') : $('login-error')).textContent = message(error); }
    }
    async function load() {
      const revision = ++state.revision;
      $('notice').textContent = '正在加载…';
      $('table-body').replaceChildren(); state.rows = [];
      $('previous').disabled = $('next').disabled = true;
      try {
        await authorize();
        if (revision !== state.revision) return;
        if (state.tab === 'overview') {
          const count = (table,status) => { let q = sb.from(table).select('id',{count:'exact',head:true}); return status ? q.eq('status',status) : q; };
          const results = await Promise.all([count('missionary_points'),count('missionary_points','pending'),count('missionary_points','approved'),count('vr_works')]);
          if (revision !== state.revision) return;
          for (const result of results) if (result.error) throw result.error;
          ['points','pending','approved','works'].forEach((key,i) => $('stat-'+key).textContent = String(results[i].count ?? 0));
        } else {
          const s = spec();
          let query = sb.from(s.table).select('*',{count:'exact'});
          if (state.tab === 'pending') query = query.eq('status','pending');
          if (state.tab === 'scenes') query = query.eq('work_id',state.work.id);
          const term = $('search').value.trim().slice(0,100).replace(/[\\%_]/g,'\\$&');
          if (term) query = query.ilike(s.name,'%'+term+'%');
          query = query.order(state.tab === 'scenes' ? 'sort_order' : 'id',{ascending:state.tab === 'scenes'});
          if (state.tab === 'scenes') query = query.order('id');
          const { data,error,count } = await query.range(state.page*pageSize,(state.page+1)*pageSize-1);
          if (revision !== state.revision) return;
          if (error) throw error;
          state.rows = data || []; state.total = count ?? 0;
          if (!state.rows.length && state.page > 0) { state.page--; return load(); }
          renderRows();
        }
        $('notice').textContent = '';
      } catch (error) {
        if (revision !== state.revision) throw error;
        $('empty').hidden = false; $('empty').textContent = '加载失败，请点击刷新重试。';
        for (const el of doc.querySelectorAll('.stats strong')) el.textContent = '—';
        throw error;
      }
    }
    function renderRows() {
      const s = spec(); const head = node('tr');
      ['名称',state.tab === 'scenes' ? '类型 / 顺序' : '地点',state.tab === 'pending' || state.tab === 'points' ? '状态 / 年代' : '记录 ID','操作'].forEach(t => head.append(node('th',t)));
      $('table-head').replaceChildren(head);
      $('table-body').replaceChildren(...state.rows.map(row => {
        const tr = node('tr'); tr.append(node('td',row[s.name] || '未命名'));
        tr.append(node('td',state.tab === 'scenes' ? `${row.media_type} / ${row.sort_order}` : row.w || row.location_name || '—'));
        const detail = node('td');
        if (s === schema.points) { detail.append(node('span',row.status === 'approved' ? '已发布' : '待审核','badge '+row.status),node('div',row.y)); }
        else detail.textContent = String(row.id);
        tr.append(detail); const actions = node('td');
        actions.append(button('编辑',() => edit(row)));
        if (s === schema.points && row.status !== 'approved') actions.append(button('审核发布',() => mutate(async () => {
          await authorize(); const result = await sb.from(s.table).update({status:'approved'}).eq('id',row.id).select('id').single(); if(result.error) throw result.error; await load();
        })));
        if (s === schema.works) {
          actions.append(button('管理场景',() => {state.work = row; return navigate('scenes');}));
          const link = node('a','热点编辑 ↗'); link.href = './vr.html#/work/'+encodeURIComponent(row.id); actions.append(link);
        }
        actions.append(button('删除',() => remove(row,s))); tr.append(actions); return tr;
      }));
      $('empty').hidden = state.rows.length > 0; $('empty').textContent = '暂无记录，或没有匹配的搜索结果。';
      $('result-count').textContent = `共 ${state.total} 条 · 每页 ${pageSize} 条`;
      $('page-number').textContent = `${state.page+1} / ${Math.max(1,Math.ceil(state.total/pageSize))}`;
      $('previous').disabled = state.page === 0; $('next').disabled = (state.page+1)*pageSize >= state.total;
    }
    async function mutate(action) {
      if (state.busy) return;
      state.busy = true; $('save').disabled = true;
      try { await action(); } finally { state.busy = false; $('save').disabled = false; }
    }
    async function remove(row,s) {
      $('confirm-text').textContent = row[s.name] || String(row.id);
      const dialog = $('confirm-dialog'); dialog.returnValue = ''; dialog.showModal();
      const answer = await new Promise(resolve => dialog.addEventListener('close',() => resolve(dialog.returnValue),{once:true}));
      if (answer !== 'delete') return;
      await mutate(async () => {
        await authorize();
        const {data,error} = await sb.from(s.table).delete().eq('id',row.id).select('id');
        if (error) throw error;
        if (!data?.length) throw new Error('未删除任何记录，可能已被移除或权限发生变化。');
        await load();
      });
    }
    let editing = null;
    async function edit(row = null) {
      await authorize(); editing = {row,s:spec(),workId:state.work?.id};
      $('fields').replaceChildren(); $('edit-error').textContent = '';
      $('editor-title').textContent = (row ? '编辑' : '新建') + editing.s.title;
      const defaults = {status:'pending',media_type:'image',yaw:0,pitch:0,fov:90,sort_order:0};
      for (const [key,label,type='text',required=false,min,max] of editing.s.fields) {
        const wrap = node('label',label); const input = node(type === 'textarea' ? 'textarea' : type === 'select' ? 'select' : 'input');
        input.name = key; input.required = required;
        if(type === 'select') for (const option of min) { const el = node('option',({pending:'待审核',approved:'已发布',image:'图片',video:'视频'})[option]); el.value = option; input.append(el); }
        else if (type !== 'textarea') input.type = type;
        if(type === 'number') { input.step = ['y','sort_order'].includes(key) ? '1' : 'any'; if(min != null) input.min = min; if(max != null) input.max = max; }
        input.value = row?.[key] ?? defaults[key] ?? ''; if(type === 'textarea' || type === 'url') wrap.className = 'wide';
        wrap.append(input); $('fields').append(wrap);
      }
      if (editing.s === schema.scenes) {
        const label = node('label','上传全景文件（图片 ≤ 20 MB；视频 ≤ 200 MB）','wide'); const file = node('input');
        file.type = 'file'; file.name = 'upload'; file.accept = 'image/jpeg,image/png,image/webp,video/mp4,video/webm'; label.append(file); $('fields').append(label);
      }
      $('editor').showModal();
    }
    async function save(event) {
      event.preventDefault();
      await mutate(async () => {
        const current = editing; $('edit-error').textContent = '';
        try {
          const user = await authorize(); const payload = {};
          for (const [key,,type='text',required] of current.s.fields) {
            const input = $('edit-form').elements.namedItem(key); const value = input.value.trim();
            if(required && !value) throw new Error('请填写所有必填项。');
            if(type === 'number' && value && (!Number.isFinite(Number(value)) || (input.min !== '' && Number(value)<Number(input.min)) || (input.max !== '' && Number(value)>Number(input.max)) || (input.step === '1' && !Number.isInteger(Number(value))))) throw new Error('数字或坐标超出有效范围。');
            if(type === 'url' && value && !/^https?:\/\//i.test(value)) throw new Error('媒体地址必须使用 HTTP 或 HTTPS。');
            payload[key] = type === 'number' ? (value ? Number(value) : null) : value;
          }
          if(current.s === schema.scenes) {
            payload.work_id = current.workId;
            const file = $('edit-form').elements.namedItem('upload').files[0];
            if(file) {
              const video = ['video/mp4','video/webm'].includes(file.type);
              if (!video && !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('不支持此文件类型。');
              if(file.size > (video ? 200 : 20)*1024*1024) throw new Error('文件超过大小限制。');
              const path = `${user.id}/${current.workId}/${root.crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
              const bucket = sb.storage.from(config.storage.vrBucket);
              const {error} = await bucket.upload(path,file,{contentType:file.type,upsert:false}); if(error) throw error;
              payload.media_url = bucket.getPublicUrl(path).data.publicUrl; payload.media_type = video ? 'video' : 'image';
              // Keep the URL in the form so a failed database save can be retried without uploading again.
              $('edit-form').elements.namedItem('media_url').value = payload.media_url;
              $('edit-form').elements.namedItem('media_type').value = payload.media_type;
              $('edit-form').elements.namedItem('upload').value = '';
              await authorize();
            }
            if(!payload.media_url) throw new Error('请填写媒体 URL 或上传全景文件。');
          }
          if(!current.row && current.s === schema.points) { payload.id = root.crypto.randomUUID(); payload.created_by = user.id; }
          let query = sb.from(current.s.table);
          query = current.row ? query.update(payload).eq('id',current.row.id) : query.insert(payload);
          const {error} = await query.select('id').single(); if(error) throw error;
          $('editor').close(); await load();
        } catch(error) { (state.user ? ($('editor').open ? $('edit-error') : $('notice')) : $('login-error')).textContent = message(error); }
      });
    }
    async function navigate(tab) {
      state.tab = tab; state.page = 0; $('search').value = '';
      $('overview').hidden = tab !== 'overview'; $('records').hidden = tab === 'overview';
      $('page-title').textContent = tab === 'overview' ? '工作概览' : tab === 'pending' ? '待审核点位' : spec().title;
      $('page-description').textContent = tab === 'scenes' ? `当前作品：${state.work.title} · 热点与漫游顺序请在全景编辑器中设置。` : '查看、审核和维护云端内容。';
      $('search').placeholder = tab === 'points' || tab === 'pending' ? '搜索人物 / 名称…' : '搜索名称…';
      doc.querySelectorAll('[data-tab]').forEach(el => el.classList.toggle('active',el.dataset.tab === (tab === 'scenes' ? 'works' : tab)));
      await load();
    }
    async function start() {
      await authorize(); $('login').hidden = true; $('console').hidden = false; $('account').textContent = state.user.email;
      await navigate('overview');
    }
    $('login-form').addEventListener('submit',event => {
      event.preventDefault(); run(async () => {
        $('login-submit').disabled = true; $('login-error').textContent = '';
        try {
          if(!sb) throw new Error('认证服务未加载，请刷新重试。');
          const {error} = await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
          $('password').value = ''; if(error) throw error; await start();
        } finally { $('login-submit').disabled = false; }
      });
    });
    $('logout').addEventListener('click',() => run(async () => { lock(); const {error} = await sb.auth.signOut(); if(error) throw error; }));
    $('refresh').addEventListener('click',() => run(load));
    doc.querySelectorAll('[data-tab]').forEach(el => el.addEventListener('click',() => run(() => navigate(el.dataset.tab))));
    $('review-next').addEventListener('click',() => run(() => navigate('pending')));
    $('manage-works').addEventListener('click',() => run(() => navigate('works')));
    $('new-record').addEventListener('click',() => run(() => edit()));
    $('previous').addEventListener('click',() => {state.page--; run(load);});
    $('next').addEventListener('click',() => {state.page++; run(load);});
    let timer; $('search').addEventListener('input',() => { clearTimeout(timer); timer = setTimeout(() => {state.page = 0; run(load);},300); });
    $('edit-form').addEventListener('submit',save);
    for (const id of ['close-editor','cancel-edit']) $(id).addEventListener('click',() => {if(!state.busy) $('editor').close();});
    $('editor').addEventListener('cancel',event => {if(state.busy) event.preventDefault();});
    sb?.auth.onAuthStateChange((event,session) => {
      if(event === 'SIGNED_OUT' || (session && !root.HistoryMapSecurity.isAdminUser(session.user,config.adminRole))) lock();
    });
    return {start,navigate,load,edit,save,state,lock};
  }
  root.HistoryMapAdmin = {createAdmin};
  if(typeof module !== 'undefined') module.exports = {createAdmin};
  else {
    let sb = null;
    try { sb = root.supabase?.createClient(root.APP_CONFIG.supabaseUrl,root.APP_CONFIG.supabasePublishableKey); }
    catch(error) { root.document.getElementById('login-error').textContent = error.message; }
    const app = createAdmin(root.document,sb,root.APP_CONFIG);
    if(sb) sb.auth.getSession().then(({data,error}) => {
      if(error) throw error;
      if(data.session) return app.start();
    }).catch(error => root.document.getElementById('login-error').textContent = error.message);
    else root.document.getElementById('login-error').textContent = '认证服务未加载，请检查网络并刷新。';
  }
})(typeof window !== 'undefined' ? window : globalThis);
