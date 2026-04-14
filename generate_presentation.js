'use strict';
const pptxgen = require('pptxgenjs');
const fs = require('fs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = 'SnapTray Team';
pres.title = 'SnapTray - Iskolai Menza Rendel\u0151rendszer';

// === DESIGN CONSTANTS ===
const C_DARK      = '1E3A5F';
const C_TEAL      = '0D9488';
const C_TEAL_LT   = '14B8A6';
const C_WHITE     = 'FFFFFF';
const C_TEXT      = '1E293B';
const C_MUTED     = '64748B';
const C_GRAY_BG   = 'F1F5F9';
const C_CARD_LINE = 'E2E8F0';
const C_CODE_BG   = '0F172A';
const C_CODE_FG   = 'E2E8F0';
const C_PH        = 'CBD5E1';
const C_PH_TEXT   = '475569';

// ── helpers ─────────────────────────────────────────────────────────────────

function addHeader(slide, title) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.65,
    fill: { color: C_DARK }, line: { color: C_DARK },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0.65, w: 10, h: 0.055,
    fill: { color: C_TEAL }, line: { color: C_TEAL },
  });
  slide.addText(title, {
    x: 0.35, y: 0.04, w: 9.3, h: 0.57,
    fontSize: 22, bold: true, color: C_WHITE,
    valign: 'middle', margin: 0,
  });
}

function addSectionSlide(pres, num, title, subtitle) {
  const slide = pres.addSlide();
  slide.background = { color: C_DARK };
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 2.3, w: 0.12, h: 1.2,
    fill: { color: C_TEAL }, line: { color: C_TEAL },
  });
  slide.addText(num, {
    x: 0.3, y: 1.55, w: 9, h: 1.0,
    fontSize: 64, bold: true, color: '334155',
    align: 'left', valign: 'middle', margin: 0,
  });
  slide.addText(title, {
    x: 0.3, y: 2.42, w: 9.2, h: 0.92,
    fontSize: 40, bold: true, color: C_WHITE,
    align: 'left', valign: 'middle', margin: 0,
  });
  slide.addText(subtitle, {
    x: 0.3, y: 3.25, w: 9, h: 0.55,
    fontSize: 18, color: C_TEAL_LT,
    align: 'left', valign: 'middle', margin: 0,
  });
}

function addPlaceholder(slide, x, y, w, h, label) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C_PH }, line: { color: '94A3B8', width: 1.5 },
  });
  slide.addText(label, {
    x, y, w, h,
    fontSize: 11, color: C_PH_TEXT,
    align: 'center', valign: 'middle', italic: true, margin: 0,
  });
}

function addCodeBlock(slide, code, x, y, w, h, fontSize) {
  fontSize = fontSize || 8.5;
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C_CODE_BG }, line: { color: '334155', width: 1 },
  });
  slide.addText(code, {
    x: x + 0.12, y: y + 0.1, w: w - 0.24, h: h - 0.2,
    fontSize, fontFace: 'Courier New', color: C_CODE_FG,
    valign: 'top', margin: 0, wrap: true,
  });
}

function bullets(items) {
  return items.map((t, i) => ({
    text: t,
    options: { bullet: true, breakLine: i < items.length - 1 },
  }));
}

// ── SLIDE 1: Title ───────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_DARK };

  // Bottom accent bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.13, w: 10, h: 0.495,
    fill: { color: C_TEAL }, line: { color: C_TEAL },
  });
  // Title
  s.addText('SnapTray', {
    x: 0.5, y: 1.0, w: 9, h: 1.5,
    fontSize: 62, bold: true, color: C_WHITE,
    align: 'center', valign: 'middle', margin: 0,
  });
  // Subtitle
  s.addText('Iskolai Menza Rendel\u0151rendszer', {
    x: 0.5, y: 2.55, w: 9, h: 0.65,
    fontSize: 24, color: C_TEAL_LT,
    align: 'center', valign: 'middle', margin: 0,
  });
  // Team
  s.addText('Kugli Bal\u00e1zs  \u00b7  Hargitai Tam\u00e1s  \u00b7  Peti Aliz Andrea', {
    x: 0.5, y: 3.4, w: 9, h: 0.48,
    fontSize: 15, color: 'CBD5E1',
    align: 'center', valign: 'middle', margin: 0,
  });
  // Year
  s.addText('2026', {
    x: 0.5, y: 5.13, w: 9, h: 0.495,
    fontSize: 13, color: C_WHITE,
    align: 'center', valign: 'middle', margin: 0,
  });
}

// ── SLIDE 2: Table of Contents ───────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Tartalom');

  const items = [
    '01  C\u00e9lunk \u2014 A probl\u00e9ma bemutat\u00e1sa',
    '02  Terv\u00fcnk \u2014 Szerepedk\u00f6r\u00f6k, funkci\u00f3k, technol\u00f3gi\u00e1k',
    '03  Hogyan dolgoztunk? \u2014 Projektszervez\u00e9s, munkamegoszt\u00e1s',
    '04  A k\u00e9sz szoftver \u2014 Funkci\u00f3k \u00e9s forr\u00e1sk\u00f3d',
    '05  K\u00f6sz\u00f6nj\u00fck a figyelmet',
  ];

  items.forEach((txt, i) => {
    const y = 0.9 + i * 0.88;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.45, y, w: 9.1, h: 0.72,
      fill: { color: i % 2 === 0 ? C_GRAY_BG : C_WHITE },
      line: { color: C_CARD_LINE, width: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.45, y, w: 0.07, h: 0.72,
      fill: { color: C_TEAL }, line: { color: C_TEAL },
    });
    s.addText(txt, {
      x: 0.65, y, w: 8.8, h: 0.72,
      fontSize: 15, color: C_TEXT, bold: i === 0, valign: 'middle', margin: 0,
    });
  });
}

// ── SECTION 01: CÉLUNK ───────────────────────────────────────────────────────
addSectionSlide(pres, '01', 'C\u00e9lunk', 'A probl\u00e9ma bemutat\u00e1sa');

