// Generates an illustrated glass bottle with an animated liquid surface.
let uid = 0;

function wave(y) {
  let d = `M-80 ${y}`;
  for (let x = -80; x < 280; x += 40) d += ' q10 -5 20 0 t20 0';
  return `${d} V360 H-80 Z`;
}

export function bottleSVG({ c1, c2, name = '', level = 0.64 }, cls = '') {
  const id = `bt${uid++}`;
  const top = Math.round(102 + (1 - level) * 194);
  return `
<svg class="bottle ${cls}" viewBox="0 0 200 340" aria-hidden="true">
  <defs>
    <linearGradient id="${id}g" x1="0" x2="1">
      <stop offset="0" stop-color="#5e4524"/><stop offset=".22" stop-color="#f4dfab"/>
      <stop offset=".45" stop-color="#b48a4a"/><stop offset=".7" stop-color="#f7e8c3"/>
      <stop offset="1" stop-color="#6b4f2a"/>
    </linearGradient>
    <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <linearGradient id="${id}s" x1="0" x2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".25" stop-color="#fff" stop-opacity=".03"/>
      <stop offset=".7" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".14"/>
    </linearGradient>
    <radialGradient id="${id}sh" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${id}c"><rect x="33" y="102" width="134" height="194" rx="16"/></clipPath>
  </defs>
  <ellipse cx="100" cy="318" rx="92" ry="12" fill="url(#${id}sh)"/>
  <g clip-path="url(#${id}c)">
    <rect x="20" y="${top}" width="160" height="220" fill="url(#${id}l)"/>
    <g class="bottle__wave"><path d="${wave(top)}" fill="${c1}" opacity=".55"/></g>
    <rect x="20" y="${top + 60}" width="160" height="200" fill="${c2}" opacity=".35"/>
  </g>
  <rect x="25" y="94" width="150" height="210" rx="22" fill="url(#${id}s)" stroke="rgba(255,255,255,.38)" stroke-width="1.2"/>
  <rect x="31" y="100" width="138" height="198" rx="17" fill="none" stroke="rgba(255,255,255,.1)"/>
  <path d="M41 122 Q37 200 42 282" stroke="rgba(255,255,255,.5)" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M160 120 V190" stroke="rgba(255,255,255,.22)" stroke-width="2" stroke-linecap="round"/>
  <rect x="58" y="178" width="84" height="64" fill="rgba(10,8,6,.38)" stroke="url(#${id}g)" stroke-width=".9"/>
  <rect x="62" y="182" width="76" height="56" fill="none" stroke="url(#${id}g)" stroke-width=".4"/>
  <text x="100" y="202" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="13" letter-spacing="3.5" fill="#f3e3c0">AURÈLE</text>
  <line x1="86" x2="114" y1="209" y2="209" stroke="#c9a46a" stroke-width=".6"/>
  <text x="100" y="223" text-anchor="middle" font-family="Cormorant Garamond, serif" font-style="italic" font-size="9.5" fill="#f3e3c0">${name}</text>
  <text x="100" y="233" text-anchor="middle" font-family="Manrope, sans-serif" font-size="4.2" letter-spacing="1.6" fill="#c9a46a">EAU DE PARFUM</text>
  <rect x="80" y="80" width="40" height="16" rx="2" fill="url(#${id}g)"/>
  <rect x="68" y="12" width="64" height="70" rx="3" fill="url(#${id}g)"/>
  <rect x="68" y="12" width="12" height="70" rx="2" fill="#fff" opacity=".14"/>
  <rect x="120" y="12" width="12" height="70" rx="2" fill="#000" opacity=".22"/>
  <rect x="68" y="12" width="64" height="5" rx="2" fill="#fff" opacity=".25"/>
</svg>`;
}
