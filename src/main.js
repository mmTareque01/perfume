import './style.css';
import 'lenis/dist/lenis.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { CustomEase } from 'gsap/CustomEase';
import Lenis from 'lenis';
import { products, projects } from './data.js';
import { bottleSVG } from './bottle.js';
import { createScene } from './scene.js';
import { renderShots } from './studio.js';
import { FULL } from './flacon.js';
import { createCart, fmt, priceOf } from './cart.js';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin, CustomEase);
CustomEase.create('lux', '0.76, 0, 0.24, 1');
CustomEase.create('silk', '0.16, 1, 0.3, 1');

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;
const isMobile = () => window.innerWidth < 768;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

/* ---------------------------------------------------------------------------
   Dynamic content
--------------------------------------------------------------------------- */
const byId = Object.fromEntries(products.map((p) => [p.id, p]));

// Studio packshots rendered from the real 3D flacon (filled in before the intro)
const shots = {};
const shotImg = (id, alt = '') => (shots[id] ? `<img class="shot" src="${shots[id]}" alt="${alt}" />` : bottleSVG(byId[id]));
function applyShots() {
  document.querySelectorAll('[data-shot]').forEach((el) => {
    const id = el.dataset.shot;
    if (shots[id]) el.src = shots[id];
    else el.outerHTML = bottleSVG(byId[id]);
  });
}

document.querySelector('.collection__outro').insertAdjacentHTML(
  'beforebegin',
  products
    .map(
      (p) => `
  <article class="card" style="--c1:${p.c1};--c2:${p.c2}">
    <button class="card__visual" data-quickview="${p.id}" data-cursor="View" aria-label="View ${p.name}">
      <span class="card__shot"><img class="shot" data-shot="${p.id}" alt="${p.name} in the Aurèle flacon" /></span>
      <span class="card__no">No. ${p.no}</span>
      <span class="card__family">${p.family}</span>
    </button>
    <div class="card__info">
      <div><h3 class="card__name">${p.name}</h3><p class="card__notes">${p.notes.join(' · ')}</p></div>
      <div class="card__buy"><span class="card__price">${fmt(p.price)}</span><button class="card__add" data-add="${p.id}" data-cursor="Add">Add to bag +</button></div>
    </div>
  </article>`,
    )
    .join(''),
);

const artHTML = (p, i) => `
  <div class="art art--${p.variant}" style="--a:${p.c1};--b:${p.c2}">
    <img class="shot" data-shot="${products[(i + 1) % products.length].id}" alt="" />
    <span class="art__word">${p.title}</span>
  </div>`;

document.querySelector('.featured').innerHTML = projects
  .slice(0, 2)
  .map(
    (p, i) => `
  <a href="#" class="featured__item" data-case="${p.title}" data-cursor="Case">
    <div class="featured__media">${artHTML(p, i)}</div>
    <div class="featured__cap"><h3>${p.title}</h3><span>${p.kind} — ${p.year}</span></div>
  </a>`,
  )
  .join('');

document.querySelector('.work').innerHTML = projects
  .map(
    (p, i) => `
  <li class="work__row"><a href="#" data-case="${p.title}" data-cursor="Open">
    <small>0${i + 1}</small><h3>${p.title}</h3><span class="work__kind">${p.kind}</span><span class="work__year">${p.year}</span>
  </a></li>`,
  )
  .join('');
document.querySelector('.preview__track').innerHTML = projects.map(artHTML).join('');

document.querySelector('.footer__brand').innerHTML = [...'AURÈLE'].map((c) => `<span>${c}</span>`).join('');

/* ---------------------------------------------------------------------------
   Smooth scroll
--------------------------------------------------------------------------- */
const lenis = reduced ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  lenis.stop();
}
gsap.ticker.lagSmoothing(0);
const velocity = () => (lenis ? lenis.velocity : 0);

function scrollToTarget(target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else (typeof target === 'number' ? window.scrollTo(0, target) : target.scrollIntoView({ behavior: 'smooth' }));
}

/* ---------------------------------------------------------------------------
   WebGL flacon
--------------------------------------------------------------------------- */
const scene = createScene(document.getElementById('webgl'));
gsap.ticker.add((t, dt) => scene.update(t, Math.min(dt / 1000, 0.05)));

/* ---------------------------------------------------------------------------
   UI: toast, cursor, magnetic
--------------------------------------------------------------------------- */
const toastEl = document.querySelector('.toast');
let toastTl;
gsap.set(toastEl, { xPercent: -50, yPercent: 150, opacity: 0 });
function toast(msg) {
  toastEl.textContent = msg;
  toastTl?.kill();
  toastTl = gsap.timeline()
    .fromTo(toastEl, { yPercent: 150, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'silk' })
    .to(toastEl, { yPercent: 150, opacity: 0, duration: 0.5, ease: 'power2.in' }, '+=2.6');
}