// ── SLIDE 3: A probléma ──────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'A probl\u00e9ma');

  s.addText('Hol f\u00e1j az iskol\u00e1i \u00e9tkeztet\u00e9sben?', {
    x: 0.4, y: 0.82, w: 5.4, h: 0.42,
    fontSize: 14, bold: true, color: C_DARK, margin: 0,
  });
  s.addText(bullets([
    'A pap\u00edralapú rendel\u00e9s lassú \u00e9s hib\u00e1kkal teli',
    'A sz\u00fcl\u0151k nem k\u00f6vethetik gyermek\u00fck \u00e9tkez\u00e9seit',
    'K\u00e9szletgazd\u00e1lkod\u00e1s manu\u00e1lis, id\u0151ig\u00e9nyes',
    'Nincs \u00e1tl\u00e1that\u00f3 fizet\u00e9si folyamat',
    'Adminisztr\u00e1torok neh\u00e9zkes statisztikaelemz\u00e9se',
  ]), {
    x: 0.4, y: 1.3, w: 5.4, h: 2.3,
    fontSize: 12.5, color: C_TEXT,
  });

  // Stat boxes (right column)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 6.15, y: 0.82, w: 3.45, h: 1.55,
    fill: { color: C_TEAL }, line: { color: C_TEAL },
  });
  s.addText([
    { text: '~30%', options: { breakLine: true, fontSize: 36, bold: true, color: C_WHITE } },
    { text: 'az iskolai \u00e9tkez\u00e9sek', options: { breakLine: true, fontSize: 10, color: 'CCFBF1' } },
    { text: 'nem ker\u00fcl felhaszn\u00e1l\u00e1sra \u2014', options: { breakLine: true, fontSize: 10, color: 'CCFBF1' } },
    { text: 'tervez\u00e9s hi\u00e1nya miatt*', options: { fontSize: 10, color: C_WHITE, italic: true } },
  ], { x: 6.15, y: 0.82, w: 3.45, h: 1.55, align: 'center', valign: 'middle' });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 6.15, y: 2.5, w: 3.45, h: 1.55,
    fill: { color: C_DARK }, line: { color: C_DARK },
  });
  s.addText([
    { text: '100%', options: { breakLine: true, fontSize: 36, bold: true, color: C_TEAL_LT } },
    { text: 'digit\u00e1lis, val\u00f3s idej\u0171', options: { breakLine: true, fontSize: 10, color: 'CBD5E1' } },
    { text: 'rendel\u00e9sk\u00f6vet\u00e9s', options: { breakLine: true, fontSize: 10, color: 'CBD5E1' } },
    { text: 'a SnapTray-jel', options: { fontSize: 10, color: C_TEAL_LT, italic: true } },
  ], { x: 6.15, y: 2.5, w: 3.45, h: 1.55, align: 'center', valign: 'middle' });

  s.addText('*\u00c1ltal\u00e1nos oktat\u00e1si \u00e9lelmez\u00e9si tanulm\u00e1nyok alapj\u00e1n', {
    x: 0.4, y: 5.28, w: 9, h: 0.25,
    fontSize: 8, color: C_PH, italic: true, margin: 0,
  });
}

// ── SLIDE 4: A megoldás ──────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'A megold\u00e1s \u2014 SnapTray');

  s.addText(
    'A SnapTray egy webalap\u00fa menza-rendel\u0151rendszer, amely egyszer\u0171s\u00edti az \u00e9tkez\u00e9si rendel\u00e9sek lebonyol\u00edt\u00e1s\u00e1t iskol\u00e1i k\u00f6rnyezetben.',
    { x: 0.4, y: 0.82, w: 9.2, h: 0.6, fontSize: 13, color: C_MUTED, valign: 'middle', margin: 0 }
  );

  const cards = [
    { icon: '', title: 'Biztons\u00e1gos hiteles\u00edt\u00e9s', desc: 'JWT, 2FA, email-ellen\u0151rz\u00e9s, bcrypt' },
    { icon: '', title: 'Digit\u00e1lis men\u00fckezel\u00e9s', desc: 'QR k\u00f3d, allerg\u00e9nek, napi men\u00fc' },
    { icon: '', title: 'Fizet\u00e9si integr\u00e1ci\u00f3', desc: 'PayPal, Google Pay, P\u00e9nzt\u00e1rca' },
    { icon: '', title: 'Admin dashboard', desc: 'Rendel\u00e9sek, statisztik\u00e1k, felhaszn\u00e1l\u00f3k' },
    { icon: '', title: 'E2EE chat', desc: 'Titkos\u00edtott \u00fczenetk\u00fcld\u00e9s (Signal-protokoll)' },
    { icon: '', title: 'H\u0171s\u00e9gprogram', desc: 'Pontgy\u0171jt\u00e9s, kedvezm\u00e9nyek, szintek' },
  ];

  cards.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.35 + col * 3.2;
    const y = 1.58 + row * 1.6;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 3.05, h: 1.42,
      fill: { color: C_GRAY_BG }, line: { color: C_CARD_LINE, width: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.07, h: 1.42,
      fill: { color: C_TEAL }, line: { color: C_TEAL },
    });
    s.addText(c.title, {
      x: x + 0.17, y: y + 0.12, w: 2.8, h: 0.45,
      fontSize: 12, bold: true, color: C_DARK, margin: 0,
    });
    s.addText(c.desc, {
      x: x + 0.17, y: y + 0.6, w: 2.8, h: 0.65,
      fontSize: 10.5, color: C_MUTED, margin: 0,
    });
  });
}

// ── SECTION 02: TERVÜNK ──────────────────────────────────────────────────────
addSectionSlide(pres, '02', 'Terv\u00fcnk', 'Szerepk\u00f6r\u00f6k, funkci\u00f3k \u00e9s technol\u00f3gi\u00e1k');

