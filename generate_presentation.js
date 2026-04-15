'use strict';
const pptxgen = require('pptxgenjs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = 'SnapTray Team';
pres.title  = 'SnapTray';

const C_PRIMARY   = 'FF6B35';
const C_SECONDARY = 'FFC857';
const C_DARK      = '1A1A2E';
const C_CHARCOAL  = '2D2D44';
const C_WHITE     = 'FFFFFF';
const C_TEXT      = '1E293B';
const C_MUTED     = '64748B';
const C_GRAY_BG   = 'FDF6F0';
const C_CARD_LINE = 'FFDCC8';
const C_CODE_BG   = '0F172A';
const C_CODE_FG   = 'E2E8F0';
const C_CODE_KW   = 'FF6B35';
const C_CODE_STR  = 'FFC857';
const C_CODE_CMT  = '64748B';
const C_CODE_NUM  = 'FB923C';
const C_CODE_FN   = 'FDBA74';
const C_CODE_PROP = 'FDE68A';
const C_CODE_TYPE = 'FFE5DC';

function addHeader(slide, title) {
  slide.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:10,h:0.62, fill:{color:C_DARK}, line:{color:C_DARK} });
  slide.addShape(pres.shapes.RECTANGLE, { x:0,y:0.62,w:10,h:0.06, fill:{color:C_PRIMARY}, line:{color:C_PRIMARY} });
  slide.addText(title, { x:0.35,y:0.04,w:9.3,h:0.54, fontSize:22, bold:true, color:C_WHITE, fontFace:'Calibri', valign:'middle', margin:0 });
}

function addSectionSlide(p, num, title, subtitle) {
  const s = p.addSlide();
  s.background = { color: C_DARK };
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:0.14,h:5.625, fill:{color:C_PRIMARY}, line:{color:C_PRIMARY} });
  s.addText(num,      { x:0.3,y:1.4,w:9,h:1.1, fontSize:72, bold:true, color:'2D3A55', fontFace:'Calibri', align:'left', valign:'middle', margin:0 });
  s.addText(title,    { x:0.35,y:2.38,w:9.2,h:0.95, fontSize:42, bold:true, color:C_WHITE, fontFace:'Calibri', align:'left', valign:'middle', margin:0 });
  s.addText(subtitle, { x:0.35,y:3.25,w:9,h:0.55, fontSize:18, color:C_SECONDARY, fontFace:'Calibri', align:'left', valign:'middle', margin:0 });
}

function addPlaceholder(slide, x, y, w, h, label) {
  slide.addShape(pres.shapes.RECTANGLE, { x,y,w,h, fill:{color:'F8F0EC'}, line:{color:'FFDCC8',width:1.5} });
  slide.addText(label, { x,y,w,h, fontSize:10.5, color:'A0684A', fontFace:'Calibri', align:'center', valign:'middle', italic:true, margin:0 });
}

function addCodeBlockSyntax(slide, tokens, x, y, w, h, fontSize) {
  fontSize = fontSize || 8.0;
  const COLOR_MAP = { kw:C_CODE_KW, str:C_CODE_STR, cmt:C_CODE_CMT, num:C_CODE_NUM, fn:C_CODE_FN, prop:C_CODE_PROP, type:C_CODE_TYPE, plain:C_CODE_FG };
  slide.addShape(pres.shapes.RECTANGLE, { x,y,w,h, fill:{color:C_CODE_BG}, line:{color:'1E3A5F',width:1} });
  slide.addShape(pres.shapes.RECTANGLE, { x,y,w,h:0.22, fill:{color:'1E2D45'}, line:{color:'1E2D45'} });
  slide.addText('JavaScript', { x:x+0.1,y:y+0.01,w:2.5,h:0.2, fontSize:6.5, color:C_PRIMARY, bold:true, margin:0, fontFace:'Courier New' });
  const richText = tokens.map(t => ({ text:t.text, options:{ color:COLOR_MAP[t.type]||C_CODE_FG, fontFace:'Courier New', fontSize } }));
  slide.addText(richText, { x:x+0.1,y:y+0.26,w:w-0.2,h:h-0.32, valign:'top', margin:0, wrap:true });
}

function addCodeBlock(slide, code, x, y, w, h, fontSize) {
  fontSize = fontSize || 8.0;
  slide.addShape(pres.shapes.RECTANGLE, { x,y,w,h, fill:{color:C_CODE_BG}, line:{color:'1E3A5F',width:1} });
  slide.addShape(pres.shapes.RECTANGLE, { x,y,w,h:0.22, fill:{color:'1E2D45'}, line:{color:'1E2D45'} });
  slide.addText('Shell', { x:x+0.1,y:y+0.01,w:1.5,h:0.2, fontSize:6.5, color:C_PRIMARY, bold:true, margin:0, fontFace:'Courier New' });
  slide.addText(code, { x:x+0.1,y:y+0.26,w:w-0.2,h:h-0.32, fontSize, fontFace:'Courier New', color:C_CODE_FG, valign:'top', margin:0, wrap:true });
}

function bullets(items) {
  return items.map((t,i) => ({ text:t, options:{ bullet:true, breakLine:i<items.length-1, fontFace:'Calibri' } }));
}

// SLIDE 1 - Title
{
  const s = pres.addSlide();
  s.background = { color: C_DARK };
  s.addShape(pres.shapes.RECTANGLE, { x:7.2,y:0,w:2.8,h:5.625, fill:{color:'1E1E35'}, line:{color:'1E1E35'} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:0.14,h:5.625, fill:{color:C_PRIMARY}, line:{color:C_PRIMARY} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:5.23,w:10,h:0.395, fill:{color:C_PRIMARY}, line:{color:C_PRIMARY} });
  s.addText('SnapTray', { x:0.35,y:0.75,w:6.8,h:1.55, fontSize:68, bold:true, color:C_WHITE, fontFace:'Calibri', align:'left', valign:'middle', margin:0 });
  s.addText('Iskolai Menza Rendelorendszer', { x:0.35,y:2.35,w:6.8,h:0.62, fontSize:22, color:C_SECONDARY, fontFace:'Calibri', align:'left', valign:'middle', margin:0 });
  s.addText('Kugli Balazs  Hargitai Tamas  Peti Aliz Andrea', { x:0.35,y:3.1,w:6.8,h:0.45, fontSize:14, color:'CBD5E1', fontFace:'Calibri', align:'left', valign:'middle', margin:0 });
  s.addText('2026', { x:0,y:5.23,w:10,h:0.395, fontSize:13, color:C_WHITE, fontFace:'Calibri', align:'center', valign:'middle', margin:0 });
}

