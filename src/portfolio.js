import { z } from 'zod';
import { inLima, safePublicUrl } from './opportunities.js';
import { skills } from './discovery.js';

export const eventId = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
export const eventTypes = {event:'Evento',hackathon:'Hackathon',challenge:'Reto externo'};
const limaDay = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Lima'});
export const eventReflection = z.strictObject({
  attended_on: z.iso.date().refine(value => value <= limaDay.format(new Date())),
  learning: z.string().trim().min(10).max(2000),
});
export const eventParticipation = z.union([
  eventReflection,
  eventReflection.extend({
    title: z.string().trim().min(1).max(200),
    kind: z.enum(Object.keys(eventTypes)),
    source_url: z.union([z.literal(''), z.string().trim().max(1000).refine(value => !!safePublicUrl(value))]).optional(),
  }),
]);

export function catalogEvent(snapshot, id) {
  const event = snapshot.items.find(item => item.id === id && inLima(item));
  return event ? {
    event_id: event.id,
    title: event.title,
    kind: event.type,
    source_url: safePublicUrl(event.url),
  } : null;
}

export function portfolioEntries(practices, events) {
  const skillNames = new Map(skills.map(({id,name}) => [id,name]));
  return [
    ...practices.map(row => ({
      id: row.post_id, type: 'practice', title: row.community_posts?.title ?? 'Reto de práctica',
      organization: row.community_posts?.organization_name ?? '',
      date: limaDay.format(new Date(row.completed_at)),
      learning: row.reflection, proposal: row.proposal,
      skills: row.practiced_skills.map(id => skillNames.get(id)).filter(Boolean),
    })),
    ...events.map(row => ({
      id: row.event_id, type: 'event', title: row.title, kind: row.kind,
      date: row.attended_on, learning: row.learning,
      url: safePublicUrl(row.source_url),
    })),
  ].sort((a,b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title,'es'));
}