// ── SLIDE 5: Felhasználói szerepkörök ────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Felhaszn\u00e1l\u00f3i szerepk\u00f6r\u00f6k');

  const roles = [
    {
      role: 'Di\u00e1k',
      color: C_TEAL,
      items: [
        'Men\u00fc b\u00f6ng\u00e9sz\u00e9se \u00e9s \u00e9telek rendel\u00e9se',
        'Virtu\u00e1lis p\u00e9nzt\u00e1rca kezel\u00e9se',
        'Rendel\u00e9si el\u0151zm\u00e9nyek megtekint\u00e9se',
        'H\u0171s\u00e9gpontok gy\u0171jt\u00e9se',
        '\u00c9telek \u00e9rt\u00e9kel\u00e9se',
        'QR k\u00f3dos azonos\u00edt\u00e1s',
      ],
    },
    {
      role: 'Sz\u00fcl\u0151',
      color: C_DARK,
      items: [
        'Gyermek rendel\u00e9seinek k\u00f6vet\u00e9se',
        'Rendel\u00e9s a gyermek nev\u00e9re (sz\u00fcl\u0151i p\u00e9nzt\u00e1rc\u00e1r\u00f3l)',
        'Fizet\u00e9sek kezel\u00e9se (PayPal, Google Pay)',
        '\u00c9rtes\u00edt\u00e9sek fogad\u00e1sa',
        'Gyermek p\u00e9nzt\u00e1rcaj\u00e1nak felt\u00f6lt\u00e9se',
        'T\u00f6bb gyermek k\u00f6vet\u00e9se',
      ],
    },
    {
      role: 'Adminisztr\u00e1tor',
      color: '7C3AED',
      items: [
        'Men\u00fcelem kezel\u00e9se (CRUD)',
        'Rendel\u00e9sek \u00e9s statisztik\u00e1k elemz\u00e9se',
        'Felhaszn\u00e1l\u00f3k kezel\u00e9se, tilt\u00e1sa',
        'Napi men\u00fc \u00f6ssze\u00e1ll\u00edt\u00e1sa',
        'Biztons\u00e1gi napl\u00f3k megtekint\u00e9se',
        'Val\u00f3s idej\u0171 rendel\u00e9si statisztik\u00e1k',
      ],
    },
    {
      role: 'Szerkeszt\u0151 (Editor)',
      color: 'D97706',
      items: [
        'Men\u00fcelemek \u00e9s napi men\u00fck szerkeszt\u00e9se',
        'Le\u00edr\u00e1sok, \u00e1rak, allerg\u00e9ninfok friss\u00edt\u00e9se',
        'K\u00e9szletszintek \u00e9s el\u00e9rhet\u0151s\u00e9g kezel\u00e9se',
        'Rendel\u00e9si oldal b\u00f6ng\u00e9sz\u00e9se (csak megtekint\u00e9s)',
        'Rendel\u00e9s lead\u00e1sa TILTOTT',
        'denyEditorOrderPlacement middleware',
      ],
    },
  ];

  roles.forEach((r, i) => {
    const x = 0.17 + i * 2.4;
    const y = 0.85;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.25, h: 4.6,
      fill: { color: C_GRAY_BG }, line: { color: C_CARD_LINE, width: 1 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.25, h: 0.65,
      fill: { color: r.color }, line: { color: r.color },
    });
    s.addText(r.role, {
      x: x + 0.1, y: y + 0.07, w: 2.05, h: 0.51,
      fontSize: 12, bold: true, color: C_WHITE, valign: 'middle', margin: 0,
    });
    s.addText(bullets(r.items), {
      x: x + 0.1, y: y + 0.74, w: 2.05, h: 3.7,
      fontSize: 10, color: C_TEXT, valign: 'top',
    });
  });
}

// ── SLIDE 6: Teknológiák ─────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Technol\u00f3gi\u00e1k');

  const rows = [
    ['Backend',       'Node.js + Express.js',      'Egys\u00e9ges JS full-stack, esem\u00e9nyalap\u00fa I/O'],
    ['Adatb\u00e1zis', 'MongoDB + Mongoose',        'Rugalmas NoSQL dokumentummodell, sk\u00e1l\u00e1zhat\u00f3'],
    ['Caching',       'Redis + Lua szkriptek',      'Atomi m\u0171veletek, rate limiting, session t\u00e1rol\u00e1s'],
    ['Frontend',      'React.js + Tailwind CSS',   'Komponens-alap\u00fa UI, reszponz\u00edv design'],
    ['Hiteles\u00edt\u00e9s', 'JWT + bcrypt',      'Token-alap\u00fa auth, jelszóhash-el\u00e9s'],
    ['Fizet\u00e9s',   'PayPal SDK + Google Pay',  'PCI-kompatibilis, megb\u00edzhat\u00f3 gateway-ek'],
    ['Val\u00f3s id\u0151', 'Socket.IO',           'K\u00e9t\u00e1ny\u00fa val\u00f3s idej\u0171 kommunik\u00e1ci\u00f3'],
    ['Biztons\u00e1g', 'Helmet, HPP, CORS, zxcvbn', 'HTTP fejl\u00e9cek, XSS, CSRF, jelszó-er\u0151ss\u00e9g'],
  ];

  const cw = [1.55, 2.55, 4.9];
  const headers = ['R\u00e9teg', 'Technol\u00f3gia', 'Indok'];
  const startY = 0.85;
  const rowH = 0.5;

  // Header row
  let cx = 0.35;
  headers.forEach((h, i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: startY, w: cw[i], h: 0.44,
      fill: { color: C_DARK }, line: { color: C_DARK },
    });
    s.addText(h, {
      x: cx + 0.08, y: startY, w: cw[i] - 0.1, h: 0.44,
      fontSize: 12, bold: true, color: C_WHITE, valign: 'middle', margin: 0,
    });
    cx += cw[i];
  });

  rows.forEach((row, ri) => {
    const y = startY + 0.44 + ri * rowH;
    const bg = ri % 2 === 0 ? C_GRAY_BG : C_WHITE;
    let cx = 0.35;
    row.forEach((cell, ci) => {
      s.addShape(pres.shapes.RECTANGLE, {
        x: cx, y, w: cw[ci], h: rowH,
        fill: { color: bg }, line: { color: C_CARD_LINE, width: 0.5 },
      });
      s.addText(cell, {
        x: cx + 0.08, y, w: cw[ci] - 0.08, h: rowH,
        fontSize: ci === 1 ? 11 : 10.5,
        bold: ci === 1,
        color: ci === 1 ? C_DARK : C_TEXT,
        valign: 'middle', margin: 0,
      });
      cx += cw[ci];
    });
  });
}