// SLIDE 2 - TOC
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Tartalom');
  const items = [
    { num:'01', label:'Celunk - A problema bemutatasa' },
    { num:'02', label:'Tervunk - Szerepkorok, funkciok, technologiak' },
    { num:'03', label:'Hogyan dolgoztunk? - Projektszervezes, munkamegosztas' },
    { num:'04', label:'A kesz szoftver - Funkciok es forraskod' },
    { num:'05', label:'Koszonjuk a figyelmet' },
  ];
  items.forEach((item, i) => {
    const y = 0.88 + i * 0.86;
    const even = i % 2 === 0;
    s.addShape(pres.shapes.RECTANGLE, { x:0.4,y,w:9.2,h:0.72, fill:{color:even?C_GRAY_BG:C_WHITE}, line:{color:C_CARD_LINE,width:1} });
    s.addShape(pres.shapes.RECTANGLE, { x:0.4,y,w:0.08,h:0.72, fill:{color:C_PRIMARY}, line:{color:C_PRIMARY} });
    s.addText(item.num, { x:0.56,y,w:0.65,h:0.72, fontSize:16, bold:true, color:C_PRIMARY, fontFace:'Calibri', valign:'middle', margin:0 });
    s.addText(item.label, { x:1.3,y,w:8.1,h:0.72, fontSize:14.5, color:C_TEXT, fontFace:'Calibri', valign:'middle', margin:0 });
  });
}

addSectionSlide(pres, '01', 'Celunk', 'A problema bemutatasa');

// SLIDE 3
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'A problema');
  s.addText('Hol faj az iskolai etkezesben?', { x:0.4,y:0.82,w:5.5,h:0.42, fontSize:14, bold:true, color:C_DARK, fontFace:'Calibri', margin:0 });
  s.addText(bullets(['A papiralapú rendeles lassu es hibakkal teli','A szulok nem kovethetik gyermekuk etkezesei','Keszletgazdalkodas manualis, idoigenyes','Nincs atlathato fizetesi folyamat','Adminisztratorok nehezkes statisztikalemzese','Allergeninformaciok nehezen elerhetok']),
    { x:0.4,y:1.3,w:5.5,h:2.5, fontSize:12.5, color:C_TEXT });
  s.addShape(pres.shapes.RECTANGLE, { x:6.2,y:0.82,w:3.45,h:1.55, fill:{color:C_PRIMARY}, line:{color:C_PRIMARY} });
  s.addText([
    { text:'~30%', options:{breakLine:true,fontSize:38,bold:true,color:C_WHITE} },
    { text:'az iskolai etkezesek nem kerul', options:{breakLine:true,fontSize:9.5,color:'FFE5DC'} },
    { text:'felhasznalasra - tervezes hianya miatt*', options:{fontSize:9.5,color:'FFE5DC',italic:true} },
  ], { x:6.2,y:0.82,w:3.45,h:1.55, align:'center', valign:'middle', fontFace:'Calibri' });
  s.addShape(pres.shapes.RECTANGLE, { x:6.2,y:2.5,w:3.45,h:1.55, fill:{color:C_DARK}, line:{color:C_DARK} });
  s.addText([
    { text:'100%', options:{breakLine:true,fontSize:38,bold:true,color:C_SECONDARY} },
    { text:'digitalis, valos ideju', options:{breakLine:true,fontSize:9.5,color:'CBD5E1'} },
    { text:'rendeleskovetes a SnapTray-jel', options:{fontSize:9.5,color:C_SECONDARY,italic:true} },
  ], { x:6.2,y:2.5,w:3.45,h:1.55, align:'center', valign:'middle', fontFace:'Calibri' });
}

// SLIDE 4
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'A megoldas - SnapTray');
  s.addText('Webalapú menza-rendelorendszer iskolai kornyezetbe', { x:0.4,y:0.82,w:9.2,h:0.55, fontSize:12.5, color:C_MUTED, fontFace:'Calibri', valign:'middle', margin:0 });
  const cards = [
    { title:'Biztonsagos hitelesites', desc:'JWT  2FA (Dioxus)  email-ellenorzes  bcrypt  CSRF' },
    { title:'Digitalis menukezeles', desc:'QR kod  allergenek  napi menu  keszletkovetes' },
    { title:'Fizetesi integracio', desc:'PayPal SDK  Google Pay  penztalca  MongoDB tranzakciok' },
    { title:'Admin es Editor dashboard', desc:'Menukezeles  statisztikak (simple-statistics)  naplok' },
    { title:'E2EE titkositott chat', desc:'X3DH + Double Ratchet  ECDH P-256  Signal protokoll' },
    { title:'Husegprogram', desc:'Pontgyujtes  Bronze-Platinum szintek  decay rendszer' },
  ];
  cards.forEach((c, i) => {
    const col = i % 3; const row = Math.floor(i / 3);
    const x = 0.35 + col * 3.22; const y = 1.53 + row * 1.7;
    s.addShape(pres.shapes.RECTANGLE, { x,y,w:3.07,h:1.52, fill:{color:C_GRAY_BG}, line:{color:C_CARD_LINE,width:1} });
    s.addShape(pres.shapes.RECTANGLE, { x,y,w:0.08,h:1.52, fill:{color:C_PRIMARY}, line:{color:C_PRIMARY} });
    s.addText(c.title, { x:x+0.18,y:y+0.1,w:2.8,h:0.46, fontSize:11.5, bold:true, color:C_DARK, fontFace:'Calibri', margin:0 });
    s.addText(c.desc,  { x:x+0.18,y:y+0.6,w:2.8,h:0.78, fontSize:10,   color:C_MUTED,fontFace:'Calibri', margin:0 });
  });
}

addSectionSlide(pres, '02', 'Tervunk', 'Szerepkorok, funkciok es technologiak');

// SLIDE 5 - Roles
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Felhasznaloi szerepkorok');
  const roles = [
    { role:'Diak',          color:C_PRIMARY, items:['Menu bongeszese es rendeles','Virtualis penztalca kezelese','Rendelesi elozmeny','Husegpontok gyujtese','Etelek ertekelese (fuzzy)','QR kodos azonositas'] },
    { role:'Szulo',         color:C_DARK,    items:['Gyermek rendelesek kovetese','Rendeles gyermek nevere','Fizetes szulo egyenlegebol','PayPal es Google Pay','Penzatutalaisi kerelem jovahagyas','Tobb gyermek kovetheto'] },
    { role:'Adminisztrator',color:'7C3AED',  items:['Menuelem kezeles (CRUD)','Rendelesek es statisztikak','Felhasznalok kezelese, tiltasa','Napi menu osszealliatas','Biztonsagi naplok','simple-statistics elemzesek'] },
    { role:'Szerkeszto',    color:'D97706',  items:['Menuelemek szerkesztese','Leiirasok, arak, allergenek','Keszletszintek kezelese','Rendelesi oldal: CSAK megtekintes','Rendeles leadasa TILTOTT','denyEditorOrderPlacement MW'] },
  ];
  roles.forEach((r, i) => {
    const x = 0.17 + i * 2.42;
    s.addShape(pres.shapes.RECTANGLE, { x,y:0.82,w:2.28,h:4.68, fill:{color:C_GRAY_BG}, line:{color:C_CARD_LINE} });
    s.addShape(pres.shapes.RECTANGLE, { x,y:0.82,w:2.28,h:0.65, fill:{color:r.color}, line:{color:r.color} });
    s.addText(r.role, { x:x+0.1,y:0.87,w:2.08,h:0.52, fontSize:12, bold:true, color:C_WHITE, fontFace:'Calibri', valign:'middle', margin:0 });
    s.addText(bullets(r.items), { x:x+0.1,y:1.55,w:2.08,h:3.82, fontSize:10, color:C_TEXT, fontFace:'Calibri', valign:'top' });
  });
}