if (finePointer) {
  document.body.classList.add('has-cursor');
  const cursor = document.querySelector('.cursor');
  const ring = cursor.querySelector('.cursor__ring');
  const dot = cursor.querySelector('.cursor__dot');
  const label = cursor.querySelector('.cursor__label');
  const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
  const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
  window.addEventListener('pointermove', (e) => { rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY); });
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor], a, button');
    cursor.classList.toggle('is-hover', !!t);
    const text = t?.dataset.cursor || '';
    cursor.classList.toggle('has-label', !!text);
    if (text) label.textContent = text;
  });
  document.addEventListener('pointerleave', () => gsap.to(cursor, { opacity: 0 }));
  document.addEventListener('pointerenter', () => gsap.to(cursor, { opacity: 1 }));

  document.querySelectorAll('.magnetic').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.35);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.45);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/* ---------------------------------------------------------------------------
   Cart + fly-to-bag + quick view
--------------------------------------------------------------------------- */
const cart = createCart({ products, lenis, toast, thumb: (p) => shotImg(p.id) });
const bagBtn = document.querySelector('.nav__bag');

function flyToBag(from) {
  const a = from.getBoundingClientRect();
  const b = bagBtn.getBoundingClientRect();
  const dot = document.createElement('div');
  dot.className = 'fly';
  document.body.appendChild(dot);
  const sx = a.left + a.width / 2, sy = a.top + a.height / 2;
  const ex = b.left + b.width - 24, ey = b.top + b.height / 2;
  gsap.set(dot, { x: sx, y: sy });
  document.querySelector('.nav').classList.remove('is-hidden');
  gsap.timeline({ onComplete: () => dot.remove() })
    .to(dot, { x: ex, duration: 0.9, ease: 'power1.inOut' }, 0)
    .to(dot, { y: Math.min(sy, ey) - 140, duration: 0.45, ease: 'power2.out' }, 0)
    .to(dot, { y: ey, duration: 0.45, ease: 'power2.in' }, 0.45)
    .to(dot, { scale: 0.3, duration: 0.9, ease: 'power2.in' }, 0);
  return new Promise((r) => gsap.delayedCall(0.85, r));
}

document.addEventListener('click', async (e) => {
  const add = e.target.closest('[data-add]');
  if (add) {
    await flyToBag(add);
    cart.add(add.dataset.add, +(add.dataset.size || 100));
    return;
  }
  const cs = e.target.closest('[data-case]');
  if (cs) return toast(`${cs.dataset.case} — full case study coming soon`);
  const qv = e.target.closest('[data-quickview]');
  if (qv) openQuickView(byId[qv.dataset.quickview]);
});

const qvEl = document.querySelector('.qv');
const qvPanel = qvEl.querySelector('.qv__panel');
let qvOpen = false;

