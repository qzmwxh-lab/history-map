import collection from '../../public/research/collection.json' with { type: 'json' };

export const { subjects, sources } = collection;
export const sourceById = new Map(sources.map(source => [source.id, source]));
export function videoSource(subject) {
  return subject.video ? sourceById.get(subject.video.refs[0]) : null;
}
export function verificationLabel(value) {
  if (value === 'page_checked') return '页面已核读';
  if (value.includes('catalogue_checked')) return '目录已核；全文未读';
  if (value.includes('playback_not_tested')) return '项目页已核；播放未测';
  return '线索待进一步核验';
}