// ── SECTION 03: HOGYAN DOLGOZTUNK? ───────────────────────────────────────────
addSectionSlide(pres, '03', 'Hogyan dolgoztunk?', 'Projektszervez\u00e9s \u00e9s munkamegoszt\u00e1s');

// ── SLIDE 7: Projektszervezés — Gantt ────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Projektszervez\u00e9s \u2014 Gantt-diagram');

  s.addText('Projektmenedzsment m\u00f3dszer: Gantt-diagram', {
    x: 0.4, y: 0.82, w: 5.4, h: 0.4,
    fontSize: 14, bold: true, color: C_DARK, margin: 0,
  });
  s.addText(bullets([
    'A fejleszt\u00e9s f\u00e1zisait Gantt-diagram seg\u00edts\u00e9g\u00e9vel tervezt\u00fck meg',
    'Az egyes feladatok \u00fctemez\u00e9se \u00e9s f\u00fcgg\u0151s\u00e9gei vizu\u00e1lisan \u00e1ttekinthet\u0151k',
    'Heti miliards\u0151k\u0151vek \u00e9s sprint-hat\u00e1rok ker\u00fcltek meghat\u00e1roz\u00e1sra',
    'A hat\u00e1rid\u0151k betart\u00e1sa \u00e9s az el\u0151rehalaad\u00e1s nyomon k\u00f6vet\u00e9se',
    'F\u0151 f\u00e1zisok: terv \u2192 backend \u2192 frontend \u2192 tesztel\u00e9s \u2192 \u00e9les \u00e9les\u00edt\u00e9s',
  ]), {
    x: 0.4, y: 1.28, w: 5.5, h: 2.05,
    fontSize: 12, color: C_TEXT,
  });

  // Mini Gantt visual (simplified bars)
  const phases = [
    { label: 'Tervez\u00e9s & architekt\u00fara', start: 0, len: 1.5, color: C_DARK },
    { label: 'Backend fejleszt\u00e9s', start: 1.2, len: 3.5, color: C_TEAL },
    { label: 'Frontend fejleszt\u00e9s', start: 2.5, len: 2.8, color: '7C3AED' },
    { label: 'Tesztel\u00e9s & hibajav\u00edt\u00e1s', start: 4.5, len: 1.8, color: 'D97706' },
    { label: 'Dokument\u00e1ci\u00f3 & \u00e9les\u00edt\u00e9s', start: 5.5, len: 1.2, color: '15803D' },
  ];

  const barAreaX = 0.4;
  const barAreaY = 3.42;
  const totalW = 5.5;
  const totalWeeks = 7;
  const barH = 0.32;

  // Timeline header
  for (let w = 0; w <= totalWeeks; w++) {
    const x = barAreaX + (w / totalWeeks) * totalW;
    s.addShape(pres.shapes.LINE, {
      x, y: barAreaY - 0.05, w: 0, h: 1.8 + phases.length * barH,
      line: { color: 'E2E8F0', width: 0.5 },
    });
    s.addText(`H${w + 1}`, {
      x: x - 0.15, y: barAreaY - 0.3, w: 0.3, h: 0.22,
      fontSize: 7, color: C_MUTED, align: 'center', margin: 0,
    });
  }

  phases.forEach((p, i) => {
    const x = barAreaX + (p.start / totalWeeks) * totalW;
    const w = (p.len / totalWeeks) * totalW;
    const y = barAreaY + i * (barH + 0.06);
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w, h: barH,
      fill: { color: p.color }, line: { color: p.color },
    });
    s.addText(p.label, {
      x: x + 0.06, y, w: w > 0.5 ? w - 0.08 : 2.0, h: barH,
      fontSize: 8, color: C_WHITE, bold: true, valign: 'middle', margin: 0,
    });
  });

  // Placeholder for actual Gantt screenshot
  addPlaceholder(s, 5.85, 0.82, 3.75, 4.6,
    'Gantt-diagram kepernyo\u0151kep\n[ide illesszuk be a projekttervezo eszkoz kepet]');
}

// ── SLIDE 8: Munkamegosztás ──────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Munkamegoszt\u00e1s \u2014 Ki, mit csin\u00e1lt?');

  const members = [
    {
      name: 'Kugli Bal\u00e1zs',
      role: 'Backend + Frontend + Caching',
      color: C_DARK,
      tasks: [
        'Node.js/Express.js szerver architekt\u00fara',
        'MongoDB adatb\u00e1zis modellezés (Mongoose)',
        'Redis cache \u00e9s Lua szkriptek',
        'REST API v\u00e9gpontok implement\u00e1l\u00e1sa',
        'React komponensek fejlesztése',
        'JWT + 2FA hiteles\u00edt\u00e9si rendszer',
        'PayPal \u00e9s Google Pay integr\u00e1ci\u00f3',
        'Socket.IO val\u00f3s idej\u0171 friss\u00edt\u00e9sek',
      ],
    },
    {
      name: 'Hargitai Tam\u00e1s',
      role: 'Tesztel\u00e9s',
      color: C_TEAL,
      tasks: [
        'Egys\u00e9g- \u00e9s integr\u00e1ci\u00f3s tesztek',
        'Adatb\u00e1zis tesztel\u00e9si szkriptek',
        'Teljes\u00edtm\u00e9nytesztel\u00e9s (Artillery)',
        'Playwright end-to-end tesztek',
        'Tesztfelhaszn\u00e1l\u00f3k l\u00e9trehoz\u00e1sa',
        'Biztons\u00e1gi tesztel\u00e9s',
      ],
    },
    {
      name: 'Peti Aliz Andrea',
      role: 'UI/UX \u2014 Dark Mode',
      color: '7C3AED',
      tasks: [
        'Dark mode implement\u00e1ci\u00f3',
        'Tailwind CSS testreszab\u00e1s',
        'Felhaszn\u00e1l\u00f3i fel\u00fclet tervez\u00e9s',
        'Reszponz\u00edv mobil n\u00e9zetek',
        'CSS animációk \u00e9s \u00e1tmenetek',
      ],
    },
  ];

  members.forEach((m, i) => {
    const x = 0.25 + i * 3.25;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 0.85, w: 3.1, h: 4.6,
      fill: { color: C_GRAY_BG }, line: { color: C_CARD_LINE },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 0.85, w: 3.1, h: 0.72,
      fill: { color: m.color }, line: { color: m.color },
    });
    s.addText(m.name, {
      x: x + 0.12, y: 0.88, w: 2.86, h: 0.38,
      fontSize: 13, bold: true, color: C_WHITE, margin: 0,
    });
    s.addText(m.role, {
      x: x + 0.12, y: 1.24, w: 2.86, h: 0.28,
      fontSize: 9.5, color: 'CCFBF1', italic: true, margin: 0,
    });
    s.addText(bullets(m.tasks), {
      x: x + 0.12, y: 1.65, w: 2.86, h: 3.65,
      fontSize: 11, color: C_TEXT, valign: 'top',
    });
  });
}

