const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const security = require('../security.js');
const index = fs.readFileSync('index.html', 'utf8');
const vr = fs.readFileSync('vr.html', 'utf8');

function fragment(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, 'application function exists');
  return source.slice(from, to);
}

test('drawer renders malicious fields as text and navigation preserves apostrophes', () => {
  const dom = new JSDOM('<div id="dWTitle"></div><div id="drawerAdminBtns"></div><div id="dWBody"></div><div id="drawer"></div>', { url: 'https://example.com/history-map/' });
  const APP = { lang: 'en', isSuperAdmin: false };
  let navigation;
  APP.openNavigation = (...args) => { navigation = args; };
  const point = { n: "Xi'an <img src=x onerror=alert(1)>", w: '<svg onload=alert(1)>', d: '<script>alert(1)</script>', la: 34, ln: 108, y: 635, doc_url: 'javascript:alert(1)', img: 'javascript:alert(1)' };
  const source = fragment(index, '  APP.openDrawer =', '  APP.editCurrentPointFromDrawer =');
  new Function('APP', 'document', 'location', 'escapeHtml', 'safeMediaUrl', 'I18N', source)(APP, dom.window.document, dom.window.location, security.escapeHtml, security.safeMediaUrl, { en: { pioneerLabel: 'Person', navRouteBtn: 'Navigate', navAmapBtn: 'Map' } });
  APP.openDrawer(point);
  assert.equal(dom.window.document.querySelectorAll('script,img,svg,iframe').length, 0);
  assert.ok(dom.window.document.getElementById('dWBody').textContent.includes(point.d));
  dom.window.document.getElementById('drawer-nav-btn').click();
  assert.deepEqual(navigation, [34, 108, point.n]);
  dom.window.close();
});

test('pending audit entries cannot inject HTML or inline event handlers', () => {
  const dom = new JSDOM('<table><tbody id="auditTbody"></tbody></table>');
  let approved;
  const id = "id' onclick='alert(1)";
  const APP = { points: [{ id, n: '<img src=x onerror=alert(1)>', w: '<svg onload=alert(1)>', status: 'pending' }], approvePoint: value => { approved = value; }, deletePoint() {} };
  new Function('APP', 'document', 'escapeHtml', fragment(index, '  APP.renderAuditList =', '  APP.approvePoint ='))(APP, dom.window.document, security.escapeHtml);
  APP.renderAuditList();
  assert.equal(dom.window.document.querySelectorAll('img,svg,[onclick],[onerror]').length, 0);
  dom.window.document.querySelector('[data-approve-id]').click();
  assert.equal(approved, id);
  dom.window.close();
});

test('scene sorting uses one atomic request and restores order after rejection', async () => {
  const original = [{ id: 1, sort_order: 1 }, { id: 2, sort_order: 2 }];
  const calls = [];
  const body = fragment(vr, 'async function reorderScenes(', 'function renderHotspotList(');
  const run = new Function('sb', `let scenes = ${JSON.stringify(original)}; const currentWorkId = 9; function renderSceneList() {} function markSelfUpdate() {} function toast() {} ${body}; return {reorderScenes, state: () => scenes};`);
  const api = run({ rpc: async (...args) => { calls.push(args); return { error: { message: 'Denied' } }; } });
  await api.reorderScenes(1, 2);
  assert.deepEqual(calls, [['reorder_vr_scenes', { p_work_id: 9, p_scene_ids: [2, 1] }]]);
  assert.deepEqual(api.state(), original);
});

test('successful empty cloud result clears stale map records', async () => {
  let renders = 0;
  const APP = { points: [{ id: 'stale' }], isSuperAdmin: false, renderAll: () => { renders++; } };
  const query = { select() { return this; }, order() { return this; }, eq() { return this; }, then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); } };
  new Function('APP', 'supabase', 'isCloudMode', fragment(index, '  APP.loadPointsFromCloud =', '  APP.updateDashboardUI ='))(APP, { from: () => query }, true);
  await APP.loadPointsFromCloud();
  assert.deepEqual(APP.points, []);
  assert.equal(renders, 1);
});
