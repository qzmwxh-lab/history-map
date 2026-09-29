import type {SupabaseClient,User} from '@supabase/supabase-js';
import {allowedStates,validateRecord} from './workflow.mjs';
import {storageObjectPath,validateUpload} from './media.mjs';
export function createWorkspace(root:HTMLElement,sb:SupabaseClient,user:User,zh:boolean){
 const role=user.app_metadata?.role;
 root.replaceChildren();
 const el=(tag:string,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
 const notice=el('p');notice.setAttribute('role','status');root.append(notice);
 if(!['admin','reviewer','contributor'].includes(role)){notice.textContent=zh?'账号尚未获贡献权限，请联系管理员。':'This account has no contributor role. Contact an administrator.';return;}
 const heading=el('h2',zh?'贡献者工作台':'Contributor workspace');
 const toolbar=el('div');toolbar.className='toolbar';
 const newButton=el('button',zh?'新建草稿':'New draft') as HTMLButtonElement;
 const refresh=el('button',zh?'刷新列表':'Refresh') as HTMLButtonElement;
 const list=el('div');list.className='cards';
 const pager=el('div');const previous=el('button',zh?'上一页':'Previous') as HTMLButtonElement;const next=el('button',zh?'下一页':'Next') as HTMLButtonElement;
 pager.append(previous,next);toolbar.append(newButton,refresh);root.append(heading,toolbar,list,pager);
 const dialog=document.createElement('dialog');const form=document.createElement('form');form.className='record-form';dialog.append(form);root.append(dialog);
 let page=0;let busy=false;let selected:any=null;
 const labels:Record<string,string>={title:'标题',kind:'类型',person:'关联人物名称',year:'年代',summary:'摘要',historical_text:'历史档案',reflection_text:'编辑反思',source_citation:'资料来源',status:'状态',visibility:'公开范围',location_precision:'位置精度',public_latitude:'公开纬度',public_longitude:'公开经度',coordinate_system:'坐标系',title_en:'英文标题',summary_en:'英文摘要',historical_text_en:'英文史实',reflection_text_en:'英文反思',english_status:'英文审核状态',review_note:'审核意见'};
 const options:Record<string,string[]>={kind:['places','people','library','routes'],status:allowedStates(role),visibility:['private','public'],location_precision:['hidden','approximate','exact'],coordinate_system:['unknown','WGS84'],english_status:role==='admin'?['untranslated','draft','pending','published','stale']:['untranslated','draft','pending']};
 const statusNames:Record<string,string>={draft:'草稿',pending:'待审核',changes_requested:'需修改',approved:'审核通过',published:'已发布',archived:'已归档',public:'公开',private:'内部',hidden:'隐藏位置',approximate:'模糊位置',exact:'精确位置',places:'地点',people:'人物',library:'资料',routes:'路线',untranslated:'未翻译',stale:'需复核',unknown:'尚未核验'};
 async function verify(){const {data,error}=await sb.auth.getUser();if(error||!data.user||data.user.id!==user.id||data.user.app_metadata?.role!==role)throw new Error(zh?'权限已变化，请重新登录。':'Permissions changed. Sign in again.');}
 async function run(action:()=>Promise<void>){if(busy)return;busy=true;notice.textContent='';root.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=true);try{await verify();await action();}catch(error){notice.textContent=error instanceof Error?error.message:String(error);if(dialog.open){let n=form.querySelector('[role=alert]');if(!n){n=el('p');n.setAttribute('role','alert');form.append(n);}n.textContent=notice.textContent;}}finally{busy=false;root.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=false);previous.disabled=page===0;}}
 async function load(){
  const {data,error}=await sb.from('archive_records').select('id,title,kind,status,updated_at').order('updated_at',{ascending:false}).range(page*20,page*20+19);if(error)throw error;
  list.replaceChildren();for(const row of data||[]){const card=el('article');card.className='card';card.append(el('small',zh?statusNames[row.status]:row.status),el('h3',row.title));const edit=el('button',zh?'打开编辑':'Edit');edit.addEventListener('click',()=>run(async()=>{const {data,error}=await sb.from('archive_records').select('*').eq('id',row.id).single();if(error)throw error;await open(data);}));card.append(edit);list.append(card);}
  if(!data?.length)list.append(el('p',zh?'暂无记录':'No records'));next.hidden=(data?.length||0)<20;
 }
 async function open(row:any=null){
  selected=row;form.replaceChildren();form.append(el('h2',zh?(row?'编辑资料':'新建草稿'):(row?'Edit record':'New draft')));
  for(const key of Object.keys(labels)){
   const label=el('label',zh?labels[key]:key.replaceAll('_',' '));let input:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
   if(options[key]){input=document.createElement('select');const values=[...options[key]];if(row?.[key]&&!values.includes(row[key]))values.unshift(row[key]);for(const option of values){const o=document.createElement('option');o.value=option;o.textContent=zh?(statusNames[option]||option):option;input.append(o);}}
   else if(['summary','historical_text','reflection_text','source_citation','summary_en','historical_text_en','reflection_text_en','review_note'].includes(key)){input=document.createElement('textarea');input.rows=5;}
   else {input=document.createElement('input');if(['year','public_latitude','public_longitude'].includes(key)){input.type='number';input.step=key==='year'?'1':'any';}}
   input.name=key;input.value=String(row?.[key]??({kind:'places',status:'draft',visibility:'private',location_precision:'hidden',coordinate_system:'unknown',english_status:'untranslated'} as Record<string,string>)[key]??'');
   if(key==='title')input.required=true;
   if(role==='contributor'&&['review_note','visibility'].includes(key))input.disabled=true;
   label.append(input);form.append(label);
  }
  const media=el('fieldset');media.className='media-fields';media.append(el('legend',zh?'本地媒体与文献':'Local media and documents'),el('p',zh?'图片 20 MB；音频 100 MB；视频/全景 200 MB；文献 50 MB。文件在保存时上传。':'Images 20 MB; audio 100 MB; video/panoramas 200 MB; documents 50 MB. Files upload when saved.'));
  const assetTypes:{kind:string;label:string;accept:string}[]=[
   {kind:'image',label:zh?'图片':'Images',accept:'image/*'},{kind:'audio',label:zh?'音频':'Audio',accept:'audio/*'},
   {kind:'video',label:zh?'视频':'Video',accept:'video/*'},{kind:'panorama',label:zh?'全景图片 / 视频':'Panorama image / video',accept:'image/*,video/*'},
   {kind:'document',label:zh?'文献':'Documents',accept:'.pdf,.doc,.docx,.rtf,.txt,.md'}
  ];
  for(const type of assetTypes){const label=el('label',type.label);const input=document.createElement('input');input.type='file';input.name=`asset-${type.kind}`;input.accept=type.accept;input.multiple=true;label.append(input);media.append(label);}
  if(row){const {data,error}=await sb.from('archive_assets').select('id,kind,file_name,caption').eq('record_id',row.id).order('sort_order');if(error)throw error;const current=el('div');current.className='asset-list';current.append(el('strong',zh?'已上传文件':'Uploaded files'));for(const asset of data||[])current.append(el('p',`${asset.kind} · ${asset.caption||asset.file_name||asset.id}`));if(!data?.length)current.append(el('p',zh?'暂无媒体':'No media yet'));media.append(current);}
  form.append(media);
  const save=el('button',zh?'保存':'Save') as HTMLButtonElement;save.type='submit';const cancel=el('button',zh?'取消':'Cancel') as HTMLButtonElement;cancel.type='button';cancel.addEventListener('click',()=>dialog.close());form.append(save,cancel);dialog.showModal();
 }
 form.addEventListener('submit',event=>{event.preventDefault();run(async()=>{
  const payload:any={};for(const key of Object.keys(labels)){const input=form.elements.namedItem(key) as HTMLInputElement;if(input.disabled)continue;const val=input.value.trim();payload[key]=['year','public_latitude','public_longitude'].includes(key)?(val===''?null:Number(val)):val;}
  validateRecord(payload);
  const files=[...form.querySelectorAll<HTMLInputElement>('input[type=file]')].flatMap(input=>[...(input.files||[])].map(file=>({kind:input.name.slice(6),file})));
  let query=sb.from('archive_records');const result=selected?await query.update(payload).eq('id',selected.id).eq('updated_at',selected.updated_at).select('id,updated_at').single():await query.insert({...payload,created_by:user.id}).select('id,updated_at').single();
  if(result.error)throw result.error;const recordId=result.data.id;selected={...(selected||{}),...result.data};const publish=role==='admin'&&payload.status==='published'&&payload.visibility==='public';
  if(role==='admin'){const visibility=await sb.from('archive_assets').update({is_public:publish}).eq('record_id',recordId);if(visibility.error)throw visibility.error;}
  for(const item of files){validateUpload(item.kind,item.file);const path=storageObjectPath(user.id,recordId,item.kind,item.file.name,crypto.randomUUID());const uploaded=await sb.storage.from('history-media').upload(path,item.file,{contentType:item.file.type,upsert:false});if(uploaded.error)throw uploaded.error;const asset=await sb.from('archive_assets').insert({record_id:recordId,kind:item.kind,bucket:'history-media',object_path:path,file_name:item.file.name,mime_type:item.file.type,byte_size:item.file.size,is_public:publish,created_by:user.id});if(asset.error){await sb.storage.from('history-media').remove([path]);throw asset.error;}}
  dialog.close();await load();notice.textContent=files.length?(zh?'资料与文件已保存。':'Record and files saved.'):(zh?'已保存。':'Saved.');
 });});
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 newButton.addEventListener('click',()=>run(async()=>{await open();}));refresh.addEventListener('click',()=>run(load));previous.addEventListener('click',()=>run(async()=>{page=Math.max(0,page-1);await load();}));next.addEventListener('click',()=>run(async()=>{page++;await load();}));
 run(load);
 if(role==='admin'){
  const invite=document.createElement('form');invite.className='card';invite.append(el('h3',zh?'邀请贡献者':'Invite a contributor'));
  const email=document.createElement('input');email.type='email';email.required=true;email.placeholder=zh?'受邀者邮箱':'Invitee email';email.setAttribute('aria-label',email.placeholder);
  const choice=document.createElement('select');for(const r of ['contributor','reviewer']){const o=document.createElement('option');o.value=r;o.textContent=zh?(r==='reviewer'?'审核员':'贡献者'):r;choice.append(o);}
  choice.setAttribute('aria-label',zh?'受邀角色':'Invited role');const send=el('button',zh?'发送邀请邮件':'Send invitation') as HTMLButtonElement;send.type='submit';invite.append(email,choice,send);root.append(invite);
  invite.addEventListener('submit',event=>{event.preventDefault();run(async()=>{const {data}=await sb.auth.getSession();const response=await fetch('/api/invite',{method:'POST',headers:{Authorization:`Bearer ${data.session?.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({email:email.value.trim(),role:choice.value})});if(!response.ok)throw new Error(zh?'邀请未完成，请检查服务配置或该账号是否已存在。':'Invitation failed. Check service configuration or whether this account already exists.');notice.textContent=zh?'邀请邮件已发送。':'Invitation sent.';invite.reset();});});
 }
}
