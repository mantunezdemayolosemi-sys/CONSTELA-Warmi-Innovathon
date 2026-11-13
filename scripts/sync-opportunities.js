import { writeFile } from 'node:fs/promises';
import { createOpportunityCatalog } from '../src/opportunities.js';
const catalog=createOpportunityCatalog();
await catalog.load();
const result=await catalog.sync();
if (process.argv.includes('--snapshot') && result.sources.every(s=>s.status==='ok')) {
  const {cache_saved,...snapshot}=result;
  await writeFile(new URL('../data/opportunities.json',import.meta.url),JSON.stringify(snapshot,null,2)+'\n');
}
for (const source of result.sources) console.log(`${source.name}: ${source.status}`);
console.log(`${result.items.length} oportunidades vigentes; caché guardada: ${result.cache_saved}`);
if (result.sources.some(s=>s.status!=='ok') || !result.cache_saved) process.exitCode=1;
