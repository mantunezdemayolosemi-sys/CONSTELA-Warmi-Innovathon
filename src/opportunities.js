import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';
import { galaxies } from './interests.js';
import { skills } from './discovery.js';

const hours = 3600000;
export const syncInterval = 12 * hours;
const maxAge = 7 * 24 * hours;
const agentName = 'ConstelaOpportunities';
const dateValue = z.string().refine(v => /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v) && Number.isFinite(Date.parse(v)));
export function safePublicUrl(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || !u.hostname.includes('.') ||
        /(^[\d.]+$|:|(^|\.)(localhost|local|internal|test|invalid)$)/i.test(u.hostname)) return null;
    u.hash = '';
    return u.href;
  } catch { return null; }
}
const opportunitySchema = z.object({
  id: z.string().min(1).max(100), title: z.string().min(1).max(200),
  url: z.string().refine(v => !!safePublicUrl(v)), source_id: z.enum(['mlh', 'ghw', 'hack0']),
  source_url: z.string().refine(v => !!safePublicUrl(v)).optional(),
  type: z.enum(['hackathon', 'event', 'challenge']),
  galaxies: z.array(z.enum(galaxies.filter(g => g.id !== 'explore').map(g => g.id))).max(11),
  starts_at: dateValue.nullable(), ends_at: dateValue,
  mode: z.enum(['online', 'in_person', 'hybrid', 'unknown']),
  location: z.string().max(180), deadline: dateValue.nullable(),
  country: z.string().regex(/^[A-Z]{2}$/).nullable().default(null),
  city: z.string().max(80).nullable().default(null),
  checked_at: z.iso.datetime(),
});
const sourceState = z.object({
  id: z.enum(['mlh', 'ghw', 'hack0']), name: z.string(), url: z.string().refine(v => !!safePublicUrl(v)),
  checked_at: z.iso.datetime().nullable(), succeeded_at: z.iso.datetime().nullable(),
  status: z.enum(['ok', 'partial', 'unavailable', 'blocked']),
});
const snapshotSchema = z.object({ version: z.literal(1), items: z.array(opportunitySchema).max(1000), sources: z.array(sourceState).max(3) });

export const opportunitiesQuery = z.strictObject({
  scope: z.enum(['recommended','all']).default('recommended'),
  type: z.enum(['all','hackathon','event','challenge']).default('all'),
  mode: z.enum(['all','online','in_person','hybrid']).default('all'),
});
export function endTimestamp(value) {
  // Una fecha sin hora no informa zona horaria: conservar hasta terminar el día mundialmente.
  return Date.parse(value.length === 10 ? `${value}T23:59:59-12:00` : value);
}
export function inLima(opportunity) {
  return opportunity.country === 'PE' && opportunity.city === 'lima' && ['in_person','hybrid'].includes(opportunity.mode);
}
export function recommend(snapshot, interests, discovery, filters, now = Date.now()) {
  const selected = interests?.galaxies ?? [];
  const exploring = selected.includes('explore');
  const byId = new Map(galaxies.map(g => [g.id,g.name]));
  const skillNames = discovery?.result?.highlighted.map(id => skills.find(s => s.id === id)?.name).filter(Boolean) ?? [];
  const items = snapshot.items.filter(o => inLima(o) && endTimestamp(o.ends_at) >= now &&
      now - Date.parse(o.checked_at) <= maxAge &&
      (filters.type === 'all' || o.type === filters.type) &&
      (filters.mode === 'all' || o.mode === filters.mode))
    .map(o => {
      const matched = o.galaxies.filter(id => selected.includes(id));
      return { ...o, matched_galaxies: matched,
        reason: exploring ? 'Elegiste explorar todas las galaxias.' : matched.length
          ? `Coincide con ${matched.map(id => byId.get(id)).join(' y ')}.` : 'Una posibilidad fuera de tus galaxias actuales.',
        practice: ['challenge','hackathon'].includes(o.type) && skillNames.length
          ? `En tus decisiones apareció: ${skillNames.join(' · ')}. Podrías explorar cómo aplicarlo en equipo; no es un requisito de esta convocatoria.` : null,
        stale: now - Date.parse(o.checked_at) > 24 * hours,
      };
    }).filter(o => filters.scope === 'all' || exploring || o.matched_galaxies.length)
    .sort((a,b) => b.matched_galaxies.length - a.matched_galaxies.length ||
      Date.parse(a.starts_at ?? a.ends_at) - Date.parse(b.starts_at ?? b.ends_at) || a.title.localeCompare(b.title));
  return { items, sources: snapshot.sources.filter(s=>s.id==='hack0'), interests, area:'Lima, Perú',
    coverage: 'Demo de Lima Metropolitana, Perú. Agenda pública de hack0 y enlaces a los organizadores. Solo sedes presenciales o híbridas identificadas en Lima; cobertura principalmente tecnológica.' };
}

