import { z } from 'zod';
import { galaxies } from './interests.js';
import { skills } from './discovery.js';
export const publisher = profile => ['company','entrepreneur'].includes(profile?.account_type);
const galaxyIds=galaxies.filter(g=>g.id!=='explore').map(g=>g.id);
export const communityQuery=z.strictObject({
  kind:z.enum(['challenge','job']).default('challenge'),
  scope:z.enum(['all','recommended','saved','mine']).default('all'),
  galaxy:z.enum(['all',...galaxyIds]).default('all'),
});
export const postId=z.uuid();
export const practiceBody=z.strictObject({
  proposal:z.string().trim().min(30).max(5000),
  reflection:z.string().trim().min(15).max(1000),
});
export const publicationBody=z.strictObject({
  kind:z.enum(['challenge','job']),title:z.string().trim().min(6).max(120),
  description:z.string().trim().min(30).max(2500),
  deliverable:z.string().trim().min(10).max(1000),
  effort:z.string().trim().min(2).max(100),
  compensation:z.string().trim().min(2).max(200),
  level:z.enum(['beginner','intermediate','all']),
  mode:z.enum(['online','in_person','hybrid']),
  galaxies:z.array(z.enum(galaxyIds)).min(1).max(3).refine(a=>new Set(a).size===a.length),
  skills:z.array(z.enum(skills.map(s=>s.id))).max(6).refine(a=>new Set(a).size===a.length),
  deadline:z.iso.datetime().refine(v=>Date.parse(v)>Date.now() && Date.parse(v)<Date.now()+365*86400000,'El cierre debe estar entre hoy y el próximo año.'),
});
export function filterCommunity(posts, interests, saved, query) {
  const chosen=interests?.galaxies??[];
  return posts.filter(p=>p.kind===query.kind && (query.galaxy==='all'||p.galaxies.includes(query.galaxy)))
    .map(p=>({...p,saved:saved.includes(p.id),matches:p.galaxies.filter(g=>chosen.includes(g))}))
    .filter(p=>query.scope!=='saved'||p.saved)
    .filter(p=>query.scope!=='recommended'||chosen.includes('explore')||p.matches.length)
    .sort((a,b)=>b.matches.length-a.matches.length||Date.parse(a.deadline)-Date.parse(b.deadline));
}
