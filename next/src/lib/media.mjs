const MB=1024*1024;
export const mediaRules={
 image:{limit:20*MB,accept:type=>type.startsWith('image/')},
 audio:{limit:100*MB,accept:type=>type.startsWith('audio/')},
 video:{limit:200*MB,accept:type=>type.startsWith('video/')},
 panorama:{limit:200*MB,accept:type=>type.startsWith('image/')||type.startsWith('video/')},
 document:{limit:50*MB,accept:type=>['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/rtf','text/plain','text/markdown'].includes(type)}
};
export function validateUpload(kind,file){
 const rule=mediaRules[kind];
 if(!rule||!file||!rule.accept(file.type||'')||file.size<=0||file.size>rule.limit)throw new Error('文件类型或大小不符合要求 / Unsupported file type or size');
 return file;
}
export function storageObjectPath(userId,recordId,kind,fileName,nonce){
 if(!/^[0-9a-f-]{36}$/i.test(userId)||!/^[0-9a-f-]{36}$/i.test(recordId)||!mediaRules[kind])throw new Error('Invalid upload path');
 const safe=String(fileName||'file').normalize('NFKC').replace(/[^\p{L}\p{N}._-]+/gu,'-').replace(/^[-.]+/,'').slice(-100)||'file';
 return `${userId}/${recordId}/${kind}/${nonce}-${safe}`;
}
export function publicAssetUrl(base,asset){
 if(asset.external_url){try{const url=new URL(asset.external_url);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}}
 if(asset.bucket!=='history-media'||!asset.object_path)return null;
 const root=new URL(base);const path=asset.object_path.split('/').map(encodeURIComponent).join('/');
 return new URL(`/storage/v1/object/public/history-media/${path}`,root).href;
}