// SLIDE 6 - Tech
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Technologiak');
  const rows = [
    ['Backend',      'Node.js + Express.js',         'Egysegles JS full-stack, esemenyalapu I/O'],
    ['Adatbazis',    'MongoDB + Mongoose',            'Rugalmas NoSQL dokumentummodell, skalazható'],
    ['Caching',      'Redis + Lua szkriptek',         'Atomi muveletek, rate limiting, session tárolás'],
    ['Frontend',     'React.js + Tailwind CSS',       'Komponens-alapu UI, reszponzív design'],
    ['Hitelesites',  'JWT + bcrypt + 2FA',            'Token-alapu auth, jelszohash, Dioxus 2FA'],
    ['Fizetes',      'PayPal SDK + Google Pay',       'PCI-kompatibilis, atomi MongoDB tranzakciók'],
    ['Valos ido',    'Socket.IO + Change Streams',    'Ketiranyú komm., MongoDB change stream'],
    ['Biztonsag',    'Helmet, HPP, CORS, zxcvbn',    'HTTP fejlecek, CSRF, XSS, jelszóerosseg'],
  ];
  const cw = [1.6, 2.65, 4.8]; const hdrs = ['Reteg','Technologia','Indok'];
  let cx = 0.35;
  hdrs.forEach((h, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x:cx,y:0.84,w:cw[i],h:0.44, fill:{color:C_DARK}, line:{color:C_DARK} });
    s.addText(h, { x:cx+0.09,y:0.84,w:cw[i]-0.1,h:0.44, fontSize:11.5, bold:true, color:C_WHITE, fontFace:'Calibri', valign:'middle', margin:0 });
    cx += cw[i];
  });
  rows.forEach((row, ri) => {
    const y = 1.28 + ri * 0.495; const bg = ri%2===0?C_GRAY_BG:C_WHITE;
    let cx2 = 0.35;
    row.forEach((cell, ci) => {
      s.addShape(pres.shapes.RECTANGLE, { x:cx2,y,w:cw[ci],h:0.495, fill:{color:bg}, line:{color:C_CARD_LINE,width:0.5} });
      s.addText(cell, { x:cx2+0.08,y,w:cw[ci]-0.1,h:0.495, fontSize:ci===1?10.5:10, bold:ci===1, color:ci===1?C_DARK:C_TEXT, fontFace:'Calibri', valign:'middle', margin:0 });
      cx2 += cw[ci];
    });
    if (ri%2===0) s.addShape(pres.shapes.RECTANGLE, { x:0.35,y,w:0.05,h:0.495, fill:{color:C_PRIMARY}, line:{color:C_PRIMARY} });
  });
}

addSectionSlide(pres, '03', 'Hogyan dolgoztunk?', 'Projektszervezes es munkamegosztas');

// SLIDE 7 - Gantt
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Projektszervezes - Gantt-diagram');
  s.addText('Fejlesztesi fazisok', { x:0.4,y:0.82,w:5.4,h:0.38, fontSize:13, bold:true, color:C_DARK, fontFace:'Calibri', margin:0 });
  s.addText(bullets(['Fazisok es hatarideok Gantt-diagrammal tervezve','Heti merseklovek es sprint-hatarok','Egymasra epulo fazisok: backend => frontend => integracio','Fo fazisok: terv -> backend -> frontend -> teszt -> elesites']),
    { x:0.4,y:1.26,w:5.5,h:1.8, fontSize:12, color:C_TEXT });
  const phases = [
    { label:'Tervezes & architektura', start:0,   len:1.5, color:C_DARK },
    { label:'Backend fejlesztes',      start:1.2, len:3.5, color:C_PRIMARY },
    { label:'Frontend fejlesztes',     start:2.5, len:2.8, color:'7C3AED' },
    { label:'Teszteles & hibajavitas', start:4.5, len:1.8, color:'D97706' },
    { label:'Dokumentacio & elesites', start:5.5, len:1.2, color:'15803D' },
  ];
  const barAreaX=0.4, barAreaY=3.25, totalW=5.5, totalWeeks=7, barH=0.36;
  for (let w=0; w<=totalWeeks; w++) {
    const x = barAreaX + (w/totalWeeks)*totalW;
    s.addText(`H${w+1}`, { x:x-0.14,y:barAreaY-0.28,w:0.28,h:0.22, fontSize:7, color:C_MUTED, fontFace:'Calibri', align:'center', margin:0 });
  }
  phases.forEach((p, i) => {
    const x = barAreaX+(p.start/totalWeeks)*totalW; const ww=(p.len/totalWeeks)*totalW;
    const y = barAreaY+i*(barH+0.07);
    s.addShape(pres.shapes.RECTANGLE, { x,y,w:ww,h:barH, fill:{color:p.color}, line:{color:p.color} });
    s.addText(p.label, { x:x+0.05,y,w:ww>0.4?ww-0.05:2.2,h:barH, fontSize:8.5, color:C_WHITE, bold:true, fontFace:'Calibri', valign:'middle', margin:0 });
  });
  addPlaceholder(s, 6.05, 0.82, 3.6, 4.58, 'Gantt-diagram kepernyo\nide illesszd be a projekttervezo eszkoz kepet');
}

// SLIDE 8 - Munkamegosztas
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Munkamegosztas - Ki, mit csinalt?');
  const members = [
    { name:'Kugli Balazs',       role:'Backend  Frontend  Caching', color:C_DARK,   tasks:['Node.js/Express.js szerver architektura','MongoDB adatbazis modellezese (Mongoose)','Redis cache + Lua szkriptek','REST API vegpontok implementalasa','React komponensek fejlesztese','JWT + 2FA hitelesitesi rendszer','PayPal es Google Pay integracio','E2EE chat (Signal protokoll)'] },
    { name:'Hargitai Tamas',     role:'Teszteles',                  color:C_PRIMARY, tasks:['Egyseg- es integracios tesztek','Adatbazis tesztelesi szkriptek','Teljesitmenyteszteles (autocannon)','Playwright end-to-end tesztek','Tesztfelhasznalok letrehozasa','Biztonsagi teszteles'] },
    { name:'Peti Aliz Andrea',   role:'UI/UX  Dark Mode',           color:'7C3AED',  tasks:['Dark mode implementacio','Tailwind CSS testreszabas','Felhasználói felület tervezes','Reszponzív mobil nezetek','CSS animaciok es atmenetek'] },
  ];
  members.forEach((m, i) => {
    const x = 0.25+i*3.28;
    s.addShape(pres.shapes.RECTANGLE, { x,y:0.82,w:3.12,h:4.68, fill:{color:C_GRAY_BG}, line:{color:C_CARD_LINE} });
    s.addShape(pres.shapes.RECTANGLE, { x,y:0.82,w:3.12,h:0.72, fill:{color:m.color}, line:{color:m.color} });
    s.addText(m.name, { x:x+0.12,y:0.86,w:2.88,h:0.38, fontSize:13, bold:true, color:C_WHITE, fontFace:'Calibri', margin:0 });
    s.addText(m.role, { x:x+0.12,y:1.22,w:2.88,h:0.28, fontSize:9.5, color:'FFE5DC', italic:true, fontFace:'Calibri', margin:0 });
    s.addText(bullets(m.tasks), { x:x+0.12,y:1.64,w:2.88,h:3.76, fontSize:10.5, color:C_TEXT, fontFace:'Calibri', valign:'top' });
  });
}