const text = value => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|apos|#39|nbsp);/g,
  s => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'",'&nbsp;':' '})[s]).replace(/\s+/g,' ').trim();
const clean = (value, length) => text(value).replace(/&#(x[\da-f]+|\d+);/gi, (_,code)=>{
  const number=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):Number(code);
  return number>0 && number<=0x10ffff ? String.fromCodePoint(number) : '';
}).slice(0,length);
const normalize = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z\s]/g,' ').replace(/\s+/g,' ').trim();
const limaDistricts = ['lima','lima metropolitana','miraflores','san isidro','barranco','magdalena del mar','san miguel','la molina','surco','santiago de surco','lince','jesus maria','pueblo libre','rimac','ate','brena','san borja','la victoria','san luis','surquillo','san juan de miraflores','san juan de lurigancho','villa el salvador','villa maria del triunfo','santa anita','el agustino','los olivos','independencia','comas','san martin de porres','carabayllo','puente piedra','ancon','santa rosa','cieneguilla','pachacamac','lurin','pucusana','punta hermosa','punta negra','san bartolo','santa maria del mar','chorrillos','chaclacayo','lurigancho','chosica'];
function limaLocality(locality, context='') {
  if (/\b(canete|huaral|huacho|barranca|huarochiri|yauyos|canta|oyon)\b/.test(normalize(context))) return false;
  const city=normalize(locality);
  return limaDistricts.some(d=>[d,`${d} lima`,`${d} lima peru`,`${d} peru`].includes(city));
}
const topics = {
  design: /\b(design|creative|creatividad|diseno|ux|ui)\b/,
  business: /\b(business|entrepreneurship|emprendimiento|startup|fintech|negocios|capital|finanzas|financiamiento)\b/,
  science: /\b(science|research|ciencia|investigacion|nasa|space apps)\b/,
  social: /\b(social good|community|comunidad|inclusion|accessibility|hacking for good)\b/,
  marketing: /\b(marketing|communication|comunicacion|publicidad)\b/,
  sustainability: /\b(climate|sustainability|sostenibilidad|environment|green|conservation)\b/,
  health: /\b(health|wellness|salud|medical|bienestar)\b/,
  education: /\b(education|learning|educacion|ensenanza)\b/,
  data: /\b(data|datos|analytics|analysis|analisis)\b/,
  arts: /\b(arts|culture|cultura|music|musica)\b/,
};
export function classify(value) {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return ['technology', ...Object.entries(topics).filter(([,pattern]) => pattern.test(normalized)).map(([id]) => id)];
}
function item(source, fields, checkedAt) {
  const parsed = opportunitySchema.safeParse({
    ...fields, id: createHash('sha256').update(fields.url).digest('hex').slice(0,24),
    source_id: source, deadline: null, checked_at: checkedAt,
  });
  return parsed.success ? parsed.data : null;
}
export function parseMlh(html, checkedAt) {
  const raw = html.match(/<script\b[^>]*data-page="app"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!raw) throw new Error('SOURCE_CHANGED');
  const events = JSON.parse(raw)?.props?.upcomingEvents;
  if (!Array.isArray(events)) throw new Error('SOURCE_CHANGED');
  const items = events.map(e => item('mlh', {
    title: clean(e.name,200), url: safePublicUrl(e.websiteUrl) ?? safePublicUrl(new URL(e.url, 'https://www.mlh.com').href),
    type: 'hackathon', starts_at: e.startsAt ?? null, ends_at: e.endsAt,
    mode: ({physical:'in_person',digital:'online',hybrid:'hybrid',hybrid_physical:'hybrid',hybrid_digital:'hybrid'})[e.formatType] ?? 'unknown',
    location: clean([e.location,e.venueAddress?.country].filter(Boolean).join(', '),180) || 'Lugar por confirmar',
    galaxies: classify(`${e.name} ${(e.customFields?.hackathon_focus ?? []).join(' ')}`),
  }, checkedAt)).filter(Boolean);
  if (events.length && !items.length) throw new Error('SOURCE_CHANGED');
  return items;
}
export function parseGhw(html, checkedAt) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const cards = [...html.matchAll(/<a\b[^>]*href="(\.\/events\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  const result = cards.map(([,href,body]) => {
    const paragraphs = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m => text(m[1]));
    const date = paragraphs.find(p => new RegExp(`^(${months.join('|')}) \\d`).test(p));
    const match = date?.match(/^(\w+) (\d{1,2})(?:st|nd|rd|th)?\s*[-–]\s*(\d{1,2})(?:st|nd|rd|th)?, (\d{4})$/);
    if (!match || !paragraphs[0]) return null;
    const [,month,first,last,year] = match;
    const prefix = `${year}-${String(months.indexOf(month)+1).padStart(2,'0')}-`;
    return item('ghw', {
      title: clean(`Global Hack Week: ${paragraphs[0]}`,200), url: new URL(href,'https://ghw.mlh.com/').href,
      type:'event', starts_at: prefix+first.padStart(2,'0'), ends_at: prefix+last.padStart(2,'0'),
      mode:'online', location:'En línea · consulta idioma y requisitos', galaxies: classify(paragraphs.join(' ')),
    }, checkedAt);
  }).filter(Boolean);
  if (!result.length) throw new Error('SOURCE_CHANGED');
  return result;
}
export const legacySources = [
  { id:'mlh', name:'Major League Hacking', url:'https://www.mlh.com/events', parser:parseMlh,
    allowed: u => u.hostname === 'www.mlh.com' && (u.pathname === '/events' || /^\/seasons\/\d{4}\/events\/?$/.test(u.pathname) || u.pathname === '/robots.txt') },
  { id:'ghw', name:'Global Hack Week · MLH', url:'https://ghw.mlh.com/', parser:parseGhw,
    allowed: u => u.hostname === 'ghw.mlh.com' && ['/', '/robots.txt'].includes(u.pathname) },
];

