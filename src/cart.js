import gsap from 'gsap';
import { bottleSVG } from './bottle.js';

const KEY = 'aurele-bag';
export const fmt = (n) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
export const priceOf = (p, size) => (size === 50 ? Math.round(p.price * 0.65) : p.price);

export function createCart({ products, lenis, toast, thumb }) {
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const root = document.querySelector('.bag');
  const panel = root.querySelector('.bag__panel');
  const overlay = root.querySelector('.bag__overlay');
  const list = root.querySelector('.bag__list');
  const empty = root.querySelector('.bag__empty');
  const subtotal = root.querySelector('[data-subtotal]');
  const counts = document.querySelectorAll('[data-bag-count]');
  let items = load();
  gsap.set(panel, { xPercent: 105 });
  let isOpen = false;

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(data) ? data.filter((i) => byId[i.id]) : [];
    } catch {
      return [];
    }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
  }

  function render() {
    const count = items.reduce((s, i) => s + i.qty, 0);
    counts.forEach((el) => (el.textContent = count));
    subtotal.textContent = fmt(items.reduce((s, i) => s + priceOf(byId[i.id], i.size) * i.qty, 0));
    empty.hidden = items.length > 0;
    root.querySelector('.bag__checkout').disabled = items.length === 0;
    list.innerHTML = items
      .map((i, idx) => {
        const p = byId[i.id];
        return `
        <li class="bag__item" style="--c1:${p.c1};--c2:${p.c2}">
          <div class="bag__thumb">${thumb ? thumb(p) : bottleSVG(p)}</div>
          <div class="bag__meta">
            <strong>${p.name}</strong>
            <span>${p.family} · ${i.size} ml</span>
            <div class="bag__qty">
              <button data-act="dec" data-idx="${idx}" aria-label="Decrease">−</button>
              <span>${i.qty}</span>
              <button data-act="inc" data-idx="${idx}" aria-label="Increase">+</button>
            </div>
          </div>
          <div class="bag__right">
            <span>${fmt(priceOf(p, i.size) * i.qty)}</span>
            <button data-act="rm" data-idx="${idx}" class="bag__rm">Remove</button>
          </div>
        </li>`;
      })
      .join('');
  }

  function bump() {
    gsap.fromTo(counts, { scale: 1.8 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.35)' });
  }

  function add(id, size = 100, qty = 1) {
    const found = items.find((i) => i.id === id && i.size === size);
    if (found) found.qty += qty;
    else items.push({ id, size, qty });
    save();
    render();
    bump();
    toast(`${byId[id].name} · ${size} ml — added to your bag`);
  }

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const idx = +btn.dataset.idx;
    const act = btn.dataset.act;
    if (act === 'inc') items[idx].qty++;
    if (act === 'dec') items[idx].qty--;
    if (act === 'rm' || items[idx].qty <= 0) {
      const row = btn.closest('.bag__item');
      gsap.to(row, {
        height: 0, opacity: 0, x: 40, paddingTop: 0, paddingBottom: 0, duration: 0.5, ease: 'power3.inOut',
        onComplete: () => { items.splice(idx, 1); save(); render(); },
      });
      return;
    }
    save();
    render();
  });

  function open() {
    if (isOpen) return;
    isOpen = true;
    lenis?.stop();
    root.classList.add('is-open');
    gsap.timeline()
      .to(overlay, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' })
      .fromTo(panel, { xPercent: 105 }, { xPercent: 0, duration: 1, ease: 'expo.out' }, 0)
      .fromTo(panel.querySelectorAll('.bag__head, .bag__item, .bag__foot'),
        { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.06, duration: 0.8, ease: 'power3.out' }, 0.2);
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    gsap.timeline({ onComplete: () => { root.classList.remove('is-open'); lenis?.start(); } })
      .to(panel, { xPercent: 105, duration: 0.7, ease: 'expo.in' })
      .to(overlay, { autoAlpha: 0, duration: 0.5 }, 0.2);
  }

  document.querySelectorAll('[data-open-bag]').forEach((b) => b.addEventListener('click', open));
  root.querySelectorAll('[data-close-bag]').forEach((b) => b.addEventListener('click', close));
  window.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  root.querySelector('.bag__checkout').addEventListener('click', () => {
    items = [];
    save();
    render();
    close();
    toast('Merci — this is a demo store, so no order was placed.');
  });

  render();
  return { add, open, close, render };
}