addSectionSlide(pres, '04', 'A kesz szoftver', 'Funkciok, forraskod es kepernyo kepek');

// SLIDE 9 - Auth
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Hitelesites es Biztonsag');
  s.addText('Tobbretegu biztonsagi architektura', { x:0.35,y:0.82,w:4.7,h:0.38, fontSize:13, bold:true, color:C_DARK, fontFace:'Calibri', margin:0 });
  s.addText(bullets(['Email-alapu fiokellenszes (SendGrid)','2FA - Dioxus mobil app (veletlen 3 szam)','JWT token + Redis session tarolas','bcrypt jelszohasheles (cost factor 12)','CSRF: double-submit cookie (XSRF-TOKEN, 30 perc)','Rate limiting: 5 retegben (utvonanankent)','Login: 35 kiszert./15 perc (RedisStore)','HMAC-SHA256 IP hasheles (GDPR 32. cikk)','Eldobhato email bl. + jelszo tiltolista (zxcvbn)','Anti-enumeracio (HTTP 200 meglévo fioknál is)','SecurityLogs: 90 nap TTL + 500/user cap']),
    { x:0.35,y:1.26,w:4.7,h:4.05, fontSize:10.5, color:C_TEXT });
  const t9 = [
    {text:'// src/middleware/security.js\n',type:'cmt'},
    {text:'const ',type:'kw'},{text:'LoginLimiter',type:'prop'},{text:' = rateLimit({\n  windowMs: ',type:'plain'},
    {text:'15',type:'num'},{text:' * ',type:'plain'},{text:'60',type:'num'},{text:' * ',type:'plain'},{text:'1000',type:'num'},{text:',  // 15 perc\n  max: ',type:'plain'},
    {text:'35',type:'num'},{text:',\n  store: ',type:'plain'},{text:'new',type:'kw'},{text:' RedisStore({ client }),\n  handler: (req, res) => {\n    res.status(',type:'plain'},
    {text:'429',type:'num'},{text:').sendFile(\n      ',type:'plain'},{text:"'public/429/429.html'",type:'str'},{text:');\n  }\n});\n\n',type:'plain'},
    {text:'// CSRF double-submit cookie\n',type:'cmt'},
    {text:'const ',type:'kw'},{text:'tok',type:'fn'},{text:' = crypto.randomBytes(',type:'plain'},
    {text:'24',type:'num'},{text:').toString(',type:'plain'},{text:"'hex'",type:'str'},{text:');\n',type:'plain'},
    {text:'res',type:'prop'},{text:'.cookie(',type:'plain'},{text:"'XSRF-TOKEN'",type:'str'},{text:', tok, { httpOnly: ',type:'plain'},
    {text:'false',type:'kw'},{text:',\n  sameSite: ',type:'plain'},{text:"'Strict'",type:'str'},{text:', secure: ',type:'plain'},
    {text:'true',type:'kw'},{text:', maxAge: ',type:'plain'},{text:'1800000',type:'num'},{text:' });\n\n',type:'plain'},
    {text:'// IP hash (GDPR 32. cikk)\n',type:'cmt'},
    {text:'const ',type:'kw'},{text:'hashedIp',type:'prop'},
    {text:' = crypto\n  .createHmac(',type:'plain'},{text:"'sha256'",type:'str'},{text:', process.env.IP_HASH_SECRET)\n  .update(clientIp).digest(',type:'plain'},{text:"'hex'",type:'str'},{text:');',type:'plain'},
  ];
  addCodeBlockSyntax(s, t9, 5.2, 0.82, 4.45, 4.58, 8.0);
}
{ const s=pres.addSlide(); s.background={color:C_WHITE}; addHeader(s,'Hitelesites - Kepernyo kepek'); addPlaceholder(s,0.35,0.82,4.72,4.55,'Kepernyo kep: Bejelentkezesi oldal'); addPlaceholder(s,5.25,0.82,4.4,4.55,'Kepernyo kep: 2FA form / Email megerosites'); }

// SLIDE 10 - Redis
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Redis Cache es Lua szkriptek');
  s.addText('Atomi muveletek es gyorsito tarazas', { x:0.35,y:0.82,w:4.7,h:0.38, fontSize:13, bold:true, color:C_DARK, fontFace:'Calibri', margin:0 });
  s.addText(bullets(['Redis-first cache API valaszhoz (cacheResult MW)','Lua szkriptek atomi penztalca-frissiteshez','NOSCRIPT fallback (EVALSHA => EVAL)','Rate limiting: Redis Lua csuszoablak','2FA kodok idoleges tarolasa (TTL: 10 perc)','E2EE pubkey cache (e2ee:pubkey:{id}, 30 nap)','Dashboard change stream ervenytelenites','keepAliveTimeout: 65000ms (AWS ALB felett)']),
    { x:0.35,y:1.26,w:4.7,h:3.0, fontSize:11, color:C_TEXT });
  const t10 = [
    {text:'// src/redis-lua.js\n',type:'cmt'},
    {text:'async ',type:'kw'},{text:'executeScript',type:'fn'},{text:'(name, numKeys, args) {\n  const ',type:'plain'},
    {text:'{ sha, script }',type:'prop'},{text:' = this.scripts.get(name);\n  ',type:'plain'},
    {text:'try ',type:'kw'},{text:'{\n    return await this.client.evalSha(sha, {\n      keys: args.slice(',type:'plain'},
    {text:'0',type:'num'},{text:', numKeys),\n      arguments: args.slice(numKeys) });\n  } ',type:'plain'},
    {text:'catch ',type:'kw'},{text:'(e) {\n    if (e.message.includes(',type:'plain'},
    {text:"'NOSCRIPT'",type:'str'},{text:'))\n      return await this.client.eval(script, {\n        keys: args.slice(',type:'plain'},
    {text:'0',type:'num'},{text:', numKeys),\n        arguments: args.slice(numKeys) });\n    throw e;\n  }\n}\n\n',type:'plain'},
    {text:'-- wallet_update.lua\n',type:'cmt'},
    {text:'local ',type:'kw'},{text:'bal',type:'prop'},
    {text:" = tonumber(redis.call('GET', KEYS[",type:'plain'},{text:'1',type:'num'},{text:"]) or '0')\n",type:'plain'},
    {text:'if ',type:'kw'},{text:'bal + tonumber(ARGV[',type:'plain'},{text:'1',type:'num'},{text:']) < ',type:'plain'},
    {text:'0',type:'num'},{text:' then\n  return redis.error_reply(',type:'plain'},
    {text:"'INSUFFICIENT_FUNDS'",type:'str'},{text:')\nend\n',type:'plain'},
    {text:"redis.call('SET', KEYS[1], tostring(bal + tonumber(ARGV[1])))",type:'plain'},
  ];
  addCodeBlockSyntax(s, t10, 5.2, 0.82, 4.45, 4.58, 7.8);
}
{ const s=pres.addSlide(); s.background={color:C_WHITE}; addHeader(s,'Redis Cache - Kepernyo kepek'); addPlaceholder(s,0.35,0.82,4.72,4.55,'Kepernyo kep: Redis monitor / Lua debug'); addPlaceholder(s,5.25,0.82,4.4,4.55,'Kepernyo kep: Cache dashboard / session store'); }