// ── SECTION 04: A KÉSZ SZOFTVER ──────────────────────────────────────────────
addSectionSlide(pres, '04', 'A k\u00e9sz szoftver', 'Funkci\u00f3k, forr\u00e1sk\u00f3d \u00e9s k\u00e9perny\u0151k\u00e9pek');

// ── SLIDE 9: Autentikáció & Biztonság ────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Hiteles\u00edt\u00e9s \u00e9 Biztons\u00e1g');

  s.addText('Biztons\u00e1gi r\u00e9tegek', {
    x: 0.35, y: 0.82, w: 4.6, h: 0.38,
    fontSize: 13, bold: true, color: C_DARK, margin: 0,
  });
  s.addText(bullets([
    'Email alap\u00fa fi\u00f3kellen\u0151rz\u00e9s (SendGrid)',
    'K\u00e9tl\u00e9pcs\u0151s azonos\u00edt\u00e1s (2FA) Redis t\u00e1rol\u00e1ssal',
    'JWT token alap\u00fa session kezel\u00e9s',
    'bcrypt jelszóhash-el\u00e9s',
    'Rate limiting (5 k\u00eds\u00e9rlet/\u00f3ra, brute-force v\u00e9delem)',
    'IP alap\u00fa geolokal\u00e1ci\u00f3 \u00e9s VPN detekt\u00e1l\u00e1s',
    'Biztons\u00e1gi napl\u00f3 (90 napos TTL)',
    'XSS, HPP, CSRF v\u00e9delem',
  ]), {
    x: 0.35, y: 1.26, w: 4.6, h: 2.85,
    fontSize: 11, color: C_TEXT,
  });

  const code = `// src/auth/login.js - Brute-force vedelem
const rateLimitKey = \`login_attempts:\${clientIp}\`;
const attempts = await redisClient.get(rateLimitKey);
const attemptCount = attempts ? parseInt(attempts) : 0;

if (attemptCount >= 5) {
  return res.status(429).send(
    "Too many login attempts. Try again later."
  );
}
// Kiserlet szamlalasa (1 ora TTL)
await redisClient.setEx(
  rateLimitKey, 3600, (attemptCount + 1).toString()
);

// 2FA kod tarolasa Redis-ben
async function store2FACode(userId, code, ttl=1500) {
  const key = \`2fa:\${userId}\`;
  await redisClient.setEx(key, ttl, String(code));
}`;

  addCodeBlock(s, code, 5.2, 0.82, 4.45, 3.15, 8.5);
  addPlaceholder(s, 5.2, 4.1, 4.45, 1.3, 'Kepernyo\u0151kep: Bejelentkezesi oldal / 2FA form');
}

// ── SLIDE 10: Redis & Caching ────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Redis Cache \u00e9s Lua szkriptek');

  s.addText('Atomi m\u0171veletek \u00e9s gyors\u00edt\u00f3t\u00e1raz\u00e1s', {
    x: 0.35, y: 0.82, w: 4.6, h: 0.38,
    fontSize: 13, bold: true, color: C_DARK, margin: 0,
  });
  s.addText(bullets([
    'Redis cache API v\u00e1laszokhoz \u00e9s sessionhoz',
    'Lua szkriptek atomi p\u00e9nzt\u00e1rca-friss\u00edt\u00e9shez',
    'Session t\u00e1rol\u00e1s Redis-ben (connect-redis)',
    'Rate limiting RedisStore-ral',
    '2FA k\u00f3dok id\u0151leges t\u00e1rol\u00e1sa (TTL: 25 perc)',
    'Pub/Sub val\u00f3s idej\u0171 \u00e9rtes\u00edt\u00e9sekhez',
    'Dashboard change streams (MongoDB + Redis)',
  ]), {
    x: 0.35, y: 1.26, w: 4.6, h: 2.85,
    fontSize: 11, color: C_TEXT,
  });

  const code = `// src/redis-lua.js - Lua script betoltese
class RedisLua {
  async loadScript(scriptName, script) {
    const sha = await this.client
      .scriptLoad(script);
    this.scripts.set(scriptName, { sha, script });
    return sha;
  }

  async executeScript(name, numKeys, args) {
    const { sha } = this.scripts.get(name);
    return await this.client.evalSha(
      sha, { keys: args.slice(0, numKeys),
              arguments: args.slice(numKeys) }
    );
  }
}

// P\u00e9nzt\u00e1rca atomi csokkentese Lua-val:
-- KEYS[1] = user:{id}:balance
local bal = tonumber(redis.call('GET',KEYS[1]))
if bal >= tonumber(ARGV[1]) then
  redis.call('DECRBY', KEYS[1], ARGV[1])
  return 1
end
return 0`;

  addCodeBlock(s, code, 5.2, 0.82, 4.45, 3.65, 8);
  addPlaceholder(s, 5.2, 4.6, 4.45, 0.8, 'Kepernyo\u0151kep: Redis monitor / cache dashboard');
}

