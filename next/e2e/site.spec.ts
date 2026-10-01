import {test,expect} from '@playwright/test';
const record={id:'test-record',title:'广州档案测试',person:'测试人物',year:1807,summary:'测试内容',status:'published',visibility:'public',coordinate_system:'WGS84',public_latitude:23,public_longitude:113};
test('published catalog filters safely on desktop and mobile',async({page})=>{
 await page.route('**/rest/v1/public_atlas*',r=>r.fulfill({json:[record,{...record,title:'<img src=x onerror=alert(1)>',id:'unsafe'}]}));
 await page.goto('/zh/map/');
 await expect(page.locator('.card')).toHaveCount(2);
 await expect(page.locator('.card img')).toHaveCount(0);
 await page.locator('#search').fill('广州');
 await expect(page.locator('.card')).toHaveCount(1);
 await page.locator('#year').fill('1700');
 await expect(page.locator('#status')).toHaveText('没有匹配的公开资料');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('failed request can be retried and is not shown as empty content',async({page})=>{
 let requests=0;
 await page.route('**/rest/v1/public_archive*',r=>++requests===1?r.fulfill({status:503,json:{}}):r.fulfill({json:[record]}));
 await page.goto('/zh/people/');
 await expect(page.locator('#status')).toHaveText('暂时无法读取资料，请重试。');
 await page.locator('#retry').click();
 await expect(page.locator('.card')).toHaveCount(1);
});
test('reading pages do not load map JavaScript and retain language navigation',async({page})=>{
 const scripts:string[]=[];page.on('request',r=>{if(r.resourceType()==='script')scripts.push(r.url());});
 await page.route('**/rest/v1/public_archive*',r=>r.fulfill({json:[]}));
 await page.goto('/en/library/');
 await expect(page.locator('h1')).toHaveText('Library');
 await expect(page.locator('.account a').first()).toHaveAttribute('href','/zh/library/');
 expect(scripts.some(s=>s.includes('leaflet'))).toBe(false);
});
test('public pages are indexable while the contributor login stays private',async({page})=>{
 await page.route('**/rest/v1/public_archive*',r=>r.fulfill({json:[]}));
 await page.goto('/zh/library/');
 await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','index,follow');
 await page.goto('/zh/login/');
 await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex,nofollow');
});
test('login rejects invalid credentials without exposing password or granting access',async({page})=>{
 await page.route('**/auth/v1/token*',r=>r.fulfill({status:400,json:{error:'invalid_grant',error_description:'Invalid credentials'}}));
 await page.goto('/zh/login/');
 await page.locator('#login-form [name=email]').fill('test@example.com');
 await page.locator('#login-form [name=password]').fill('incorrect-password');
 await page.locator('#login-form [type=submit]').click();
 await expect(page.locator('#auth-status')).toContainText('登录失败');
 await expect(page.locator('#login-form [name=password]')).toHaveValue('');
 await expect(page.locator('#signed-in')).toBeHidden();
});
test('record details separate reflection and disclose missing translation',async({page})=>{
 await page.route('**/rest/v1/public_archive?*',r=>r.fulfill({json:[{...record,historical_text:'<script>alert(1)</script>',reflection_text:'编辑反思',source_citation:'档案来源'}]}));
 await page.route('**/rest/v1/public_archive_assets*',r=>r.fulfill({json:[]}));
 await page.route('**/rest/v1/public_archive_links*',r=>r.fulfill({json:[]}));
 await page.goto('/en/record/?id=test-record');
 await expect(page.locator('#record-title')).toHaveText(record.title);
 await expect(page.locator('#translation-notice')).toContainText('Chinese original');
 await expect(page.locator('#history')).toHaveText('<script>alert(1)</script>');
 await expect(page.locator('#history script')).toHaveCount(0);
 await expect(page.locator('#reflection')).toHaveText('编辑反思');
});
test('record details render approved managed media and reject unsafe legacy URLs',async({page})=>{
 await page.route('**/rest/v1/public_archive?*',r=>r.fulfill({json:[{...record,historical_text:'史实',reflection_text:'',source_citation:'档案来源'}]}));
 await page.route('**/rest/v1/public_archive_assets*',r=>r.fulfill({json:[
  {id:'asset-1',record_id:record.id,kind:'image',bucket:'history-media',object_path:'owner/record/image/档案 1.jpg',file_name:'档案 1.jpg',mime_type:'image/jpeg',caption:'历史照片'},
  {id:'asset-2',record_id:record.id,kind:'document',external_url:'javascript:alert(1)',file_name:'unsafe.pdf'}
 ]}));
 await page.route('**/rest/v1/public_archive_links*',r=>r.fulfill({json:[]}));
 await page.goto('/zh/record/?id=test-record');
 await expect(page.locator('#record-media img')).toHaveCount(1);
 await expect(page.locator('#record-media img')).toHaveAttribute('alt','历史照片');
 await expect(page.locator('#record-media a')).toHaveCount(0);
});
test('record details reject unpublished records even on an incorrect API response',async({page})=>{
 await page.route('**/rest/v1/public_archive*',r=>r.fulfill({json:[{...record,status:'draft'}]}));
 await page.goto('/zh/record/?id=test-record');
 await expect(page.locator('#record-content')).toBeHidden();
 await expect(page.locator('#record-status')).toHaveText('档案尚未公开或不存在。');
});