// SLIDE 11 - Orders
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Rendelesi rendszer');
  s.addText('Funkciok es adatmodell', { x:0.35,y:0.82,w:4.7,h:0.38, fontSize:13, bold:true, color:C_DARK, fontFace:'Calibri', margin:0 });
  s.addText(bullets(['Dinamikus menukezeles kategoraikkal','Valos ideju keszletkovetes (pre-save hook)','QR kod integracio + allergen szuro','Napi menu ($sample fallback, idoszak-alapu)','NanoID 6-kar. kozos rendelesazonosito','15 perces auto-lemondas (Pending => Cancelled)','Fuzzy profanity szuro (ertekelesokhoz, Lev. <=1)','Editor: TILTOTT rendeles (isEditor prop)','Szulo: resolveOrderTargetUserId']),
    { x:0.35,y:1.26,w:4.7,h:3.7, fontSize:10.5, color:C_TEXT });
  const t11 = [
    {text:'// config/database_queries.js\n',type:'cmt'},
    {text:'const ',type:'kw'},{text:'OrderSchema',type:'type'},{text:' = new Schema({\n  ',type:'plain'},
    {text:'userId',type:'prop'},{text:':    ObjectId,\n  ',type:'plain'},
    {text:'publicID',type:'prop'},{text:':  String,  ',type:'plain'},{text:'// nanoid(), 6 kar.\n  ',type:'cmt'},
    {text:'status',type:'prop'},{text:': { type: String,\n    enum: [',type:'plain'},
    {text:"'Pending'",type:'str'},{text:', ',type:'plain'},{text:"'Completed'",type:'str'},{text:', ',type:'plain'},{text:"'Cancelled'",type:'str'},{text:'] },\n  ',type:'plain'},
    {text:'paymentMethod',type:'prop'},{text:': String,\n  ',type:'plain'},
    {text:'orderDate',type:'prop'},{text:': { type: Date,\n    default: Date.now },\n});\n\n',type:'plain'},
    {text:'// Pre-save: 15 perces auto-lemondas\n',type:'cmt'},
    {text:'OrderSchema',type:'type'},{text:'.pre(',type:'plain'},{text:"'save'",type:'str'},{text:', function () {\n  const ',type:'plain'},
    {text:'age',type:'prop'},{text:' = Date.now() - this.orderDate;\n  ',type:'plain'},
    {text:'if ',type:'kw'},{text:'(age > ',type:'plain'},{text:'15',type:'num'},{text:' * ',type:'plain'},{text:'60_000',type:'num'},{text:'\n      && this.status === ',type:'plain'},
    {text:"'Pending'",type:'str'},{text:')\n    this.status = ',type:'plain'},{text:"'Cancelled'",type:'str'},{text:';\n});',type:'plain'},
  ];
  addCodeBlockSyntax(s, t11, 5.2, 0.82, 4.45, 4.58, 7.8);
}

// SLIDE 11b - Editor und Parent
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Editor tiltas es Szulo -> Diak rendeles');
  s.addText('Szerepkor-alapu rendelesvedelem', { x:0.35,y:0.82,w:4.7,h:0.38, fontSize:13, bold:true, color:C_DARK, fontFace:'Calibri', margin:0 });
  s.addText(bullets(['denyEditorOrderPlacement - POST rendelesi vegpontokon','Editor fiok: 403 Forbidden, rendeles megtagadva','resolveOrderTargetUserId - szuloi belepesnel','ParentStudent kapcsolat (status: approved)','Rendeles gyermek nevere, leval szulo egyenlegbol','MongoDB withTransaction() - atomi 3-lepesu folyamat']),
    { x:0.35,y:1.26,w:4.7,h:2.8, fontSize:11, color:C_TEXT });
  const t11b = [
    {text:'// src/auth/middleware.js\n',type:'cmt'},
    {text:'const ',type:'kw'},{text:'denyEditorOrderPlacement',type:'fn'},{text:' = (req, res, next) => {\n  ',type:'plain'},
    {text:'if ',type:'kw'},{text:'(isEditorUser(req))\n    return res.status(',type:'plain'},{text:'403',type:'num'},{text:').json({ error: ',type:'plain'},{text:"'Forbidden'",type:'str'},{text:' });\n  next();\n};\n\n',type:'plain'},
    {text:'// Szulo -> Diak feloldas\n',type:'cmt'},
    {text:'const ',type:'kw'},{text:'resolveOrderTargetUserId',type:'fn'},{text:' = async (req, userId) => {\n  ',type:'plain'},
    {text:'if ',type:'kw'},{text:'(!isParentUser(req)) return userId;\n  const link = await ParentStudent\n    .findOne({ parentId: userId,\n               studentId,\n               status: ',type:'plain'},
    {text:"'approved'",type:'str'},{text:' }).lean();\n  ',type:'plain'},
    {text:'if ',type:'kw'},{text:'(!link) throw errorWith(',type:'plain'},{text:'403',type:'num'},{text:');\n  return studentId;\n};\n\n',type:'plain'},
    {text:'// Atomi fizetes\n',type:'cmt'},
    {text:'await ',type:'kw'},{text:'session.withTransaction(async () => {\n  payer.balance -= totalInUSD;\n  ',type:'plain'},
    {text:'await ',type:'kw'},{text:'payer.save({ session });\n  ',type:'plain'},
    {text:'await ',type:'kw'},{text:'Order.create([orderDoc], { session });\n  ',type:'plain'},
    {text:'await ',type:'kw'},{text:'deductStock(items, session);\n});',type:'plain'},
  ];
  addCodeBlockSyntax(s, t11b, 5.2, 0.82, 4.45, 4.58, 7.5);
}
{ const s=pres.addSlide(); s.background={color:C_WHITE}; addHeader(s,'Rendelesi rendszer - Kepernyo kepek'); addPlaceholder(s,0.35,0.82,4.72,4.55,'Kepernyo kep: Rendelesi oldal / kosar'); addPlaceholder(s,5.25,0.82,4.4,4.55,'Kepernyo kep: Mobil nezet / napi menu'); }