// Solo HTML público. La API de hack0 requiere token y no se utiliza.
export function parseHack0Listing(html) {
  const anchors=[...html.matchAll(/<a\b[^>]*href="(\/eventos\/[a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  if (!anchors.length) throw new Error('SOURCE_CHANGED');
  const candidates=anchors.flatMap(([,path,body])=>{
    const name=body.match(/<span\b[^>]*class="name"[^>]*>([\s\S]*?)<\/span>/i)?.[1];
    const where=body.match(/<span\b[^>]*class="where"[^>]*>([\s\S]*)/i)?.[1];
    if (!name || !where || !/\bfi-pe\b/.test(where)) return [];
    const location=clean(where,180), title=clean(name,200);
    return limaLocality(location,`${title} ${location}`) ? [`https://hack0.dev${path}`] : [];
  });
  return [...new Set(candidates)].slice(0,24);
}
export function parseHack0Event(html, checkedAt, sourceUrl) {
  const nodes=[];
  for(const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const json=JSON.parse(match[1]); nodes.push(...(Array.isArray(json)?json:json['@graph']??[json])); } catch { /* Ignorar otros bloques mal formados. */ }
  }
  const event=nodes.find(e=>e?.['@type']==='Event');
  if(!event) throw new Error('SOURCE_CHANGED');
  if(event.eventStatus && !event.eventStatus.endsWith('/EventScheduled')) return null;
  const place=event.location, address=place?.address;
  const country=normalize(typeof address?.addressCountry==='object'?address.addressCountry.name:address?.addressCountry);
  const location=clean([address?.streetAddress,place?.name].filter(Boolean).join(' · '),160);
  if(!['pe','peru'].includes(country) || !limaLocality(address?.addressLocality,`${event.name} ${location}`)) return null;
  const mode=({'https://schema.org/OfflineEventAttendanceMode':'in_person','https://schema.org/MixedEventAttendanceMode':'hybrid'})[event.eventAttendanceMode];
  if(!mode) return null;
  const offers=Array.isArray(event.offers)?event.offers[0]:event.offers;
  const url=safePublicUrl(offers?.url) ?? safePublicUrl(sourceUrl);
  const name=clean(event.name,200);
  return item('hack0', {title:name,url,source_url:sourceUrl,country:'PE',city:'lima',
    type:/\b(hackathon|hackaton|buildathon|buildaton)\b/.test(normalize(name))?'hackathon':'event',
    mode, location:location?`${location} · Lima, Perú`:'Lima, Perú',
    starts_at:event.startDate??null,ends_at:event.endDate,galaxies:classify(`${name} ${event.keywords??''}`),
  },checkedAt);
}
async function collectHack0({source,html,robots,fetchImpl,checkedAt,previous}) {
  const pages=parseHack0Listing(html); const items=[]; let partial=false;
  for(const url of pages) {
    if(!robotsAllows(robots,new URL(url).pathname)) continue;
    try {
      const detail=await download(source,url,fetchImpl,robots);
      const opportunity=parseHack0Event(detail,checkedAt,url);
      if(opportunity) items.push(opportunity);
    } catch(error) {
      if(error.message==='ROBOTS_DENIED')continue;
      partial=true;
      items.push(...previous.items.filter(o=>o.source_id==='hack0' && o.source_url===url && inLima(o)));
    }
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  return {items,partial};
}
export const sources = [{
  id:'hack0',name:'hack0 · agenda de Lima',url:'https://hack0.dev/',collect:collectHack0,
  allowed:u=>u.hostname==='hack0.dev' && ['/', '/robots.txt'].includes(u.pathname) ||
    u.hostname==='hack0.dev' && /^\/eventos\/[a-z0-9-]{1,200}$/.test(u.pathname),
}];

// Grupos de robots, agente más específico, patrones * y $, precedencia de Allow en empates.
export function robotsAllows(robots, path) {
  const groups = []; let group = {agents:[],rules:[]}; let hasRules = false;
  for (const line of robots.split(/\r?\n/)) {
    const parsed = line.replace(/#.*/,'').trim().match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!parsed) continue;
    const key = parsed[1].toLowerCase(), value = parsed[2].trim();
    if (key === 'user-agent') {
      if (hasRules) { groups.push(group); group={agents:[],rules:[]}; hasRules=false; }
      group.agents.push(value.toLowerCase());
    } else if (['allow','disallow'].includes(key) && group.agents.length) {
      hasRules=true; if (value) group.rules.push({allow:key==='allow',pattern:value});
    }
  }
  groups.push(group);
  const matching = groups.map(g => ({...g, weight:Math.max(-1,...g.agents.map(a => a==='*' ? 0 : agentName.toLowerCase().includes(a) ? a.length : -1))}));
  const weight = Math.max(...matching.map(g=>g.weight));
  const rules = matching.filter(g=>g.weight===weight && weight>=0).flatMap(g=>g.rules).filter(rule => {
    const end = rule.pattern.endsWith('$');
    const pattern = (end ? rule.pattern.slice(0,-1) : rule.pattern).split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*');
    return new RegExp('^'+pattern+(end?'$':'')).test(path);
  }).sort((a,b)=>b.pattern.replace(/\*/g,'').length-a.pattern.replace(/\*/g,'').length || Number(b.allow)-Number(a.allow));
  return rules[0]?.allow ?? true;
}
async function download(source, address, fetchImpl, robots) {
  let url = new URL(address);
  for (let redirects=0; redirects<=3; redirects++) {
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || !source.allowed(url)) throw new Error('UNSAFE_REDIRECT');
    if (robots !== undefined && !robotsAllows(robots,url.pathname)) throw new Error('ROBOTS_DENIED');
    const response = await fetchImpl(url.href, {redirect:'manual',signal:AbortSignal.timeout(12000),headers:{
      'User-Agent':`${agentName}/1.0 (+https://github.com/mantunezdemayolosemi-sys/CONSTELA-Warmi-Innovathon)`, Accept:'text/html,text/plain;q=0.9',
    }});
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location'); await response.body?.cancel();
      if (!location) throw new Error('INVALID_REDIRECT'); url=new URL(location,url); continue;
    }
    if (response.status === 404 && url.pathname === '/robots.txt') { await response.body?.cancel(); return ''; }
    if (!response.ok || !/text\/(html|plain)/i.test(response.headers.get('content-type') ?? '')) { await response.body?.cancel(); throw new Error('SOURCE_UNAVAILABLE'); }
    let size=0; const chunks=[];
    const reader=response.body.getReader();
    try {
      while (true) {
        const {value,done}=await reader.read(); if (done) break;
        size+=value.byteLength; if (size>2*1024*1024) throw new Error('SOURCE_TOO_LARGE'); chunks.push(Buffer.from(value));
      }
    } finally { await reader.cancel(); }
    return Buffer.concat(chunks).toString('utf8');
  }
  throw new Error('TOO_MANY_REDIRECTS');
}
export async function collect(previous, {fetchImpl=globalThis.fetch, now=new Date(), sourceList=sources}={}) {
  const items=[], states=[]; const checked_at=now.toISOString();
  for (const source of sourceList) {
    const old=previous.sources.find(s=>s.id===source.id);
    try {
      const robots=await download(source,new URL('/robots.txt',source.url).href,fetchImpl);
      const paths = source.id === 'mlh' ? ['/events',`/seasons/${now.getUTCFullYear()}/events/`,`/seasons/${now.getUTCFullYear()+1}/events/`] : ['/'];
      if (paths.some(p=>!robotsAllows(robots,p))) throw new Error('ROBOTS_DENIED');
      const html=await download(source,source.url,fetchImpl,robots);
      const result=source.collect ? await source.collect({source,html,robots,fetchImpl,checkedAt:checked_at,previous}) : {items:source.parser(html,checked_at),partial:false};
      items.push(...result.items);
      states.push({id:source.id,name:source.name,url:source.url,checked_at,succeeded_at:result.partial?(old?.succeeded_at??null):checked_at,status:result.partial?'partial':'ok'});
    } catch (error) {
      const blocked=error.message==='ROBOTS_DENIED';
      if (!blocked) items.push(...previous.items.filter(o=>o.source_id===source.id));
      states.push({id:source.id,name:source.name,url:source.url,checked_at,succeeded_at:old?.succeeded_at??null,status:blocked?'blocked':'unavailable'});
    }
  }
  return snapshotSchema.parse({version:1,sources:states,items:[...new Map(items.filter(o=>endTimestamp(o.ends_at)>=+now && +now-Date.parse(o.checked_at)<=maxAge).map(o=>[o.url,o])).values()]});
}
export function createOpportunityCatalog({cacheFile=new URL('../.cache/opportunities.json',import.meta.url), snapshotFile=new URL('../data/opportunities.json',import.meta.url), fetchImpl=globalThis.fetch}={}) {
  let snapshot={version:1,items:[],sources:[]}; let pending;
  async function load() {
    for (const file of [cacheFile,snapshotFile]) {
      try { snapshot=snapshotSchema.parse(JSON.parse(await readFile(file,'utf8'))); break; } catch { /* Sin caché válida: empezar vacío. */ }
    }
  }
  async function sync() {
    if (pending) return pending;
    pending=(async()=>{
      const next=await collect(snapshot,{fetchImpl}); snapshot=next;
      try {
        const file=cacheFile instanceof URL ? (await import('node:url')).fileURLToPath(cacheFile) : cacheFile;
        await mkdir(dirname(file),{recursive:true}); const temporary=`${file}.${randomUUID()}.tmp`;
        await writeFile(temporary,JSON.stringify(next,null,2)+'\n'); await rename(temporary,file);
      } catch { /* El catálogo sigue disponible en memoria; el estado se informa al operador. */ return {...next,cache_saved:false}; }
      return {...next,cache_saved:true};
    })().finally(()=>{pending=null;});
    return pending;
  }
  return {load,sync,get:()=>structuredClone(snapshot)};
}