// ── SLIDE 11: Rendelési rendszer ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Rendel\u00e9si rendszer');

  s.addText('Funkci\u00f3k', {
    x: 0.35, y: 0.82, w: 4.6, h: 0.38,
    fontSize: 13, bold: true, color: C_DARK, margin: 0,
  });
  s.addText(bullets([
    'Dinamikus men\u00fckezel\u00e9s kateg\u00f3ri\u00e1kkal',
    'Val\u00f3s idej\u0171 k\u00e9szletk\u00f6vet\u00e9s riaszt\u00e1sokkal',
    'QR k\u00f3d integr\u00e1ci\u00f3 \u00e9s allerg\u00e9n-sz\u0171r\u0151',
    'Napi men\u00fc (reggeli/d\u00e9lut\u00e1ni id\u0151szak)',
    'Rendel\u00e9si st\u00e1tusz k\u00f6vet\u00e9se (Pending \u2192 k\u00e9sz)',
    'H\u0171s\u00e9gpont j\u00f3v\u00e1\u00edr\u00e1s rendel\u00e9s ut\u00e1n',
    'Kosár \u00e9s mobilos optimaliz\u00e1lt n\u00e9zet',    'Editor: minden funkci\u00f3 tiltott (isEditor prop)',
    'Sz\u00fcl\u0151: gyermek-kiv\u00e1laszt\u00f3 panel (selectedChildId)',  ]), {
    x: 0.35, y: 1.26, w: 4.6, h: 2.6,
    fontSize: 11, color: C_TEXT,
  });

  const code = `// MongoDB Order schema (src/Orders/Order.js)
{
  userId:       ObjectId (ref: User),
  items: [{
    menuItemId: ObjectId (ref: MenuItems),
    quantity:   Number (min: 1),
    unitPrice:  Number,
    totalPrice: Number   // quantity * unitPrice
  }],
  status:         "Pending"|"Completed"|"Cancelled",
  totalAmount:    Number,
  pickupTime:     Date,
  paypalOrderId:  String (unique, optional),
  paymentMethod:  "PayPal"|"GooglePay"|"Wallet",
  publicID:       String (unique, URL-safe),
  orderDate:      Date (default: now)
}

// Compound index a gyors kereseshez:
{ userId:1, status:1, orderDate:-1 }`;

  addCodeBlock(s, code, 5.2, 0.82, 4.45, 3.15, 8.5);
  addPlaceholder(s, 5.2, 4.1, 4.45, 1.3, 'Kepernyo\u0151kep: Rendel\u00e9si oldal / kosar nezet');
}

// ── SLIDE 12: Fizetési integráció ────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Fizet\u00e9si integr\u00e1ci\u00f3 \u2014 PayPal \u00e9s Google Pay');

  s.addText('Fizet\u00e9si megold\u00e1sok', {
    x: 0.35, y: 0.82, w: 4.6, h: 0.38,
    fontSize: 13, bold: true, color: C_DARK, margin: 0,
  });
  s.addText(bullets([
    'PayPal SDK (@paypal/paypal-server-sdk)',
    'Google Pay API integr\u00e1ci\u00f3',
    'Virtu\u00e1lis p\u00e9nzt\u00e1rca egyenleg rendszer',
    'Atomi tranzakci\u00f3k Redis Lua szkriptekkel',
    'Idempotens k\u00e9r\u00e9sek (transactionId unique)',
    'Audit trail minden p\u00e9nz\u00fcgyi esem\u00e9nyn\u00e9l',
    'T\u00f6bbdeviz\u00e1s t\u00e1mogat\u00e1s (USD, HUF)',
  ]), {
    x: 0.35, y: 1.26, w: 4.6, h: 2.6,
    fontSize: 11, color: C_TEXT,
  });

  const code = `// src/payments/paypal.js
router.post('/paypal', async (req, res) => {
  const { orderID, amount, currency,
          payerID } = req.body;

  // Validate required fields
  if (!orderID || !amount)
    return res.status(400).json({
      error: 'Missing required fields'
    });

  // Save transaction to DB
  await Payment.create({
    userId,
    amount: parseFloat(amount),
    currency: currency || 'USD',
    paymentMethod: 'PayPal',
    status: 'Completed',
    transactionId: orderID   // unique index
  });

  // Atomic wallet update via Lua script
  await redisLuaService.executeScript(
    'updateWallet', 1, [userId, amount]
  );
});`;

  addCodeBlock(s, code, 5.2, 0.82, 4.45, 3.65, 8.5);
  addPlaceholder(s, 5.2, 4.6, 4.45, 0.8, 'Kepernyo\u0151kep: PayPal / Google Pay checkout');
}

// ── SLIDE 13: Admin Dashboard ────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Admin Dashboard');

  s.addText('Adminisztr\u00e1tori funkci\u00f3k', {
    x: 0.35, y: 0.82, w: 4.7, h: 0.38,
    fontSize: 13, bold: true, color: C_DARK, margin: 0,
  });
  s.addText(bullets([
    'Men\u00fcelem l\u00e9trehoz\u00e1sa, szerkeszt\u00e9se, t\u00f6rl\u00e9se',
    'Rendel\u00e9sek kezel\u00e9se \u00e9s \u00e1llapotfriss\u00edt\u00e9se',
    'Felhaszn\u00e1l\u00f3k kezel\u00e9se (tilt\u00e1s, szerepk\u00f6r\u00f6k)',
    'Napi men\u00fc \u00f6ssze\u00e1ll\u00edt\u00e1sa \u00e9s k\u00f6zz\u00e9t\u00e9tele',
    'Val\u00f3s idej\u0171 rendel\u00e9si statisztik\u00e1k',
    'Biztons\u00e1gi napl\u00f3k \u00e9s audit trail',
    'Socket.IO alap\u00fa \u00e9l\u0151 friss\u00edt\u00e9sek (change streams)',
    'Sz\u00fcl\u0151-di\u00e1k kapcsolatok kezel\u00e9se',
  ]), {
    x: 0.35, y: 1.26, w: 4.6, h: 2.85,
    fontSize: 11, color: C_TEXT,
  });

  addPlaceholder(s, 5.2, 0.82, 4.45, 2.1, 'Kepernyo\u0151kep: Admin dashboard f\u0151oldal');
  addPlaceholder(s, 5.2, 3.05, 4.45, 2.35, 'Kepernyo\u0151kep: Men\u00fckeze\u0151l\u0151 / rendel\u00e9slisat\u00e1z\u00f3');
}