// SLIDE 12 - Payments
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Fizetesi integracio - PayPal es Google Pay');
  s.addText('Fizetesi megoldasok', { x:0.35,y:0.82,w:4.7,h:0.38, fontSize:13, bold:true, color:C_DARK, fontFace:'Calibri', margin:0 });
  s.addText(bullets(['PayPal SDK (@paypal/paypal-server-sdk)','Google Pay API integracio','Virtualis penztalca egyenleg rendszer','MongoDB withTransaction() atomi fizetes','Devizakonverzio: HUF x0.0027, EUR x1.1 (USD)','Idempotens keresek (transactionId unique index)','Raw body tarol (webhook alairas-ellenorzes)','Audit trail minden penzugyi esemenynel']),
    { x:0.35,y:1.26,w:4.7,h:3.0, fontSize:11, color:C_TEXT });
  const t12 = [
    {text:'// src/payments/paypal.js\n',type:'cmt'},
    {text:'router.post(',type:'plain'},{text:"'/paypal'",type:'str'},{text:', async (req, res) => {\n  const ',type:'plain'},
    {text:'{ orderID, amount, currency }',type:'prop'},{text:' = req.body;\n  ',type:'plain'},
    {text:'await ',type:'kw'},{text:'Payment.create({\n    userId, amount: parseFloat(amount),\n    currency: currency || ',type:'plain'},
    {text:"'USD'",type:'str'},{text:',\n    paymentMethod: ',type:'plain'},{text:"'PayPal'",type:'str'},
    {text:',\n    status: ',type:'plain'},{text:"'Completed'",type:'str'},
    {text:',\n    transactionId: orderID,\n  });\n});\n\n',type:'plain'},
    {text:'// Devizakonverzio\n',type:'cmt'},
    {text:'const ',type:'kw'},{text:'RATES',type:'type'},{text:' = { HUF: ',type:'plain'},
    {text:'0.0027',type:'num'},{text:', EUR: ',type:'plain'},{text:'1.1',type:'num'},{text:', USD: ',type:'plain'},{text:'1.0',type:'num'},{text:' };\n',type:'plain'},
    {text:'const ',type:'kw'},{text:'convertCurrencyToUSD',type:'fn'},{text:' = (amt, curr) =>\n  amt * (RATES[curr] ?? ',type:'plain'},
    {text:'1.0',type:'num'},{text:');',type:'plain'},
  ];
  addCodeBlockSyntax(s, t12, 5.2, 0.82, 4.45, 4.58, 7.8);
}
{ const s=pres.addSlide(); s.background={color:C_WHITE}; addHeader(s,'Fizetesi integracio - Kepernyo kepek'); addPlaceholder(s,0.35,0.82,4.72,4.55,'Kepernyo kep: PayPal checkout oldal'); addPlaceholder(s,5.25,0.82,4.4,4.55,'Kepernyo kep: Google Pay / Penztalca egyenleg'); }

// SLIDE 13 - Admin
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Admin es Editor Dashboard');
  s.addText('Adminisztratori funkciok', { x:0.35,y:0.82,w:4.7,h:0.38, fontSize:13, bold:true, color:C_DARK, fontFace:'Calibri', margin:0 });
  s.addText(bullets(['Menuelem CRUD + Jutalmak (Reward) kezelese','Statisztikak: mean/median/stddev (simple-statistics)','Top-5 legrendeltebb etel (all-time es utolso 7 nap)','Felhasznalok tiltasa es szerepkor-valtas','SecurityLogs: 90 nap TTL + 500/user cap','cacheResult() transparens GET cache MW','RBAC: requireAdmin/Editor/Student/ParentAuth','403: no_perm.html redirect (nem JSON)']),
    { x:0.35,y:1.26,w:4.7,h:3.4, fontSize:11, color:C_TEXT });
  const t13 = [
    {text:'// cache-service.js\n',type:'cmt'},
    {text:'function ',type:'kw'},{text:'cacheResult',type:'fn'},{text:'(key, ttl = ',type:'plain'},{text:'300',type:'num'},{text:') {\n  return async (req, res, next) => {\n    ',type:'plain'},
    {text:'if ',type:'kw'},{text:'(req.method !== ',type:'plain'},{text:"'GET'",type:'str'},{text:') return next();\n    const cached = await redis.get(key);\n    ',type:'plain'},
    {text:'if ',type:'kw'},{text:'(cached) return res.status(',type:'plain'},{text:'200',type:'num'},{text:').json(JSON.parse(cached));\n    const orig = res.json.bind(res);\n    res.json = (data) => {\n      redis.setEx(key, ttl, JSON.stringify(data));\n      return orig(data);\n    };\n    next();\n  };\n}\n\n',type:'plain'},
    {text:'// simple-statistics\n',type:'cmt'},
    {text:'const ',type:'kw'},{text:'ts',type:'prop'},{text:" = await User.find({}, 'createdAt').lean();\n",type:'plain'},
    {text:'return ',type:'kw'},
    {text:'{ mean: ss.mean(ts), median: ss.median(ts),\n  stddev: ss.standardDeviation(ts) };',type:'plain'},
  ];
  addCodeBlockSyntax(s, t13, 5.2, 0.82, 4.45, 4.58, 7.5);
}
{ const s=pres.addSlide(); s.background={color:C_WHITE}; addHeader(s,'Admin Dashboard - Kepernyo kepek'); addPlaceholder(s,0.35,0.82,4.72,4.55,'Kepernyo kep: Admin dashboard fooldal'); addPlaceholder(s,5.25,0.82,4.4,4.55,'Kepernyo kep: Menukezelo / rendelesista'); }

// SLIDE 14 - DB
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Adatbazis architektura');
  s.addText('Fo MongoDB entitasok', { x:0.35,y:0.82,w:3.6,h:0.38, fontSize:13, bold:true, color:C_DARK, fontFace:'Calibri', margin:0 });
  const entities = [
    ['User','Identitas, egyenleg, eszkozok (ECDH P-256)'],
    ['MenuItems','Etelek, keszlet, ertekelesek (beagyazva)'],
    ['Order','Rendelesek, NanoID publicID, auto-cancel'],
    ['Payment','Tranzakciok, deviza, audit trail'],
    ['UserLoyalty','Pontok (4-9/$), decay, Bronze-Platinum'],
    ['Reward/Redemption','Bevaltható jutalmak, utalonykodok'],
    ['MoneyRequest','Diak-Szulo penzkérelem (pending/approved)'],
    ['SecurityLogs','Esemenynaplo, 90 napos TTL, 500/user'],
    ['Message+PreKey','E2EE uzenetek, X3DH + Double Ratchet'],
  ];
  entities.forEach((e, i) => {
    const y = 1.25 + i * 0.455; const bg = i%2===0?C_GRAY_BG:C_WHITE;
    s.addShape(pres.shapes.RECTANGLE, { x:0.35,y,w:4.85,h:0.43, fill:{color:bg}, line:{color:C_CARD_LINE,width:0.5} });
    s.addShape(pres.shapes.RECTANGLE, { x:0.35,y,w:0.06,h:0.43, fill:{color:C_PRIMARY}, line:{color:C_PRIMARY} });
    s.addText(e[0], { x:0.48,y,w:1.7,h:0.43, fontSize:10, bold:true, color:C_DARK, fontFace:'Calibri', valign:'middle', margin:0 });
    s.addText(e[1], { x:2.2,y,w:3.0,h:0.43, fontSize:9.5, color:C_MUTED, fontFace:'Calibri', valign:'middle', margin:0 });
  });
  try { s.addImage({ path:'docs/Database.png', x:5.35,y:0.82,w:4.3,h:4.58 }); } catch(e) { addPlaceholder(s,5.35,0.82,4.3,4.58,'Database.png\n(nem talalhato)'); }
}

