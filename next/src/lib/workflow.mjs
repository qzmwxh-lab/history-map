export const states = ['draft','pending','changes_requested','approved','published','archived'];
export const roles = ['contributor','reviewer','admin'];
export function allowedStates(role) {
 if(role === 'admin') return states;
 if(role === 'reviewer') return ['draft','pending','changes_requested','approved'];
 return ['draft','pending'];
}
export function validateRecord(record) {
 if(!record.title?.trim()) throw new Error('请填写标题 / Title is required');
 if(!['places','people','library','routes'].includes(record.kind)) throw new Error('内容类型无效 / Invalid type');
 if(record.year != null && (!Number.isInteger(Number(record.year)) || Number(record.year)<1 || Number(record.year)>2100)) throw new Error('年代无效 / Invalid year');
 if(record.status === 'published' && !record.source_citation?.trim()) throw new Error('发布前请补充资料来源 / A source is required to publish');
 if(record.location_precision === 'hidden' && (record.public_latitude != null || record.public_longitude != null)) throw new Error('隐藏地点不能包含公开坐标 / Hidden locations cannot have public coordinates');
 if((record.public_latitude == null)!==(record.public_longitude == null)) throw new Error('请同时填写经纬度 / Both coordinates are required');
 if(record.public_latitude != null && (!Number.isFinite(record.public_latitude)||!Number.isFinite(record.public_longitude)||Math.abs(record.public_latitude)>90||Math.abs(record.public_longitude)>180||record.coordinate_system!=='WGS84')) throw new Error('请核实标准坐标 / Verify WGS84 coordinates');
 return record;
}
