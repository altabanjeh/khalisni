/**
 * Generates the Khalsni catalog illustration library.
 *
 *   node scripts/gen-catalog-illustrations.mjs
 *
 * One coherent visual language (premium editorial illustration, Khalsni brand
 * palette): a soft brand-tint field, one large low-opacity geometric shape, and
 * a single recognizable subject drawn in flat brand blues + white, seated
 * lower-right on a soft shadow so the top-left stays clear for the card chip.
 *
 * No text inside the art (localization- and RTL-safe). Output is static SVG:
 * tiny, scalable (no srcset needed), deterministic, and overridden the moment an
 * admin uploads a real image (getCover() prefers image_url).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public/images/khalsni')

const W = 1600
const H = 1000

// Khalsni brand family — identity blue, accessible action blue, deep, tint, ink.
const C = {
  brand: '#146ef0',
  action: '#0f5dd8',
  deep: '#0b3aa8',
  sky: '#4f9dff',
  tint: '#dbe8ff',
  tintSoft: '#eef4ff',
  paper: '#ffffff',
  ink: '#12234a',
  gold: '#f5a524',
  green: '#12b981',
}

function frame(inner, { w = W, h = H } = {}) {
  // No SVG <filter> — some browsers refuse to rasterise a large filtered group
  // when the SVG is used as an <img> source. Depth comes from painted shapes and
  // a soft radial "ground" gradient instead, which every decoder handles.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.tintSoft}"/>
      <stop offset="1" stop-color="${C.tint}"/>
    </linearGradient>
    <linearGradient id="blue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.sky}"/>
      <stop offset="1" stop-color="${C.action}"/>
    </linearGradient>
    <radialGradient id="ground" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${C.deep}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${C.deep}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <circle cx="${w * 0.82}" cy="${h * 0.2}" r="${h * 0.62}" fill="${C.brand}" opacity="0.08"/>
  <circle cx="${w * 0.13}" cy="${h * 0.92}" r="${h * 0.34}" fill="${C.action}" opacity="0.07"/>
  <ellipse cx="${w * 0.6}" cy="${h * 0.88}" rx="${w * 0.34}" ry="${h * 0.13}" fill="url(#ground)"/>
  <g>${inner}</g>
</svg>
`
}

// --- reusable primitives, all drawn around a lower-right focal box -------------
const doc = (x, y, w, h, { lines = 4, fill = C.paper, fold = true } = {}) => {
  const foldSize = 120
  const path = fold
    ? `M${x} ${y} H${x + w - foldSize} L${x + w} ${y + foldSize} V${y + h} H${x} Z`
    : `M${x} ${y} H${x + w} V${y + h} H${x} Z`
  const foldTri = fold
    ? `<path d="M${x + w - foldSize} ${y} V${y + foldSize} H${x + w} Z" fill="${C.tint}"/>`
    : ''
  let rule = ''
  for (let i = 0; i < lines; i += 1) {
    const ly = y + h * 0.32 + i * (h * 0.13)
    const lw = w * (i % 3 === 0 ? 0.62 : 0.78)
    rule += `<rect x="${x + w * 0.12}" y="${ly}" width="${lw}" height="26" rx="13" fill="${C.tint}"/>`
  }
  return `<path d="${path}" fill="${fill}" stroke="${C.tint}" stroke-width="4"/>${foldTri}${rule}`
}

const badge = (cx, cy, r, glyph, { fill = C.brand } = {}) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>${glyph(cx, cy, r)}`

const check = (cx, cy, r) =>
  `<path d="M${cx - r * 0.42} ${cy} L${cx - r * 0.08} ${cy + r * 0.36} L${cx + r * 0.46} ${cy - r * 0.34}" fill="none" stroke="${C.paper}" stroke-width="${r * 0.22}" stroke-linecap="round" stroke-linejoin="round"/>`

const percent = (cx, cy, r) =>
  `<g stroke="${C.paper}" stroke-width="${r * 0.16}" stroke-linecap="round"><line x1="${cx - r * 0.4}" y1="${cy + r * 0.4}" x2="${cx + r * 0.4}" y2="${cy - r * 0.4}"/></g>` +
  `<circle cx="${cx - r * 0.32}" cy="${cy - r * 0.3}" r="${r * 0.16}" fill="${C.paper}"/>` +
  `<circle cx="${cx + r * 0.32}" cy="${cy + r * 0.3}" r="${r * 0.16}" fill="${C.paper}"/>`

const refresh = (cx, cy, r) =>
  `<path d="M${cx - r * 0.55} ${cy} A ${r * 0.55} ${r * 0.55} 0 1 1 ${cx} ${cy + r * 0.55}" fill="none" stroke="${C.paper}" stroke-width="${r * 0.2}" stroke-linecap="round"/>` +
  `<path d="M${cx - r * 0.55} ${cy - r * 0.3} L${cx - r * 0.55} ${cy + r * 0.05} L${cx - r * 0.9} ${cy - r * 0.02} Z" fill="${C.paper}"/>`

const pin = (cx, cy, r) =>
  `<path d="M${cx} ${cy + r} C ${cx - r} ${cy - r * 0.1} ${cx - r * 0.7} ${cy - r} ${cx} ${cy - r} C ${cx + r * 0.7} ${cy - r} ${cx + r} ${cy - r * 0.1} ${cx} ${cy + r} Z" fill="${C.action}"/><circle cx="${cx}" cy="${cy - r * 0.35}" r="${r * 0.32}" fill="${C.paper}"/>`

const passport = (x, y, w, h) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="34" fill="url(#blue)"/>` +
  `<rect x="${x + 34}" y="${y + 34}" width="${w - 68}" height="${h - 68}" rx="20" fill="none" stroke="${C.paper}" stroke-width="6" opacity="0.5"/>` +
  `<circle cx="${x + w / 2}" cy="${y + h * 0.4}" r="${w * 0.16}" fill="none" stroke="${C.paper}" stroke-width="8"/>` +
  `<path d="M${x + w / 2} ${y + h * 0.24} V${y + h * 0.56} M${x + w * 0.34} ${y + h * 0.4} H${x + w * 0.66}" stroke="${C.paper}" stroke-width="6"/>` +
  `<rect x="${x + w * 0.24}" y="${y + h * 0.66}" width="${w * 0.52}" height="20" rx="10" fill="${C.paper}" opacity="0.8"/>` +
  `<rect x="${x + w * 0.3}" y="${y + h * 0.78}" width="${w * 0.4}" height="20" rx="10" fill="${C.paper}" opacity="0.6"/>`

const idCard = (x, y, w, h) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${C.paper}" stroke="${C.tint}" stroke-width="4"/>` +
  `<circle cx="${x + h * 0.55}" cy="${y + h * 0.5}" r="${h * 0.26}" fill="${C.tint}"/>` +
  `<rect x="${x + h * 0.95}" y="${y + h * 0.32}" width="${w - h * 1.25}" height="20" rx="10" fill="${C.brand}"/>` +
  `<rect x="${x + h * 0.95}" y="${y + h * 0.56}" width="${w - h * 1.6}" height="18" rx="9" fill="${C.tint}"/>`

const building = (x, y, w, h) =>
  `<rect x="${x}" y="${y + h * 0.22}" width="${w}" height="${h * 0.78}" rx="12" fill="url(#blue)"/>` +
  `<path d="M${x - 24} ${y + h * 0.22} L${x + w / 2} ${y - 10} L${x + w + 24} ${y + h * 0.22} Z" fill="${C.deep}"/>` +
  Array.from({ length: 4 }, (_, i) => `<rect x="${x + w * 0.12 + i * (w * 0.22)}" y="${y + h * 0.34}" width="${w * 0.06}" height="${h * 0.52}" fill="${C.paper}" opacity="0.7"/>`).join('') +
  `<rect x="${x + w * 0.4}" y="${y + h * 0.62}" width="${w * 0.2}" height="${h * 0.38}" fill="${C.paper}" opacity="0.9"/>`

const map = (x, y, w, h) => {
  const seg = w / 3
  return `<path d="M${x} ${y + 30} L${x + seg} ${y} L${x + 2 * seg} ${y + 40} L${x + w} ${y} L${x + w} ${y + h - 30} L${x + 2 * seg} ${y + h} L${x + seg} ${y + h - 40} L${x} ${y + h} Z" fill="${C.paper}" stroke="${C.tint}" stroke-width="4"/>` +
    `<path d="M${x + seg} ${y} V${y + h - 40} M${x + 2 * seg} ${y + 40} V${y + h}" stroke="${C.tint}" stroke-width="4"/>` +
    `<path d="M${x + w * 0.12} ${y + h * 0.7} C ${x + w * 0.35} ${y + h * 0.4} ${x + w * 0.55} ${y + h * 0.8} ${x + w * 0.9} ${y + h * 0.45}" fill="none" stroke="${C.brand}" stroke-width="8" stroke-dasharray="4 26" stroke-linecap="round"/>` +
    `<circle cx="${x + w * 0.12}" cy="${y + h * 0.7}" r="18" fill="${C.action}"/>`
}

const car = (x, y, w, h) =>
  `<path d="M${x} ${y + h * 0.62} L${x + w * 0.16} ${y + h * 0.28} Q ${x + w * 0.22} ${y + h * 0.16} ${x + w * 0.36} ${y + h * 0.16} L${x + w * 0.66} ${y + h * 0.16} Q ${x + w * 0.8} ${y + h * 0.16} ${x + w * 0.86} ${y + h * 0.3} L${x + w} ${y + h * 0.5} L${x + w} ${y + h * 0.78} L${x} ${y + h * 0.78} Z" fill="url(#blue)"/>` +
  `<path d="M${x + w * 0.2} ${y + h * 0.3} L${x + w * 0.3} ${y + h * 0.16} H${x + w * 0.46} V${y + h * 0.3} Z M${x + w * 0.52} ${y + h * 0.16} H${x + w * 0.64} Q ${x + w * 0.74} ${y + h * 0.16} ${x + w * 0.78} ${y + h * 0.3} H${x + w * 0.52} Z" fill="${C.paper}" opacity="0.65"/>` +
  `<circle cx="${x + w * 0.26}" cy="${y + h * 0.8}" r="${h * 0.14}" fill="${C.ink}"/><circle cx="${x + w * 0.74}" cy="${y + h * 0.8}" r="${h * 0.14}" fill="${C.ink}"/>` +
  `<circle cx="${x + w * 0.26}" cy="${y + h * 0.8}" r="${h * 0.06}" fill="${C.paper}"/><circle cx="${x + w * 0.74}" cy="${y + h * 0.8}" r="${h * 0.06}" fill="${C.paper}"/>`

const coins = (cx, cy, r) =>
  `<ellipse cx="${cx}" cy="${cy + r * 0.9}" rx="${r}" ry="${r * 0.42}" fill="${C.gold}"/>` +
  `<ellipse cx="${cx}" cy="${cy + r * 0.3}" rx="${r}" ry="${r * 0.42}" fill="${C.gold}" stroke="${C.paper}" stroke-width="4"/>` +
  `<ellipse cx="${cx}" cy="${cy - r * 0.3}" rx="${r}" ry="${r * 0.42}" fill="${C.gold}" stroke="${C.paper}" stroke-width="4"/>`

const ribbon = (cx, cy, r) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.brand}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="none" stroke="${C.paper}" stroke-width="6"/>` +
  `<path d="M${cx - r * 0.5} ${cy + r * 0.7} L${cx - r * 0.8} ${cy + r * 1.7} L${cx - r * 0.2} ${cy + r * 1.3} L${cx + r * 0.2} ${cy + r * 1.7} L${cx - r * 0.1} ${cy + r * 0.7} Z" fill="${C.action}"/>` +
  check(cx, cy, r * 0.8)

const magnifier = (cx, cy, r) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.action}" stroke-width="${r * 0.2}"/>` +
  `<line x1="${cx + r * 0.75}" y1="${cy + r * 0.75}" x2="${cx + r * 1.5}" y2="${cy + r * 1.5}" stroke="${C.action}" stroke-width="${r * 0.24}" stroke-linecap="round"/>`

const bell = (cx, cy, r) =>
  `<path d="M${cx - r} ${cy + r * 0.7} Q ${cx - r} ${cy - r} ${cx} ${cy - r} Q ${cx + r} ${cy - r} ${cx + r} ${cy + r * 0.7} Z" fill="url(#blue)"/>` +
  `<rect x="${cx - r * 1.15}" y="${cy + r * 0.62}" width="${r * 2.3}" height="20" rx="10" fill="${C.deep}"/>` +
  `<circle cx="${cx}" cy="${cy + r}" r="${r * 0.22}" fill="${C.deep}"/>`

const bolt = (cx, cy, r) =>
  `<path d="M${cx + r * 0.2} ${cy - r} L${cx - r * 0.5} ${cy + r * 0.1} L${cx} ${cy + r * 0.1} L${cx - r * 0.2} ${cy + r} L${cx + r * 0.5} ${cy - r * 0.1} L${cx} ${cy - r * 0.1} Z" fill="${C.gold}" stroke="${C.paper}" stroke-width="6"/>`

const house = (x, y, w, h) =>
  `<path d="M${x} ${y + h * 0.42} L${x + w / 2} ${y} L${x + w} ${y + h * 0.42} Z" fill="${C.action}"/>` +
  `<rect x="${x + w * 0.12}" y="${y + h * 0.42}" width="${w * 0.76}" height="${h * 0.58}" fill="url(#blue)"/>` +
  `<rect x="${x + w * 0.4}" y="${y + h * 0.6}" width="${w * 0.2}" height="${h * 0.4}" fill="${C.paper}" opacity="0.9"/>`

const calendar = (x, y, w, h) =>
  `<rect x="${x}" y="${y + 20}" width="${w}" height="${h - 20}" rx="20" fill="${C.paper}" stroke="${C.tint}" stroke-width="4"/>` +
  `<rect x="${x}" y="${y + 20}" width="${w}" height="${h * 0.24}" rx="20" fill="${C.brand}"/>` +
  `<rect x="${x + w * 0.18}" y="${y}" width="18" height="60" rx="9" fill="${C.deep}"/><rect x="${x + w * 0.78}" y="${y}" width="18" height="60" rx="9" fill="${C.deep}"/>` +
  Array.from({ length: 6 }, (_, i) => `<circle cx="${x + w * 0.2 + (i % 3) * (w * 0.3)}" cy="${y + h * 0.5 + Math.floor(i / 3) * (h * 0.28)}" r="14" fill="${C.tint}"/>`).join('') +
  badge(x + w * 0.8, y + h * 0.78, 60, check, { fill: C.green })

const briefcase = (x, y, w, h) =>
  `<rect x="${x}" y="${y + h * 0.22}" width="${w}" height="${h * 0.78}" rx="24" fill="url(#blue)"/>` +
  `<path d="M${x + w * 0.32} ${y + h * 0.22} V${y + h * 0.08} Q ${x + w * 0.32} ${y} ${x + w * 0.42} ${y} H${x + w * 0.58} Q ${x + w * 0.68} ${y} ${x + w * 0.68} ${y + h * 0.08} V${y + h * 0.22}" fill="none" stroke="${C.deep}" stroke-width="18"/>` +
  `<rect x="${x + w * 0.4}" y="${y + h * 0.46}" width="${w * 0.2}" height="${h * 0.16}" rx="8" fill="${C.paper}" opacity="0.8"/>`

const pen = (x, y, len) =>
  `<g transform="rotate(38 ${x} ${y})"><rect x="${x - 24}" y="${y}" width="48" height="${len}" rx="10" fill="${C.gold}"/><path d="M${x - 24} ${y + len} L${x + 24} ${y + len} L${x} ${y + len + 54} Z" fill="${C.ink}"/><rect x="${x - 24}" y="${y}" width="48" height="40" fill="${C.deep}"/></g>`

const stamp = (cx, cy, r) =>
  `<rect x="${cx - r}" y="${cy}" width="${r * 2}" height="${r * 0.5}" rx="10" fill="${C.deep}"/>` +
  `<rect x="${cx - r * 0.55}" y="${cy - r * 0.9}" width="${r * 1.1}" height="${r}" rx="16" fill="url(#blue)"/>` +
  `<rect x="${cx - r * 1.25}" y="${cy + r * 0.5}" width="${r * 2.5}" height="20" rx="10" fill="${C.action}"/>`

// --- compositions: subject sits in the lower-right focal box ------------------
// focal box ~ x 620..1360, y 210..830
const scenes = {
  // categories
  'categories/civil-status-and-passports': () =>
    passport(700, 230, 430, 560) + idCard(560, 640, 520, 260),
  'categories/social-security': () =>
    `<path d="M910 220 L1290 340 V620 Q1290 860 910 940 Q530 860 530 620 V340 Z" fill="url(#blue)"/>` +
    badge(910, 560, 150, check, { fill: C.paper }) +
    `<path d="M910 560 l0 0" />` +
    `<circle cx="820" cy="470" r="70" fill="${C.brand}"/><circle cx="1000" cy="470" r="70" fill="${C.brand}"/>`.replace(/./, (m) => m) +
    idCard(560, 720, 480, 200),
  'categories/tax': () => doc(640, 210, 560, 620, { lines: 4 }) + badge(1180, 300, 130, percent, { fill: C.brand }) + coins(760, 720, 130),
  'categories/ministry-of-labour': () => doc(600, 220, 540, 600, { lines: 4 }) + pen(1120, 300, 360) + briefcase(940, 620, 400, 300),
  'categories/municipal-services': () => building(680, 240, 560, 560) + pin(760, 760, 90),
  'categories/land-and-survey': () => map(600, 230, 640, 560) + `<path d="M1180 720 L1360 720 L1360 900" fill="none" stroke="${C.action}" stroke-width="20" stroke-linecap="round"/>`,
  'categories/quick-public-services': () => doc(620, 230, 520, 600, { lines: 3 }) + bolt(1120, 360, 170) + `<path d="M1040 760 l120 60 l-120 60 M1180 760 l120 60 l-120 60" fill="none" stroke="${C.action}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`,
  // services
  'services/passport-appointment-booking': () => passport(620, 230, 380, 500) + calendar(940, 470, 420, 400),
  'services/passport-renewal': () => passport(660, 230, 420, 560) + badge(1180, 350, 140, refresh, { fill: C.brand }),
  'services/tax-clearance': () => doc(620, 220, 560, 620, { lines: 4 }) + badge(1160, 720, 150, check, { fill: C.green }) + badge(1180, 300, 120, percent, { fill: C.brand }),
  'services/no-criminal-record-certificate': () => doc(600, 220, 600, 560, { lines: 3 }) + ribbon(1160, 640, 150),
  'services/business-license-renewal': () => idCard(560, 300, 620, 320) + badge(1120, 320, 130, refresh, { fill: C.brand }) + building(940, 640, 380, 300),
  'services/property-registration-deed': () => doc(560, 230, 560, 600, { lines: 3 }) + house(1000, 560, 400, 360) + stamp(760, 780, 120),
  'services/traffic-fines-payment': () => car(600, 320, 640, 420) + doc(1060, 220, 300, 420, { lines: 3, fold: false }) + coins(1200, 720, 110),
  // generic fallbacks
  'fallback/service': () => doc(640, 220, 560, 620, { lines: 4 }) + badge(1180, 720, 150, check, { fill: C.brand }),
  'fallback/category': () =>
    Array.from({ length: 4 }, (_, i) => {
      const cx = 700 + (i % 2) * 380
      const cy = 300 + Math.floor(i / 2) * 360
      return `<rect x="${cx}" y="${cy}" width="320" height="300" rx="34" fill="${i % 3 === 0 ? 'url(#blue)' : C.paper}" stroke="${C.tint}" stroke-width="4"/>`
    }).join(''),
  // empty states (drawn on the same field, subject centred)
  'empty/no-requests': () =>
    `<path d="M560 420 h300 l70 90 h380 a30 30 0 0 1 30 30 v300 a30 30 0 0 1 -30 30 h-760 a30 30 0 0 1 -30 -30 v-360 a30 30 0 0 1 30 -30 z" fill="url(#blue)"/>` +
    `<rect x="620" y="360" width="640" height="360" rx="24" fill="${C.paper}" stroke="${C.tint}" stroke-width="4"/>` +
    badge(940, 560, 90, (cx, cy, r) => `<path d="M${cx - r * 0.5} ${cy} h${r} M${cx} ${cy - r * 0.5} v${r}" stroke="${C.paper}" stroke-width="${r * 0.22}" stroke-linecap="round"/>`, { fill: C.brand }),
  'empty/no-results': () => `<rect x="600" y="300" width="680" height="440" rx="28" fill="${C.paper}" stroke="${C.tint}" stroke-width="4"/>` +
    Array.from({ length: 3 }, (_, i) => `<rect x="660" y="${360 + i * 110}" width="${i === 1 ? 380 : 520}" height="40" rx="20" fill="${C.tint}"/>`).join('') +
    magnifier(1180, 640, 130),
  'empty/no-notifications': () => bell(940, 500, 220) + `<circle cx="1180" cy="360" r="40" fill="${C.tint}"/><circle cx="1260" cy="300" r="26" fill="${C.tint}"/>`,
  'empty/no-documents': () => `<rect x="620" y="360" width="640" height="420" rx="28" fill="${C.paper}" stroke="${C.tint}" stroke-width="4" stroke-dasharray="20 18"/>` +
    `<path d="M940 700 V500 M860 580 L940 500 L1020 580" fill="none" stroke="${C.action}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`,
  // "can't find the service? send a special request"
  'misc/custom-request': () => doc(560, 250, 540, 560, { lines: 3 }) +
    `<path d="M1120 340 L1400 470 L1120 600 L1180 470 Z" fill="url(#blue)"/>` +
    `<path d="M1120 340 L1180 470 L1300 508" fill="none" stroke="${C.paper}" stroke-width="8" opacity="0.7"/>` +
    badge(760, 780, 96, (cx, cy, r) => `<path d="M${cx - r * 0.5} ${cy} h${r} M${cx} ${cy - r * 0.5} v${r}" stroke="${C.paper}" stroke-width="${r * 0.22}" stroke-linecap="round"/>`, { fill: C.brand }),
}

// wide hero
const hero = () => frame(
  Array.from({ length: 3 }, (_, i) =>
    `<g transform="translate(${180 + i * 470} ${180 + (i % 2) * 60})"><rect width="400" height="520" rx="34" fill="${i === 1 ? 'url(#blue)' : C.paper}" stroke="${C.tint}" stroke-width="4"/>` +
    `<rect x="40" y="40" width="320" height="200" rx="20" fill="${i === 1 ? C.paper : C.tint}" opacity="${i === 1 ? 0.25 : 1}"/>` +
    `<rect x="40" y="280" width="240" height="30" rx="15" fill="${i === 1 ? C.paper : C.tint}" opacity="${i === 1 ? 0.6 : 1}"/>` +
    `<rect x="40" y="330" width="300" height="24" rx="12" fill="${i === 1 ? C.paper : C.tint}" opacity="${i === 1 ? 0.4 : 1}"/>` +
    `<rect x="40" y="420" width="180" height="56" rx="16" fill="${i === 1 ? C.paper : C.brand}" opacity="${i === 1 ? 0.9 : 1}"/></g>`,
  ).join('') + magnifier(1420, 250, 150),
  { w: 1760, h: 900 },
)

mkdirSync(OUT, { recursive: true })
for (const dir of ['categories', 'services', 'fallback', 'hero', 'empty', 'misc']) {
  mkdirSync(join(OUT, dir), { recursive: true })
}

let count = 0
for (const [key, draw] of Object.entries(scenes)) {
  writeFileSync(join(OUT, `${key}.svg`), frame(draw()))
  count += 1
}
writeFileSync(join(OUT, 'hero/discovery.svg'), hero())
count += 1

console.log(`wrote ${count} illustrations to public/images/khalsni/`)