// SLIDE 14b - User schema
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Adatbazis - User sema (ECDH P-256)');
  s.addText('Felhasznalo adatmodell', { x:0.35,y:0.82,w:4.7,h:0.38, fontSize:13, bold:true, color:C_DARK, fontFace:'Calibri', margin:0 });
  s.addText(bullets(['Egyedi username + email (unique index)','usertype: student / parent / admin / editor','bcrypt jelszo, isVerified + isBanned zaszlok','balance: digitalis penztalca (Lua atomi)','identity: ECDH P-256 nyilvanos kulcs (V2)','devices[]: signedPreKey csomag (Signal)','V1 RSA-OAEP mezok megmaradnak migracioig']),
    { x:0.35,y:1.26,w:4.7,h:3.0, fontSize:11, color:C_TEXT });
  const t14b = [
    {text:'// src/models/User.js\n',type:'cmt'},
    {text:'const ',type:'kw'},{text:'userSchema',type:'type'},{text:' = new Schema({\n  ',type:'plain'},
    {text:'username',type:'prop'},{text:': { type: String,\n    unique: ',type:'plain'},{text:'true',type:'kw'},{text:', required: ',type:'plain'},{text:'true',type:'kw'},{text:' },\n  ',type:'plain'},
    {text:'usertype',type:'prop'},{text:': { type: String,\n    default: ',type:'plain'},{text:"'student'",type:'str'},{text:',\n    enum: [',type:'plain'},
    {text:"'admin'",type:'str'},{text:', ',type:'plain'},{text:"'student'",type:'str'},{text:', ',type:'plain'},{text:"'parent'",type:'str'},{text:', ',type:'plain'},{text:"'editor'",type:'str'},{text:'] },\n  ',type:'plain'},
    {text:'balance',type:'prop'},{text:': { type: Number, default: ',type:'plain'},{text:'0',type:'num'},{text:' },\n  ',type:'plain'},
    {text:'// V2 E2EE: ECDH P-256\n  ',type:'cmt'},
    {text:'identity',type:'prop'},{text:': {\n    ',type:'plain'},
    {text:'publicKey',type:'prop'},{text:':        String,\n    ',type:'plain'},
    {text:'signingPublicKey',type:'prop'},{text:': String,\n  },\n  ',type:'plain'},
    {text:'devices',type:'prop'},{text:': [{ ',type:'plain'},{text:'deviceId',type:'prop'},{text:': String,\n              ',type:'plain'},{text:'signedPreKey',type:'prop'},{text:': Object }],\n  ',type:'plain'},
    {text:'// V1 legacy\n  ',type:'cmt'},
    {text:'encryption',type:'prop'},{text:': Mixed,\n});',type:'plain'},
  ];
  addCodeBlockSyntax(s, t14b, 5.2, 0.82, 4.45, 4.58, 7.8);
}

// SLIDE 15 - E2EE & Loyalty
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'E2EE Chat es Husegprogram');
  s.addShape(pres.shapes.RECTANGLE, { x:0.35,y:0.82,w:4.7,h:0.42, fill:{color:C_DARK}, line:{color:C_DARK} });
  s.addText('Vegponttol vegpontig titkositott chat (E2EE)', { x:0.45,y:0.82,w:4.5,h:0.42, fontSize:12, bold:true, color:C_WHITE, fontFace:'Calibri', valign:'middle', margin:0 });
  s.addText(bullets(['X3DH kulcscsere + Double Ratchet protokoll','ECDH P-256 (V2); V1 RSA-OAEP => migracio','PreKey bundle: deviceId + signedPreKey','Pubkey Redis cache (e2ee:pubkey:{id}, 30 nap)','StorageBlob + skipped keys tarolasa']),
    { x:0.35,y:1.27,w:4.7,h:1.88, fontSize:11, color:C_TEXT });
  s.addShape(pres.shapes.RECTANGLE, { x:0.35,y:3.28,w:4.7,h:0.42, fill:{color:C_PRIMARY}, line:{color:C_PRIMARY} });
  s.addText('Husegprogram - Bronze => Platinum', { x:0.45,y:3.28,w:4.5,h:0.42, fontSize:12, bold:true, color:C_WHITE, fontFace:'Calibri', valign:'middle', margin:0 });
  s.addText(bullets(['4-9 pont/USD; unnepi: x1.5, karacsony: x1.2','Egeszseghszint >=75: +40%, >=50: +20% bonus','Decay: 90 nap inaktivitas => 50% pontlev. (Plat.: 30%)','Havi ingyenes ital: Silver:1, Gold:2, Platinum:4']),
    { x:0.35,y:3.74,w:4.7,h:1.66, fontSize:11, color:C_TEXT });
  const t15 = [
    {text:'// src/LoyaltySystem/loyalty-service.js\n',type:'cmt'},
    {text:'function ',type:'kw'},{text:'ConvertPoints',type:'fn'},{text:'(amount, tier, healthScore, date) {\n  let pts = ',type:'plain'},{text:'0',type:'num'},{text:';\n  ',type:'plain'},
    {text:'for ',type:'kw'},{text:'(let i = ',type:'plain'},{text:'0',type:'num'},{text:'; i < Math.floor(amount); i++)\n    pts += Math.floor(Math.random() * ',type:'plain'},
    {text:'6',type:'num'},{text:') + ',type:'plain'},{text:'4',type:'num'},{text:';  ',type:'plain'},{text:'// 4-9 pont/$\n  ',type:'cmt'},
    {text:'if ',type:'kw'},{text:'(isHoliday(date))       pts *= ',type:'plain'},{text:'1.5',type:'num'},{text:';\n  ',type:'plain'},
    {text:'if ',type:'kw'},{text:'(isHolidaySeason(date)) pts *= ',type:'plain'},{text:'1.2',type:'num'},{text:';\n  ',type:'plain'},
    {text:'if ',type:'kw'},{text:'(healthScore >= ',type:'plain'},{text:'75',type:'num'},{text:') pts *= ',type:'plain'},{text:'1.4',type:'num'},{text:';\n  ',type:'plain'},
    {text:'else if ',type:'kw'},{text:'(healthScore >= ',type:'plain'},{text:'50',type:'num'},{text:') pts *= ',type:'plain'},{text:'1.2',type:'num'},{text:';\n  ',type:'plain'},
    {text:'return ',type:'kw'},{text:'Math.floor(pts);\n}\n\n',type:'plain'},
    {text:'// Decay: -50% (Platinum: -30%)\n',type:'cmt'},
    {text:'const ',type:'kw'},{text:'lossRate',type:'prop'},{text:' = tier === ',type:'plain'},{text:"'PLATINUM'",type:'str'},
    {text:' ? ',type:'plain'},{text:'0.30',type:'num'},{text:' : ',type:'plain'},{text:'0.50',type:'num'},{text:';',type:'plain'},
  ];
  addCodeBlockSyntax(s, t15, 5.2, 0.82, 4.45, 4.58, 7.5);
}
{ const s=pres.addSlide(); s.background={color:C_WHITE}; addHeader(s,'E2EE Chat es Husegprogram - Kepernyo kepek'); addPlaceholder(s,0.35,0.82,4.72,4.55,'Kepernyo kep: E2EE chat interface'); addPlaceholder(s,5.25,0.82,4.4,4.55,'Kepernyo kep: Husegprogram / pontok oldal'); }

