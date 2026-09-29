import test from 'node:test';import assert from 'node:assert/strict';
import {publicAssetUrl,storageObjectPath,validateUpload} from '../src/lib/media.mjs';
test('upload validation enforces type and size for each media class',()=>{
 assert.equal(validateUpload('image',{type:'image/jpeg',size:1024}).size,1024);
 assert.throws(()=>validateUpload('document',{type:'video/mp4',size:1024}));
 assert.throws(()=>validateUpload('image',{type:'image/png',size:21*1024*1024}));
});
test('storage paths stay inside the signed-in user and record folders',()=>{
 const path=storageObjectPath('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','document','../ 档案 1.pdf','nonce');
 assert.equal(path,'00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002/document/nonce-档案-1.pdf');
});
test('public asset URLs accept only the managed bucket or safe legacy links',()=>{
 assert.equal(publicAssetUrl('https://demo.supabase.co',{bucket:'history-media',object_path:'a/文献 1.pdf'}),'https://demo.supabase.co/storage/v1/object/public/history-media/a/%E6%96%87%E7%8C%AE%201.pdf');
 assert.equal(publicAssetUrl('https://demo.supabase.co',{bucket:'other',object_path:'a.pdf'}),null);
 assert.equal(publicAssetUrl('https://demo.supabase.co',{external_url:'javascript:alert(1)'}),null);
});