function openQuickView(p) {
  qvOpen = true;
  lenis?.stop();
  qvEl.style.setProperty('--c1', p.c1);
  qvEl.style.setProperty('--c2', p.c2);
  qvEl.querySelector('.qv__visual').innerHTML = shotImg(p.id, `${p.name} flacon`);
  const size50 = priceOf(p, 50);
  qvEl.querySelector('.qv__info').innerHTML = `
    <span class="eyebrow">No. ${p.no} · ${p.family}</span>
    <h3>${p.name}</h3>
    <p class="qv__desc">${p.desc}</p>
    <div class="qv__pyr">
      <div><small>Top</small><span>${p.pyramid.top.join(', ')}</span></div>
      <div><small>Heart</small><span>${p.pyramid.heart.join(', ')}</span></div>
      <div><small>Base</small><span>${p.pyramid.base.join(', ')}</span></div>
    </div>
    <div class="qv__sizes">
      <button data-size="50" data-price="${size50}"><small>50 ml</small><strong>${fmt(size50)}</strong></button>
      <button data-size="100" data-price="${p.price}" class="is-active"><small>100 ml</small><strong>${fmt(p.price)}</strong></button>
    </div>
    <div class="qv__buy">
      <span class="qv__price">${fmt(p.price)}</span>
      <button class="btn btn--gold magnetic" data-add="${p.id}" data-size="100"><span class="btn__label" data-text="Add to bag">Add to bag</span></button>
    </div>`;
  const buy = qvEl.querySelector('[data-add]');
  qvEl.querySelectorAll('.qv__sizes button').forEach((b) =>
    b.addEventListener('click', () => {
      qvEl.querySelectorAll('.qv__sizes button').forEach((x) => x.classList.toggle('is-active', x === b));
      buy.dataset.size = b.dataset.size;
      gsap.fromTo(qvEl.querySelector('.qv__price'), { yPercent: 60, opacity: 0 }, {
        yPercent: 0, opacity: 1, duration: 0.5, ease: 'silk',
        onStart() { this.targets()[0].textContent = fmt(+b.dataset.price); },
      });
    }),
  );
  buy.addEventListener('click', () => gsap.delayedCall(0.9, closeQuickView));

  qvEl.classList.add('is-open');
  gsap.timeline()
    .to(qvEl.querySelector('.qv__overlay'), { opacity: 1, duration: 0.5 })
    .fromTo(qvPanel, { clipPath: 'inset(50% 0% 50% 0% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.1, ease: 'lux' }, 0)
    .fromTo(qvEl.querySelector('.qv__visual > *'), { scale: 1.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.6, ease: 'silk' }, 0.3)
    .fromTo(qvEl.querySelectorAll('.qv__info > *'), { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.07, duration: 0.9, ease: 'silk' }, 0.4);
}
function closeQuickView() {
  if (!qvOpen) return;
  qvOpen = false;
  gsap.timeline({ onComplete: () => { qvEl.classList.remove('is-open'); lenis?.start(); } })
    .to(qvPanel, { clipPath: 'inset(50% 0% 50% 0% round 22px)', duration: 0.7, ease: 'lux' })
    .to(qvEl.querySelector('.qv__overlay'), { opacity: 0, duration: 0.4 }, 0.3);
}
qvEl.querySelectorAll('[data-close-qv]').forEach((b) => b.addEventListener('click', closeQuickView));
window.addEventListener('keydown', (e) => e.key === 'Escape' && closeQuickView());

/* ---------------------------------------------------------------------------
   Navigation
--------------------------------------------------------------------------- */
const nav = document.querySelector('.nav');
const menu = document.querySelector('.menu');
const burger = document.querySelector('.nav__burger');
let menuOpen = false;

function toggleMenu(force) {
  menuOpen = force ?? !menuOpen;
  burger.setAttribute('aria-expanded', menuOpen);
  menu.setAttribute('aria-hidden', !menuOpen);
  if (menuOpen) {
    lenis?.stop();
    gsap.timeline()
      .set(menu, { visibility: 'visible' })
      .to(menu, { clipPath: 'inset(0 0 0% 0)', duration: 1, ease: 'lux' })
      .fromTo(menu.querySelectorAll('.menu__links span'), { yPercent: 110 }, { yPercent: 0, stagger: 0.07, duration: 1, ease: 'silk' }, 0.35);
  } else {
    lenis?.start();
    gsap.timeline()
      .to(menu.querySelectorAll('.menu__links span'), { yPercent: -110, stagger: 0.04, duration: 0.5, ease: 'power3.in' })
      .to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.8, ease: 'lux' }, 0.2)
      .set(menu, { visibility: 'hidden' });
  }
}
burger.addEventListener('click', () => toggleMenu());

document.querySelectorAll('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    e.preventDefault();
    if (id.length < 2) return;
    const go = () => scrollToTarget(id === '#top' ? 0 : document.querySelector(id));
    if (menuOpen) { toggleMenu(false); gsap.delayedCall(0.7, go); } else go();
  }),
);

const progress = document.querySelector('.progress');
function onScroll(y, dir) {
  nav.classList.toggle('is-scrolled', y > 40);
  nav.classList.toggle('is-hidden', dir > 0 && y > 300 && !menuOpen);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  gsap.set(progress, { scaleX: max > 0 ? y / max : 0 });
  scene.setLift(y * 0.0015);
}
if (lenis) lenis.on('scroll', (l) => onScroll(l.scroll, l.direction));
else {
  let last = 0;
  window.addEventListener('scroll', () => { const y = window.scrollY; onScroll(y, Math.sign(y - last)); last = y; });
}

/* ---------------------------------------------------------------------------
   Marquee (speed + skew react to scroll velocity)
--------------------------------------------------------------------------- */
document.querySelectorAll('.marquee__row').forEach((row) => {
  const track = row.querySelector('.marquee__track');
  row.appendChild(track.cloneNode(true));
  const tracks = row.querySelectorAll('.marquee__track');
  const dir = +row.dataset.dir;
  let x = 0, skew = 0;
  gsap.ticker.add((t, dt) => {
    const v = velocity();
    x -= dir * (0.006 + Math.min(Math.abs(v) * 0.004, 0.12)) * dt * (v < 0 ? -1 : 1);
    const w = track.offsetWidth;
    if (!w) return;
    const pct = ((x % 100) + 100) % 100;
    const px = -(pct / 100) * w;
    skew += (gsap.utils.clamp(-10, 10, -v * 0.35) - skew) * 0.1;
    tracks.forEach((tr) => (tr.style.transform = `translate3d(${px}px,0,0) skewX(${skew.toFixed(2)}deg)`));
  });
});

