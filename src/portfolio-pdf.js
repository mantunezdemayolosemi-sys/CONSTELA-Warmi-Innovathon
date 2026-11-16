import PDFDocument from 'pdfkit';
import { eventTypes } from './portfolio.js';

const ink = '#211638';
const violet = '#67439c';
const grey = '#544964';
const dateFormat = new Intl.DateTimeFormat('es-PE', {dateStyle:'long', timeZone:'UTC'});
const formatDate = value => dateFormat.format(new Date(value + 'T12:00:00Z'));

export function renderPortfolioPdf(name, entries) {
  const doc = new PDFDocument({size:'A4', margin:54, bufferPages:true,
    info:{Title:'Portafolio · Constela', Author:name}});
  const chunks = [];
  const result = new Promise((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
  const width = doc.page.width - 108;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(violet).text('CONSTELA  /  PORTAFOLIO', {characterSpacing:2});
  doc.moveDown(0.9).fillColor(ink).fontSize(32).text(name);
  doc.moveDown(0.4).font('Helvetica').fontSize(12).fillColor(grey)
    .text(entries.length === 1 ? '1 experiencia registrada' : `${entries.length} experiencias registradas`);
  doc.moveDown(1.5);

  for (const entry of entries) {
    const label = entry.type === 'practice' ? 'Reto de práctica simulado' : `${eventTypes[entry.kind]} · Participación registrada`;
    doc.font('Helvetica-Bold').fontSize(17);
    const titleHeight = doc.heightOfString(entry.title, {width});
    if (doc.y + titleHeight + 110 > doc.page.height - 54) doc.addPage();
    const top = doc.y;
    doc.moveTo(54, top).lineTo(54 + width, top).strokeColor('#dbd2e9').lineWidth(0.7).stroke();
    doc.y += 15;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(violet).text(label);
    doc.moveDown(0.35).fontSize(17).fillColor(ink).text(entry.title);
    doc.moveDown(0.35).font('Helvetica').fontSize(10).fillColor(grey)
      .text([formatDate(entry.date), entry.organization].filter(Boolean).join(' · '));
    if (entry.skills?.length) doc.moveDown(0.35).text(entry.skills.join(' · '));
    doc.moveDown(0.8).font('Helvetica-Bold').fontSize(11).fillColor(ink).text('Qué aprendí');
    doc.moveDown(0.3).font('Helvetica').text(entry.learning, {lineGap:3});
    if (entry.proposal) {
      doc.moveDown(0.75).font('Helvetica-Bold').text('Mi propuesta');
      doc.moveDown(0.3).font('Helvetica').text(entry.proposal, {lineGap:3});
    }
    if (entry.url) doc.moveDown(0.6).fillColor(violet).text('Ver página del evento', {link:entry.url, underline:true});
    doc.moveDown(1.45);
  }

  if (!entries.length) doc.fontSize(12).fillColor(grey).text('Aún no hay retos ni eventos registrados.');
  const range = doc.bufferedPageRange();
  for (let page = range.start; page < range.start + range.count; page++) {
    doc.switchToPage(page);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(9).fillColor(grey)
      .text(`CONSTELA    ·    ${page + 1} / ${range.count}`, 54, doc.page.height - 36, {width, align:'right'});
    doc.page.margins.bottom = bottom;
  }
  doc.end();
  return result;
}
