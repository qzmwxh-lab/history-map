import test from 'node:test';
import assert from 'node:assert/strict';
import { publicPoint, filterPoints, safeLink } from '../src/lib/catalog.mjs';
test('unpublished and private records never become public points',()=>{
 assert.equal(publicPoint({status:'draft',visibility:'public'}),null);
 assert.equal(publicPoint({status:'published',visibility:'private'}),null);
});
test('public projection never exposes original sensitive coordinates',()=>{
 const p=publicPoint({status:'published',visibility:'public',latitude:31.12345,longitude:120.12345,public_latitude:31,public_longitude:120});
 assert.equal(p.latitude,31); assert.equal(p.longitude,120); assert.equal('original_latitude' in p,false);
});
test('search and year filters combine',()=>{
 const rows=[{title:'广州',person:'马礼逊',year:1807},{title:'上海',person:'其他',year:1900}];
 assert.equal(filterPoints(rows,'马礼逊','1850').length,1);
 assert.equal(filterPoints(rows,'马礼逊','1800').length,0);
});
test('unsafe media links rejected',()=>{assert.equal(safeLink('javascript:alert(1)'),null);assert.equal(safeLink('https://example.com/a'),'https://example.com/a');});