// Diagram slides
[
  { path:'docs/diagrams/output-1.svg',               title:'Rendszer architektura' },
  { path:'docs/diagrams/output-2.svg',               title:'Adatfolyam diagram' },
  { path:'docs/diagrams/output-9.svg',               title:'Ketlepcsos azonositas (2FA) - folyamat' },
  { path:'docs/diagrams/output-13.svg',              title:'Frontend architektura' },
  { path:'docs/diagrams/snaptray_redis_key_map.svg', title:'Redis kulcsszerkezet' },
].forEach(d => {
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, d.title);
  try { s.addImage({ path:d.path, x:0.3,y:0.76,w:9.4,h:4.62 }); }
  catch(e) { addPlaceholder(s,0.3,0.76,9.4,4.62,`${d.path}\n(nem talalhato)`); }
});

// onefetch slides
['onefetch #1\n\nFuttasd: onefetch\n\nNyelvek aranya, commit-szam,\nkozremuk datok, repo merete.',
 'onefetch #2\n\nFuttasd: onefetch --no-color\n\nFajlok szama, kodsorok,\natlagos commit merete.',
].forEach((label, i) => {
  const s = pres.addSlide();
  s.background = { color: C_CODE_BG };
  addHeader(s, `Repozitorium attekintes - onefetch #${i+1}`);
  s.addText(i===0 ? 'iskolaprojekt-1 - kodbazis statisztikak' : 'iskolaprojekt-1 - reszletes statisztikak', {
    x:0.4,y:0.82,w:9.2,h:0.36, fontSize:12, bold:true, color:C_SECONDARY, fontFace:'Calibri', margin:0,
  });
  addPlaceholder(s,0.4,1.26,9.2,4.1,label);
});

// autocannon
{
  const s = pres.addSlide();
  s.background = { color: C_WHITE };
  addHeader(s, 'Teljesitmenyteszt - autocannon (35 000 ker/s)');
  s.addText('Tesztkörnyezet es eredmenyek', { x:0.35,y:0.82,w:4.7,h:0.38, fontSize:13, bold:true, color:C_DARK, fontFace:'Calibri', margin:0 });
  s.addText(bullets(['35 000 keres/mp - nehez DB es Redis útvonalon','autocannon -c 100 -d 30 http://localhost:3000/...','100 parhuzamos kapcsolat, 30 mp-es teszt','Atlagos keses: <3ms (Redis cache aktivan)','P99 keses: <10ms terhelt kornyezetben','Gzip tomörités: compression() MW aktiv','keepAliveTimeout: 65000ms (AWS ALB folott)']),
    { x:0.35,y:1.26,w:4.7,h:3.0, fontSize:11.5, color:C_TEXT });
  addCodeBlock(s,
`# autocannon teszt
npx autocannon -c 100 -d 30 \\
  http://localhost:3000/api/menu-items

Stat       Avg      StdDev  Max
Latency    0.28 ms  0.5 ms  12 ms
Req/Sec   35 000   2 100   38 500
Bytes/s   12.4 MB  1.1 MB  14.8 MB`,
    0.35, 4.3, 4.7, 1.1, 8.5);
  addPlaceholder(s,5.2,0.82,4.45,4.58,'autocannon eredmeny kepernyo kep\n35 000 req/s\n\nillesszd be a kepernyo kepet');
}

addSectionSlide(pres, '05', 'Koszonjuk', 'Szivesen valaszolunk kerdesekre!');

// SLIDE 16 - Thank you
{
  const s = pres.addSlide();
  s.background = { color: C_DARK };
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:0,w:0.14,h:5.625, fill:{color:C_PRIMARY}, line:{color:C_PRIMARY} });
  s.addShape(pres.shapes.RECTANGLE, { x:0,y:5.23,w:10,h:0.395, fill:{color:C_PRIMARY}, line:{color:C_PRIMARY} });
  s.addText('Koszonjuk a figyelmet!', { x:0.35,y:0.85,w:9.2,h:1.4, fontSize:52, bold:true, color:C_WHITE, fontFace:'Calibri', align:'center', valign:'middle', margin:0 });
  s.addText('SnapTray - Iskolai Menza Rendelorendszer', { x:0.35,y:2.3,w:9.2,h:0.58, fontSize:20, color:C_SECONDARY, fontFace:'Calibri', align:'center', margin:0 });
  s.addShape(pres.shapes.RECTANGLE, { x:2.0,y:3.1,w:6.0,h:1.72, fill:{color:C_CHARCOAL}, line:{color:C_PRIMARY,width:1.5} });
  s.addText([
    { text:'Kugli Balazs',     options:{breakLine:true, bold:true, color:C_SECONDARY} },
    { text:'Hargitai Tamas',   options:{breakLine:true, bold:true, color:C_SECONDARY} },
    { text:'Peti Aliz Andrea', options:{bold:true, color:C_SECONDARY} },
  ], { x:2.0,y:3.1,w:6.0,h:1.72, fontSize:16, fontFace:'Calibri', align:'center', valign:'middle' });
  s.addText('Van kerdes?', { x:0.35,y:5.23,w:9.2,h:0.395, fontSize:14, color:C_WHITE, fontFace:'Calibri', align:'center', italic:true, valign:'middle', margin:0 });
}

// WRITE
pres.writeFile({ fileName: 'SnapTray_Prezentacio_v3.pptx' })
  .then(() => console.log('OK  SnapTray_Prezentacio_v3.pptx elkeszult!'))
  .catch(err => { console.error('HIBA:', err); process.exit(1); });
