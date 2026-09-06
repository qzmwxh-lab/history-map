const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

test('service worker activation preserves caches belonging to other apps and paths', async () => {
  const handlers = {};
  const deleted = [];
  let completion;
  vm.runInNewContext(fs.readFileSync('sw.js', 'utf8'), {
    URL,
    self: { registration: { scope: 'https://example.com/history-map/' }, addEventListener: (name, handler) => { handlers[name] = handler; }, clients: { claim() {} } },
    caches: { keys: async () => ['another-app', 'history-map:/other/:v1', 'history-map:/history-map/:v1', 'history-map:/history-map/:v3', 'history-map:/history-map/:v4'], delete: async key => { deleted.push(key); } },
  });
  handlers.activate({ waitUntil: promise => { completion = promise; } });
  await completion;
  assert.deepEqual(deleted, ['history-map:/history-map/:v1', 'history-map:/history-map/:v3']);
});