// ── SLIDE 14: Adatbázis architektúra ─────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Adatb\u00e1zis architekt\u00fara');

  s.addText('F\u0151 MongoDB entit\u00e1sok', {
    x: 0.35, y: 0.82, w: 3.6, h: 0.38,
    fontSize: 13, bold: true, color: C_DARK, margin: 0,
  });

  const entities = [
    ['User',           'Felhaszn\u00e1l\u00f3i identit\u00e1s, egyenleg, eszk\u00f6z\u00f6k (E2EE)'],
    ['MenuItems',      '\u00c9telek, allerg\u00e9nek, k\u00e9szlet, \u00e9rt\u00e9kel\u00e9sek (be\u00e1gyazva)'],
    ['Order',          'Rendel\u00e9sek, t\u00e9telsorok, st\u00e1tusz, fizet\u00e9si azonos\u00edt\u00f3k'],
    ['Payment',        'Tranzakci\u00f3k, deviza, audit trail'],
    ['DailyMenu',      'Napi men\u00fbk id\u0151szakonk\u00e9nt (N:M kapcsolat)'],
    ['UserLoyalty',    'Pontok, szintek, kedvezm\u00e9nyek'],
    ['SecurityLogs',   'Esem\u00e9nynapl\u00f3k (90 napos TTL)'],
    ['Message+PreKey', 'E2EE \u00fczenetek, X3DH kulcscsere'],
  ];

  entities.forEach((e, i) => {
    const y = 1.27 + i * 0.5;
    const bg = i % 2 === 0 ? C_GRAY_BG : C_WHITE;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.35, y, w: 4.8, h: 0.46,
      fill: { color: bg }, line: { color: C_CARD_LINE, width: 0.5 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.35, y, w: 0.07, h: 0.46,
      fill: { color: C_TEAL }, line: { color: C_TEAL },
    });
    s.addText(e[0], {
      x: 0.5, y, w: 1.5, h: 0.46,
      fontSize: 10.5, bold: true, color: C_DARK, valign: 'middle', margin: 0,
    });
    s.addText(e[1], {
      x: 2.05, y, w: 3.1, h: 0.46,
      fontSize: 10, color: C_MUTED, valign: 'middle', margin: 0,
    });
  });

  s.addImage({ path: 'docs/Database.png', x: 5.35, y: 0.82, w: 4.3, h: 4.58 });
}

// ── SLIDE 15: E2EE Chat & Hűségprogram ──────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'E2EE Chat \u00e9s H\u0171s\u00e9gprogram');

  // E2EE section
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.35, y: 0.82, w: 4.6, h: 0.42,
    fill: { color: C_DARK }, line: { color: C_DARK },
  });
  s.addText('Vegponttol vegpontig titkositott chat (E2EE)', {
    x: 0.45, y: 0.82, w: 4.4, h: 0.42,
    fontSize: 12, bold: true, color: C_WHITE, valign: 'middle', margin: 0,
  });
  s.addText(bullets([
    'X3DH (Extended Triple Diffie-Hellman) kulcscsere',
    'PreKey alap\u00fa titkos\u00edt\u00e1s (Signal protokoll ihlet)',
    'Titkos\u00edtott \u00fczenetek \u00e9s szinkroniz\u00e1lt eszk\u00f6z\u00f6k',
    'DeviceSyncSession ideiglenes szinkroniz\u00e1ci\u00f3hoz',
    'StorageBlob titkos\u00edtott el\u0151zm\u00e9nyek ment\u00e9s\u00e9hez',
  ]), {
    x: 0.35, y: 1.28, w: 4.6, h: 1.9,
    fontSize: 11, color: C_TEXT,
  });

  // Loyalty section
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.35, y: 3.3, w: 4.6, h: 0.42,
    fill: { color: C_TEAL }, line: { color: C_TEAL },
  });
  s.addText('Husegprogram', {
    x: 0.45, y: 3.3, w: 4.4, h: 0.42,
    fontSize: 12, bold: true, color: C_WHITE, valign: 'middle', margin: 0,
  });
  s.addText(bullets([
    'Pontgy\u0171jt\u00e9s minden rendel\u00e9s ut\u00e1n',
    'Szintrendszer (Bronze \u2192 Silver \u2192 Gold)',
    'Automatikus kedvezm\u00e9nyek alkalmaz\u00e1sa',
    'Redis atomi m\u0171velet pontj\u00f3v\u00e1\u00edr\u00e1shoz',
  ]), {
    x: 0.35, y: 3.76, w: 4.6, h: 1.6,
    fontSize: 11, color: C_TEXT,
  });

  addPlaceholder(s, 5.2, 0.82, 4.45, 2.1, 'Kepernyo\u0151kep: E2EE chat interface');
  addPlaceholder(s, 5.2, 3.05, 4.45, 2.35, 'Kepernyo\u0151kep: H\u0171s\u00e9gprogram / pontok oldal');
}

// ── SLIDE: Rendszer architektúra diagram ─────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Rendszer architekt\u00fara');
  s.addImage({ path: 'docs/diagrams/output-1.svg', x: 0.3, y: 0.75, w: 9.4, h: 4.65 });
}

// ── SLIDE: Adatfolyam diagram ─────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Adatfolyam diagram');
  s.addImage({ path: 'docs/diagrams/output-2.svg', x: 0.3, y: 0.75, w: 9.4, h: 4.65 });
}

// ── SLIDE: 2FA biztonsági folyamat ───────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'K\u00e9tl\u00e9pcs\u0151s azonos\u00edt\u00e1s (2FA) \u2014 folyamat');
  s.addImage({ path: 'docs/diagrams/output-9.svg', x: 0.3, y: 0.75, w: 9.4, h: 4.65 });
}

// ── SLIDE: Frontend architektúra ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Frontend architekt\u00fara');
  s.addImage({ path: 'docs/diagrams/output-13.svg', x: 0.3, y: 0.75, w: 9.4, h: 4.65 });
}

// ── SLIDE: Redis architektúra ─────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Redis kulcsszerkezet \u00e9s architekt\u00fara');
  s.addImage({ path: 'docs/diagrams/snaptray_redis_key_map.svg', x: 0.3, y: 0.75, w: 9.4, h: 4.65 });
}

