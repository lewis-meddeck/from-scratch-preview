// Draws a placeholder garment with the design name printed on it.
// Used until real product photos are added (see HANDOVER.md, "Adding photos").
// Works both in the browser and in the Node build script.

const COLOURS = {
  black: '#141414', white: '#f4f1ea', beige: '#d9c7a7', cream: '#efe4cc', brown: '#6b4a32',
  green: '#3f5b3e', grey: '#8a8a88', red: '#9e2b25', pink: '#e7a5b5', 'bright pink': '#e0457b',
  yellow: '#e8c547', orange: '#e07b2e', blue: '#2f5d8a', purple: '#5d3f7a',
  multicolour: 'multi', multicolor: 'multi', animal: 'animal'
};

const LIGHT = new Set(['white', 'beige', 'cream', 'pink', 'yellow', 'grey']);

export function colourOf(label) {
  if (!label) return 'black';
  const l = label.toLowerCase().trim();
  const paren = l.match(/\(([^)]+)\)\s*$/);
  const key = paren ? paren[1].trim() : l;
  if (key.includes('&')) return key.split('&')[0].trim() in COLOURS ? key.split('&')[0].trim() : 'black';
  return key in COLOURS ? key : 'black';
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Split a phrase into at most 3 balanced lines.
function lines(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (text.length <= 12 || words.length === 1) return [text];
  const n = text.length > 26 ? 3 : 2;
  const target = text.length / n;
  const out = []; let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > target + 3 && out.length < n - 1) { out.push(cur); cur = w; }
    else cur = cur ? cur + ' ' + w : w;
  }
  out.push(cur);
  return out;
}

const SHAPES = {
  tee: 'M70 40 L120 22 Q150 44 180 22 L230 40 L280 92 L246 124 L222 104 L222 300 L78 300 L78 104 L54 124 L20 92 Z',
  crew: 'M70 40 L120 24 Q150 42 180 24 L230 40 L262 120 L282 268 L250 274 L222 140 L222 300 L78 300 L78 140 L50 274 L18 268 L38 120 Z',
  hoodie: 'M70 50 L112 34 Q108 6 150 4 Q192 6 188 34 L230 50 L262 126 L282 274 L250 280 L222 146 L222 304 L78 304 L78 146 L50 280 L18 274 L38 126 Z',
  kids: 'M86 64 L124 50 Q150 66 176 50 L214 64 L252 104 L226 128 L208 114 L208 282 L92 282 L92 114 L74 128 L48 104 Z',
  tote: 'M60 96 L240 96 L252 304 L48 304 Z'
};

export function mockupSVG(garment, label, opts = {}) {
  const g = SHAPES[garment] ? garment : 'tee';
  const colour = colourOf(label);
  const fillKey = COLOURS[colour] || COLOURS.black;
  const id = 'm' + Math.random().toString(36).slice(2, 8);
  let fill = fillKey;
  let defs = `<linearGradient id="${id}g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f6dd8c"/><stop offset=".5" stop-color="#d4a63a"/><stop offset="1" stop-color="#a87a1c"/></linearGradient>`;
  if (fillKey === 'multi') {
    defs += `<linearGradient id="${id}f" x1="0" x2="1"><stop offset="0" stop-color="#e07b2e"/><stop offset=".33" stop-color="#e8c547"/><stop offset=".66" stop-color="#3f8a6e"/><stop offset="1" stop-color="#2f5d8a"/></linearGradient>`;
    fill = `url(#${id}f)`;
  } else if (fillKey === 'animal') {
    defs += `<pattern id="${id}f" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#c9a26b"/><circle cx="7" cy="8" r="4" fill="#3a2a1a"/><circle cx="20" cy="18" r="5" fill="#3a2a1a"/><circle cx="22" cy="5" r="2" fill="#3a2a1a"/></pattern>`;
    fill = `url(#${id}f)`;
  }
  const light = LIGHT.has(colour) || fillKey === 'multi' || fillKey === 'animal';
  const ink = light ? '#1a1408' : `url(#${id}g)`;
  // Text printed on the garment: the design name without the colour suffix.
  const text = (opts.text ?? label ?? 'From Scratch').replace(/\s*\([^)]*\)\s*$/, '') || 'From Scratch';
  const ls = lines(text);
  const cx = 150;
  const cy = g === 'tote' ? 200 : g === 'kids' ? 160 : 150;
  const size = Math.max(16, Math.min(38, (g === 'kids' ? 150 : 190) / Math.max(...ls.map(l => l.length)) * 1.7));
  const lh = size * 1.05;
  const startY = cy - ((ls.length - 1) * lh) / 2;
  const tspans = ls.map((l, i) => `<tspan x="${cx}" y="${(startY + i * lh).toFixed(1)}">${esc(l)}</tspan>`).join('');
  const heartY = startY + (ls.length - 1) * lh + size * 0.85;
  const extras = {
    hoodie: `<path d="M118 36 Q150 70 182 36" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="3"/><path d="M104 232 L196 232 L208 280 L92 280 Z" fill="rgba(0,0,0,.12)"/><line x1="140" y1="56" x2="138" y2="98" stroke="rgba(0,0,0,.3)" stroke-width="2"/><line x1="160" y1="56" x2="162" y2="98" stroke="rgba(0,0,0,.3)" stroke-width="2"/>`,
    tote: `<path d="M100 96 Q100 30 150 30 Q200 30 200 96" fill="none" stroke="${fillKey === 'multi' || fillKey === 'animal' ? '#3a2a1a' : fillKey}" stroke-width="12" stroke-linecap="round"/>`,
    tee: `<path d="M120 22 Q150 44 180 22" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="3"/>`,
    crew: `<path d="M120 24 Q150 42 180 24" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="3"/><rect x="78" y="288" width="144" height="12" fill="rgba(0,0,0,.12)"/>`,
    kids: `<path d="M124 50 Q150 66 176 50" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="3"/>`
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 320" role="img" aria-label="${esc(text)} ${esc(garment)} mock-up"><defs>${defs}</defs>` +
    (g === 'tote' ? extras.tote : '') +
    `<path d="${SHAPES[g]}" fill="${fill}" stroke="rgba(255,255,255,.08)" stroke-width="1.5"/>` +
    (g !== 'tote' ? extras[g] : '') +
    `<text text-anchor="middle" font-family="'Kaushan Script', cursive" font-size="${size.toFixed(1)}" fill="${ink}">${tspans}</text>` +
    `<path transform="translate(${cx - 7} ${heartY.toFixed(1)}) scale(.55)" d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill="none" stroke="${ink}" stroke-width="2.4"/>` +
    `</svg>`;
}