/* hero badge rotation */
const badge = document.querySelector('.hero__badge svg');
let badgeRot = 0;
gsap.ticker.add((t, dt) => {
  badgeRot += dt * 0.012 * (1 + Math.min(Math.abs(velocity()) * 0.15, 6));
  badge.style.transform = `rotate(${badgeRot}deg)`;
});

/* ---------------------------------------------------------------------------
   Preloader → intro
--------------------------------------------------------------------------- */
const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
const shotsReady = fontsReady
  .then(() => { scene.drawLabel(); return renderShots(products); })
  .then((s) => Object.assign(shots, s))
  .catch((err) => console.warn('Packshots unavailable, using illustrations', err))
  .then(() => { applyShots(); cart.render(); });

function preloader() {
  return new Promise((resolve) => {
    const count = document.querySelector('.preloader__count span');
    const c = { v: 0 };
    const tl = gsap.timeline();
    tl.from('.preloader__stroke', { drawSVG: 0, duration: 1.8, stagger: 0.25, ease: 'lux' })
      .from('.preloader__brand, .preloader__tag, .preloader__note', { opacity: 0, y: 14, stagger: 0.12, duration: 1, ease: 'silk' }, 0.3)
      .to('.preloader__liquid', { attr: { y: 120 }, duration: reduced ? 0.6 : 2.4, ease: 'power2.inOut' }, 0.2)
      .to(c, {
        v: 100, duration: reduced ? 0.6 : 2.4, ease: 'power2.inOut',
        onUpdate: () => (count.textContent = String(Math.round(c.v)).padStart(3, '0')),
      }, 0.2);
    Promise.all([fontsReady, shotsReady, new Promise((r) => tl.eventCallback('onComplete', r))]).then(resolve);
  });
}

function intro() {
  document.body.classList.remove('is-loading');
  ScrollTrigger.refresh();
  scene.drawLabel();
  const eyebrow = document.querySelector('[data-scramble]');
  const eyebrowText = eyebrow.textContent;
  eyebrow.textContent = '';
  const chars = new SplitText('.hero__line', { type: 'chars', charsClass: 'char' }).chars;

  const tl = gsap.timeline({ onComplete: () => lenis?.start() });
  tl.to('.preloader__center, .preloader__note', { y: -60, opacity: 0, duration: 0.7, ease: 'power3.in' })
    .to('.preloader__count span', { yPercent: -100, duration: 0.7, ease: 'power3.in' }, 0)
    .to('.preloader', { clipPath: 'inset(0 0 100% 0)', duration: 1.2, ease: 'lux' }, 0.45)
    .to('.curtain', { clipPath: 'inset(0 0 100% 0)', duration: 1.2, ease: 'lux' }, 0.62)
    .set('.preloader, .curtain', { display: 'none' })
    .add('reveal', 1.1)
    .to(scene.intro, { v: 1, duration: 2.8, ease: 'expo.out' }, 'reveal')
    .from(chars, { yPercent: 115, rotate: 8, duration: 1.4, stagger: 0.025, ease: 'expo.out' }, 'reveal')
    .to(eyebrow, { duration: 1.4, scrambleText: { text: eyebrowText, chars: 'AURÈLE—·', speed: 0.5 } }, 'reveal+=0.2')
    .from('.hero__lead, .hero__ctas > *', { y: 30, opacity: 0, stagger: 0.1, duration: 1.2, ease: 'silk' }, 'reveal+=0.6')
    .from('.nav', { yPercent: -100, opacity: 0, duration: 1.2, ease: 'silk', clearProps: 'transform,opacity' }, 'reveal+=0.4')
    .from('.hero__badge', { scale: 0, rotate: -120, duration: 1.6, ease: 'expo.out' }, 'reveal+=0.7')
    .from('.hero__bottom > *', { y: 30, opacity: 0, stagger: 0.1, duration: 1, ease: 'silk' }, 'reveal+=0.9');
}