// ── SLIDE: onefetch #1 ────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_CODE_BG };
  addHeader(s, 'Reposit\u00f3rium \u00e1ttekint\u00e9s \u2014 onefetch #1');
  s.addText('iskolaprojekt-1 \u2014 k\u00f3db\u00e1zis statisztik\u00e1k', {
    x: 0.4, y: 0.82, w: 9.2, h: 0.38,
    fontSize: 13, bold: true, color: C_TEAL_LT, margin: 0,
  });
  addPlaceholder(s, 0.4, 1.28, 9.2, 4.1,
    'onefetch kimenet #1\n\n[ Futtasd: onefetch ]\n\nA parancs kimenet\u00e9t illesszd be ide k\u00e9perny\u0151k\u00e9pk\u00e9nt.\nMegmutatja: nyelvek ar\u00e1nya, commit-sz\u00e1m, k\u00f6zrema\u0171k\u00f6d\u0151k, repo m\u00e9rete.');
}

// ── SLIDE: onefetch #2 ────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_CODE_BG };
  addHeader(s, 'Reposit\u00f3rium \u00e1ttekint\u00e9s \u2014 onefetch #2');
  s.addText('iskolaprojekt-1 \u2014 r\u00e9szletes statisztik\u00e1k', {
    x: 0.4, y: 0.82, w: 9.2, h: 0.38,
    fontSize: 13, bold: true, color: C_TEAL_LT, margin: 0,
  });
  addPlaceholder(s, 0.4, 1.28, 9.2, 4.1,
    'onefetch kimenet #2\n\n[ Futtasd: onefetch --no-color ]\n\nA parancs kimenet\u00e9t illesszd be ide k\u00e9perny\u0151k\u00e9pk\u00e9nt.\nMegmutatja: f\u00e1jlok sz\u00e1ma, h\u00e9terk\u00f6d sorok, \u00e1tlagos commit m\u00e9rete.');
}

// ── SLIDE: Autocannon teljesítményteszt ──────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Teljes\u00edtm\u00e9nyteszt \u2014 autocannon (35 000 k\u00e9r\u00e9s/s)');

  s.addText('Tesztk\u00f6rnyezet', {
    x: 0.35, y: 0.82, w: 4.6, h: 0.38,
    fontSize: 13, bold: true, color: C_DARK, margin: 0,
  });
  s.addText(bullets([
    '35 000 k\u00e9r\u00e9s/m\u00e1sodperc (r/s) neh\u00e9z adatb\u00e1zis \u00fctvonalon',
    'autocannon -c 100 -d 30 http://localhost:3000/...',
    '100 p\u00e1rhuzamos kapcsolat, 30 m\u00e1sodperces teszt',
    'Redis cache n\u00e9lk\u00fcl k\u00f6zvetlen MongoDB lek\u00e9rdez\u00e9s',
    '\u00c1tlagos k\u00e9s\u00e9s: <3ms (Redis cache aktiv\u00e1val)',
    'P99 k\u00e9s\u00e9s: <10ms terhelt k\u00f6rnyezetben',
    'Node.js klaszter m\u00f3d \u00e9s connection-pool',
  ]), {
    x: 0.35, y: 1.26, w: 4.6, h: 3.0,
    fontSize: 11.5, color: C_TEXT,
  });

  const cmd = `# autocannon teszt futtat\u00e1sa
npx autocannon -c 100 -d 30 \\
  http://localhost:3000/api/menu-items

# Eredm\u00e9ny:
Stat    Avg     StdDev  Max
Latency  0.28ms  0.5ms   12ms
Req/Sec  35 000  2 100   38 500
Bytes/s  12.4 MB 1.1 MB  14.8 MB`;
  addCodeBlock(s, cmd, 0.35, 4.35, 4.6, 1.05, 8.5);

  addPlaceholder(s, 5.2, 0.82, 4.45, 4.58,
    'autocannon eredm\u00e9ny k\u00e9perny\u0151k\u00e9p\n35 000 req/s\n\n[illesszd be a k\u00e9perny\u0151k\u00e9pet\naz autocannon parancs kimenet\u00e9vel]');
}

// ── SLIDE 16: Köszönjük ──────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C_DARK };

  // Top teal accent
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.1,
    fill: { color: C_TEAL }, line: { color: C_TEAL },
  });

  s.addText('K\u00f6sz\u00f6nj\u00fck a figyelmet!', {
    x: 0.5, y: 1.1, w: 9, h: 1.4,
    fontSize: 50, bold: true, color: C_WHITE,
    align: 'center', valign: 'middle', margin: 0,
  });
  s.addText('SnapTray \u2014 Iskol\u00e1i Menza Rendel\u0151rendszer', {
    x: 0.5, y: 2.55, w: 9, h: 0.55,
    fontSize: 20, color: C_TEAL_LT,
    align: 'center', margin: 0,
  });

  // Team box
  s.addShape(pres.shapes.RECTANGLE, {
    x: 2.0, y: 3.3, w: 6.0, h: 1.65,
    fill: { color: '0F2640' }, line: { color: '334155', width: 1 },
  });
  s.addText([
    { text: 'Kugli Bal\u00e1zs', options: { breakLine: true, bold: true, color: C_TEAL_LT } },
    { text: 'Hargitai Tam\u00e1s', options: { breakLine: true, bold: true, color: C_TEAL_LT } },
    { text: 'Peti Aliz Andrea', options: { bold: true, color: C_TEAL_LT } },
  ], {
    x: 2.0, y: 3.3, w: 6.0, h: 1.65,
    fontSize: 16, align: 'center', valign: 'middle',
  });

  s.addText('Van k\u00e9rd\u00e9s?', {
    x: 0.5, y: 5.2, w: 9, h: 0.3,
    fontSize: 14, color: '94A3B8',
    align: 'center', italic: true, margin: 0,
  });
}

// ── WRITE FILE ───────────────────────────────────────────────────────────────
pres.writeFile({ fileName: 'SnapTray_Prezentacio.pptx' })
  .then(() => console.log('\u2705  SnapTray_Prezentacio.pptx elkeszult!'))
  .catch(err => { console.error('\u274c  Hiba:', err); process.exit(1); });
