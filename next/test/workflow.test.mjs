import test from 'node:test';import assert from 'node:assert/strict';
import {allowedStates,validateRecord} from '../src/lib/workflow.mjs';
const record={title:'资料',kind:'places',status:'draft',location_precision:'hidden',public_latitude:null,public_longitude:null};
test('reviewers can select draft for their own new records',()=>assert.equal(allowedStates('reviewer').includes('draft'),true));
test('contributors and reviewers cannot publish through workflow controls',()=>{assert.deepEqual(allowedStates('contributor'),['draft','pending']);assert.equal(allowedStates('reviewer').includes('published'),false);assert.equal(allowedStates('admin').includes('published'),true);});
test('published content requires sources',()=>assert.throws(()=>validateRecord({...record,status:'published'})));
test('hidden locations must not contain coordinates',()=>assert.throws(()=>validateRecord({...record,public_latitude:30,public_longitude:120,coordinate_system:'WGS84'})));
test('unknown coordinate systems and invalid numbers are rejected',()=>{
 assert.throws(()=>validateRecord({...record,location_precision:'exact',public_latitude:30,public_longitude:120,coordinate_system:'unknown'}));
 assert.throws(()=>validateRecord({...record,year:NaN}));
});