/* ---------------------------------------------------------------------------
   Scroll choreography
--------------------------------------------------------------------------- */
function buildScroll() {
  // 1. Pinned horizontal collection (created first so later triggers account for pin spacing)
  const track = document.querySelector('.collection__track');
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const hTween = gsap.to(track, {
    x: () => -dist(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.collection', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1,
      invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: (self) => gsap.set('.collection__bar span', { scaleX: self.progress }),
    },
  });
  gsap.utils.toArray('.card').forEach((card) => {
    gsap.fromTo(card.querySelector('.card__shot'), { xPercent: 6 }, {
      xPercent: -6, ease: 'none',
      scrollTrigger: { trigger: card, containerAnimation: hTween, start: 'left right', end: 'right left', scrub: true },
    });
    if (finePointer) {
      const vis = card.querySelector('.card__visual');
      const rx = gsap.quickTo(vis, 'rotationX', { duration: 0.8, ease: 'power3' });
      const ry = gsap.quickTo(vis, 'rotationY', { duration: 0.8, ease: 'power3' });
      vis.addEventListener('pointermove', (e) => {
        const r = vis.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 14);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 14);
      });
      vis.addEventListener('pointerleave', () => { rx(0); ry(0); });
    }
  });

  gsap.from('.card', {
    y: 140, rotate: 5, opacity: 0, duration: 1.4, stagger: 0.1, ease: 'silk',
    scrollTrigger: { trigger: '.collection', start: 'top 65%' },
  });

  // 2. Alchemy: flowers bloom, petals swirl into the flacon, it fills and is sealed
  const steps = gsap.utils.toArray('.astep');
  gsap.set(steps.slice(1), { autoAlpha: 0 });
  const altl = gsap.timeline({
    scrollTrigger: { trigger: '.alchemy', start: 'top top', end: () => '+=' + window.innerHeight * 3.6, pin: true, scrub: 1 },
  });
  altl.fromTo(scene.alch, { p: 0.0001 }, { p: 1, duration: 1, ease: 'none', immediateRender: false }, 0);
  [0.26, 0.52, 0.84].forEach((at, i) => {
    altl.to(steps[i], { y: -30, autoAlpha: 0, duration: 0.035 }, at)
      .fromTo(steps[i + 1], { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.05 }, at + 0.035);
  });
  ScrollTrigger.create({ trigger: '.alchemy', start: 'top bottom', end: 'top top', onUpdate: (st) => (scene.alch.enter = st.progress) });
  gsap.from('.alchemy__title, .alchemy .eyebrow', { y: 40, opacity: 0, stagger: 0.1, duration: 1.2, ease: 'silk', scrollTrigger: { trigger: '.alchemy', start: 'top 60%' } });

  const conc = document.querySelector('[data-conc]');
  const meter = document.querySelector('.alchemy__meter em');
  const labels = gsap.utils.toArray('.flabel');
  let labelsOn = false;
  gsap.ticker.add(() => {
    const active = scene.alch.enter > 0 && scene.alch.p < 1;
    if (!active) {
      if (labelsOn) { labels.forEach((l) => (l.style.opacity = 0)); labelsOn = false; }
      return;
    }
    labelsOn = true;
    const lv = Math.min(1, scene.level() / FULL);
    conc.textContent = Math.round(lv * 24);
    meter.style.transform = `scaleX(${lv})`;
    labels.forEach((l, i) => {
      const pt = scene.flowerScreen(i);
      if (!pt) { l.style.opacity = 0; return; }
      const left = i % 2 === 0;
      const dx = left ? -(l.offsetWidth + 40) : 40;
      const lx = gsap.utils.clamp(12, window.innerWidth - l.offsetWidth - 12, pt.x + dx);
      l.style.transform = `translate(${lx}px, ${pt.y - 20}px)`;
      l.style.opacity = Math.min(1, pt.s / 1.25) ** 3;
    });
  });

  // 3. Pinned notes: phase transitions + liquid colour + rolling counter
  const phases = gsap.utils.toArray('.notes__phase');
  const notesSection = document.querySelector('.notes');
  gsap.set(phases.slice(1), { autoAlpha: 0 });
  const first = scene.color(phases[0].dataset.color);
  scene.liquidMat.color.setRGB(first.r, first.g, first.b);
  scene.liquidMat.emissive.setRGB(first.r, first.g, first.b);
  notesSection.style.setProperty('--glow', phases[0].dataset.color);
  scene.setAmber(phases[0].dataset.color);

  const ntl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: notesSection, start: 'top top', end: () => '+=' + window.innerHeight * 3.2, pin: true, scrub: 1,
      onUpdate: (self) => gsap.set('.notes__bar span', { scaleX: self.progress }),
    },
  });
  ntl.to({}, { duration: 0.4 });
  phases.forEach((phase, i) => {
    if (i === 0) return;
    const prev = phases[i - 1];
    const c = scene.color(phase.dataset.color);
    const at = `p${i}`;
    ntl.add(at)
      .to(prev.querySelector('.notes__title'), { yPercent: -60, opacity: 0, filter: 'blur(8px)', duration: 0.5 }, at)
      .to(prev.querySelectorAll('.notes__kicker, .notes__list li, .notes__desc'), { y: -30, opacity: 0, stagger: 0.04, duration: 0.4 }, at)
      .set(prev, { autoAlpha: 0 })
      .set(phase, { autoAlpha: 1 }, `${at}+=0.3`)
      .fromTo(phase.querySelector('.notes__title'), { yPercent: 60, opacity: 0, filter: 'blur(8px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.6 }, `${at}+=0.3`)
      .fromTo(phase.querySelectorAll('.notes__kicker, .notes__list li, .notes__desc'), { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.5 }, `${at}+=0.35`)
      .to(scene.liquidMat.color, { r: c.r, g: c.g, b: c.b, duration: 0.8 }, at)
      .to(scene.liquidMat.emissive, { r: c.r, g: c.g, b: c.b, duration: 0.8 }, at)
      .to(notesSection, { '--glow': phase.dataset.color, duration: 0.8 }, at)
      .to('.notes__roll-in', { yPercent: (-100 / phases.length) * i, duration: 0.6 }, at)
      .to({}, { duration: 0.5 });
  });

  // 3. Flacon choreography across sections (x / y are fractions of the half viewport)
  const P = (o) => ({ x: 0, y: 0, rotY: 0, rotZ: 0, scale: 1, opacity: 1, ...o });
  const mobilePoses = () => ({
    hero: P({ y: 0.47, scale: 0.72, rotZ: 0.06 }),
    manifesto: P({ y: 0, rotY: Math.PI * 2, rotZ: -0.1, scale: 0.8, opacity: 0.18 }),
    out: P({ y: 1.4, rotY: Math.PI * 2.4, scale: 0.6, opacity: 0 }),
    alchIn: P({ y: -1.4, rotY: -Math.PI * 0.6, scale: 0.6, opacity: 0 }),
    alch: P({ y: 0.02, scale: 0.62 }),
    alchEnd: P({ y: 0.02, scale: 0.62, rotY: Math.PI * 2 }),
    notes: P({ y: -0.1, scale: 0.7, rotY: Math.PI * 2 }),
    notesEnd: P({ y: -0.1, scale: 0.7, rotY: Math.PI * 4 }),
    notesOut: P({ y: 1.4, rotY: Math.PI * 4.5, scale: 0.6, opacity: 0 }),
    ctaIn: P({ y: -1.4, rotY: -Math.PI, scale: 0.6, opacity: 0 }),
    cta: P({ y: 0.42, scale: 0.75, rotZ: 0.08 }),
    ctaOut: P({ y: 1.4, scale: 0.6, opacity: 0, rotY: Math.PI }),
  });
  const desktopPoses = () => ({
    hero: P({ x: 0.42, y: -0.02, rotZ: 0.1, scale: 0.95 }),
    manifesto: P({ x: -0.56, rotY: Math.PI * 2, rotZ: -0.16, scale: 0.82 }),
    out: P({ x: -0.56, y: 1.35, rotY: Math.PI * 2.4, rotZ: -0.3, scale: 0.6, opacity: 0 }),
    alchIn: P({ y: -1.35, rotY: -Math.PI * 0.6, scale: 0.7, opacity: 0 }),
    alch: P({ y: -0.06, scale: 0.8 }),
    alchEnd: P({ y: -0.06, scale: 0.8, rotY: Math.PI * 2 }),
    notes: P({ y: -0.02, scale: 0.95, rotY: Math.PI * 2 }),
    notesEnd: P({ y: -0.02, scale: 0.95, rotY: Math.PI * 4 }),
    notesOut: P({ y: 1.35, rotY: Math.PI * 4.5, scale: 0.7, opacity: 0 }),
    ctaIn: P({ x: 0.45, y: -1.35, rotY: -Math.PI, rotZ: 0.2, scale: 0.6, opacity: 0 }),
    cta: P({ x: 0.45, y: 0, rotZ: 0.12, scale: 0.85 }),
    ctaOut: P({ x: 0.45, y: 1.35, rotY: Math.PI, scale: 0.6, opacity: 0 }),
  });
  let poses = isMobile() ? mobilePoses() : desktopPoses();

  const seg = (from, to, vars) => ({ from, to, st: vars.st || ScrollTrigger.create(vars) });
  const segments = [
    seg('hero', 'manifesto', { trigger: '.hero', start: 'top top', endTrigger: '.manifesto', end: 'center center' }),
    seg('manifesto', 'out', { trigger: '.collection', start: 'top bottom', end: 'top top' }),
    seg('alchIn', 'alch', { trigger: '.alchemy', start: 'top bottom', end: 'top top' }),
    seg('alch', 'alchEnd', { st: altl.scrollTrigger }),
    seg('alchEnd', 'notes', { trigger: '.notes', start: 'top bottom', end: 'top top' }),
    seg('notes', 'notesEnd', { st: ntl.scrollTrigger }),
    seg('notesEnd', 'notesOut', { trigger: '.craft', start: 'top bottom', end: 'top 20%' }),
    seg('ctaIn', 'cta', { trigger: '.cta', start: 'top bottom', end: 'center center' }),
    seg('cta', 'ctaOut', { trigger: '.footer', start: 'top 95%', end: 'top 35%' }),
  ];
  gsap.ticker.add(() => {
    let active = segments[0], prog = 0;
    for (const s of segments) if (s.st.progress > 0) { active = s; prog = s.st.progress; }
    const a = poses[active.from], b = poses[active.to];
    for (const k in a) scene.pose[k] = a[k] + (b[k] - a[k]) * prog;
  });
  ScrollTrigger.addEventListener('refreshInit', () => (poses = isMobile() ? mobilePoses() : desktopPoses()));

  // 4. Hero parallax out
  gsap.to('.hero__inner', {
    yPercent: -30, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  // 5. Manifesto word-by-word ink
  const words = new SplitText('.manifesto__text', { type: 'words' }).words;
  gsap.fromTo(words, { opacity: 0.12 }, {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: '.manifesto__text', start: 'top 80%', end: 'bottom 50%', scrub: true },
  });
  gsap.from('.manifesto__sig', {
    clipPath: 'inset(0 100% 0 0)', duration: 2, ease: 'lux',
    scrollTrigger: { trigger: '.manifesto__sign', start: 'top 85%' },
  });

  // 6. Split headings
  document.querySelectorAll('[data-split]').forEach((el) => {
    const split = new SplitText(el, { type: 'lines', mask: 'lines', linesClass: 'line' });
    gsap.from(split.lines, {
      yPercent: 110, rotate: 3, duration: 1.4, stagger: 0.1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
      onComplete: () => split.revert(),
    });
  });
  document.querySelectorAll('.eyebrow').forEach((el) => {
    if (el.closest('.hero') || el.closest('.qv')) return;
    const text = el.textContent;
    el.textContent = '\u00a0';
    gsap.to(el, {
      duration: 1.4,
      scrambleText: { text, chars: 'AURÈLE·', speed: 0.4 },
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  // 7. Craft: expanding window, counters, steps
  const media = document.querySelector('.craft__media');
  const mobileInset = isMobile();
  gsap.fromTo(media,
    { clipPath: mobileInset ? 'inset(22% 10% 22% 10% round 18px)' : 'inset(18% 26% 18% 26% round 24px)' },
    { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
      scrollTrigger: { trigger: '.craft__reveal', start: 'top 80%', end: 'top top', scrub: true } });
  gsap.fromTo('.craft__media-text', { scale: 0.6 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.craft__reveal', start: 'top 80%', end: 'bottom top', scrub: true },
  });
  gsap.fromTo('.craft__media-text span', { yPercent: 25 }, {
    yPercent: -15, ease: 'none',
    scrollTrigger: { trigger: '.craft__reveal', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = +el.dataset.count;
    gsap.fromTo(el, { textContent: 0 }, {
      textContent: end, duration: 2.4, ease: 'power3.out', snap: { textContent: 1 },
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });
  gsap.utils.toArray('.craft__steps li').forEach((li, i) => {
    gsap.timeline({ scrollTrigger: { trigger: '.craft__steps', start: 'top 85%' } })
      .to(li, { '--s': 1, duration: 1.4, ease: 'lux' }, i * 0.12)
      .from(li.children, { y: 30, opacity: 0, stagger: 0.08, duration: 1, ease: 'silk' }, i * 0.12 + 0.2);
  });

  // 8. Portfolio: featured clip reveal + parallax, list lines, hover preview
  gsap.utils.toArray('.featured__item').forEach((item) => {
    const m = item.querySelector('.featured__media');
    gsap.fromTo(m, { clipPath: 'inset(100% 0% 0% 0% round 18px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.6, ease: 'lux',
      scrollTrigger: { trigger: item, start: 'top 85%' },
    });
    gsap.fromTo(m.querySelector('.art'), { yPercent: -8, scale: 1.25 }, {
      yPercent: 8, scale: 1, ease: 'none',
      scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: true },
    });
    gsap.from(item.querySelector('.featured__cap'), { y: 30, opacity: 0, duration: 1.2, ease: 'silk', scrollTrigger: { trigger: item, start: 'top 60%' } });
  });
  gsap.utils.toArray('.work__row').forEach((row) => {
    gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 92%' } })
      .fromTo(row, { '--s': 0 }, { '--s': 1, duration: 1.4, ease: 'lux' })
      .from(row.querySelectorAll('small, h3, span'), { yPercent: 100, opacity: 0, stagger: 0.06, duration: 1, ease: 'silk', clearProps: 'transform,opacity' }, 0.1);
  });
  if (finePointer) {
    const preview = document.querySelector('.preview');
    const ptrack = preview.querySelector('.preview__track');
    const px = gsap.quickTo(preview, 'x', { duration: 0.7, ease: 'power3' });
    const py = gsap.quickTo(preview, 'y', { duration: 0.7, ease: 'power3' });
    let lastX = 0;
    const work = document.querySelector('.work');
    work.addEventListener('pointermove', (e) => {
      px(e.clientX); py(e.clientY);
      gsap.to(preview, { rotate: gsap.utils.clamp(-12, 12, (e.clientX - lastX) * 0.6), duration: 0.6, ease: 'power3' });
      lastX = e.clientX;
    });
    work.addEventListener('pointerenter', (e) => {
      gsap.set(preview, { x: e.clientX, y: e.clientY });
      gsap.to(preview, { scale: 1, duration: 0.7, ease: 'silk' });
    });
    work.addEventListener('pointerleave', () => gsap.to(preview, { scale: 0, rotate: 0, duration: 0.5, ease: 'power3.in' }));
    document.querySelectorAll('.work__row').forEach((row, i) =>
      row.addEventListener('pointerenter', () =>
        gsap.to(ptrack, { yPercent: (-100 / projects.length) * i, duration: 0.8, ease: 'lux' })),
    );
  }

  // 9. Press quotes carousel
  const quotes = gsap.utils.toArray('.press__quote');
  const dots = gsap.utils.toArray('.press__dots button');
  let qi = 0, qTimer;
  const showQuote = (n) => {
    if (n === qi) return;
    const out = quotes[qi], inn = quotes[n];
    dots.forEach((d, i) => d.classList.toggle('is-active', i === n));
    gsap.timeline()
      .to(out.querySelectorAll('p, cite'), { y: -40, opacity: 0, stagger: 0.05, duration: 0.6, ease: 'power3.in' })
      .add(() => { out.classList.remove('is-active'); inn.classList.add('is-active'); })
      .fromTo(inn.querySelectorAll('p, cite'), { y: 50, opacity: 0, filter: 'blur(6px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', stagger: 0.08, duration: 1.1, ease: 'silk' });
    qi = n;
  };
  const autoplay = () => { clearInterval(qTimer); qTimer = setInterval(() => showQuote((qi + 1) % quotes.length), 5500); };
  dots.forEach((d, i) => d.addEventListener('click', () => { showQuote(i); autoplay(); }));
  ScrollTrigger.create({ trigger: '.press', start: 'top 80%', end: 'bottom top', onToggle: (s) => (s.isActive ? autoplay() : clearInterval(qTimer)) });
  gsap.from('.press__quote.is-active p', { y: 60, opacity: 0, duration: 1.4, ease: 'silk', scrollTrigger: { trigger: '.press', start: 'top 70%' } });

  // 10. CTA + footer
  gsap.from('.cta__form, .cta__small', { y: 30, opacity: 0, stagger: 0.1, duration: 1.2, ease: 'silk', scrollTrigger: { trigger: '.cta__form', start: 'top 90%' } });
  gsap.from('.footer__brand span', {
    yPercent: 100, stagger: 0.06, ease: 'none',
    scrollTrigger: { trigger: '.footer__brand', start: 'top bottom', end: 'bottom bottom', scrub: 1 },
  });
  gsap.from('.footer__col', { y: 40, opacity: 0, stagger: 0.08, duration: 1, ease: 'silk', scrollTrigger: { trigger: '.footer', start: 'top 80%' } });

  ScrollTrigger.refresh();
}

document.querySelector('.cta__form').addEventListener('submit', (e) => {
  e.preventDefault();
  e.target.reset();
  toast('Bienvenue — you have joined Le Cercle.');
});

/* ---------------------------------------------------------------------------
   Boot
--------------------------------------------------------------------------- */
fontsReady.then(buildScroll);
preloader().then(intro);
