import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { subjects, sources, sourceById, videoSource } from '../src/lib/research.mjs';

test('research collection covers every researched person and distinguishes the group', () => {
  assert.equal(subjects.length, 20);
  assert.equal(subjects.filter(s => s.kind === 'person').length, 19);
  assert.equal(subjects.filter(s => s.kind === 'group').length, 1);
  assert.equal(sources.length, 68);
  assert.equal(new Set(subjects.map(s => s.slug)).size, 20);
  assert.equal(sourceById.size, 68);
});
test('all references, HTTPS sources and downloadable summaries resolve', () => {
  for (const source of sources) assert.equal(new URL(source.url).protocol, 'https:');
  for (const subject of subjects) {
    assert.match(subject.slug, /^[a-z0-9_-]+$/);
    for (const id of subject.refs) assert.ok(sourceById.has(id), id);
    for (const [year, fact, id] of subject.timeline) {
      assert.ok(year && fact);
      assert.ok(subject.refs.includes(id), `${subject.slug}: ${id}`);
    }
    for (const id of subject.video?.refs || []) assert.ok(subject.refs.includes(id));
    assert.ok(!('latitude' in subject) && !('longitude' in subject));
    assert.ok(!('playbackUrl' in subject));
    const notes = readFileSync(new URL(`../public/research/${subject.slug}.md`, import.meta.url), 'utf8');
    assert.ok(notes.includes(subject.name));
    for (const id of subject.refs) assert.ok(notes.includes(sourceById.get(id).url));
  }
  assert.equal(videoSource(subjects.find(s => s.slug === 'daniel-nelson')), null);
});
