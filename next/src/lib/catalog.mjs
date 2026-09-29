export const sections = ['map', 'places', 'people', 'library', 'routes'];
export const labels = {
  zh: { map:'探索地图', places:'历史地点', people:'人物故事', library:'历史资料', routes:'足迹路线', login:'贡献者登录', search:'搜索地点、人物与年代', loading:'正在读取已发布资料…', empty:'没有匹配的公开资料', error:'暂时无法读取资料，请重试。', retry:'重新加载', sources:'参考资料', pending:'来源待核验', read:'查看历史档案', intro:'沿着地图，重访跨越时代的足迹。' },
  en: { map:'Explore', places:'Places', people:'People', library:'Library', routes:'Routes', login:'Contributor sign in', search:'Search places, people and years', loading:'Loading published records…', empty:'No matching public records', error:'Unable to load records. Please try again.', retry:'Retry', sources:'Sources', pending:'Sources awaiting verification', read:'Read historical record', intro:'Explore the places where lives and history meet.' }
};
// Only explicitly reviewed public coordinates may leave the server in v2.
// Legacy data requires coordinate and disclosure review before migration.
export function publicPoint(row, lang='zh') {
  if (row.status !== 'published' || row.visibility !== 'public') return null;
  return { id:row.id, title:(lang==='en'&&row.title_en?row.title_en:row.title) || '', person:row.person || '', year:row.year,
    summary:(lang==='en'&&row.title_en?row.summary_en:row.summary) || '', latitude:row.public_latitude, longitude:row.public_longitude,
    precision:row.location_precision, source:row.source_citation || '',
    coordinateSystem:row.coordinate_system, kind:row.kind || 'places' };
}
export function filterPoints(rows, query, before) {
  const term = query.trim().toLocaleLowerCase();
  return rows.filter(p => (!before || (p.year != null && Number(p.year) <= Number(before))) &&
    `${p.title} ${p.person} ${p.year ?? ''}`.toLocaleLowerCase().includes(term));
}
export function safeLink(value) {
  try { const u = new URL(value); return ['https:','http:'].includes(u.protocol) ? u.href : null; }
  catch { return null; }
}
