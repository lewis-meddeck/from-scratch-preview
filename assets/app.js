import { mockupSVG } from './mockup.js';

const DATA = window.FS_DATA;
const ROOT = document.body.dataset.root || '';
const EXT = document.body.dataset.ext ?? '.html';
const byHandle = Object.fromEntries(DATA.products.map(p => [p.handle, p]));
const priceFor = (p, o = {}) => { for (const [k, m] of Object.entries(p.priceBy || {})) if (o[k] != null && m[o[k]] != null) return m[o[k]]; return p.price; };
const money = n => new Intl.NumberFormat('en-CA', { style: 'currency', currency: DATA.currency }).format(n);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------------- cart storage ---------------- */
const KEY = 'fs-cart-v1';
let cart = [];
try { cart = JSON.parse(localStorage.getItem(KEY) || '[]').filter(l => byHandle[l.handle]); } catch { cart = []; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {} };
const lineKey = (handle, options) => handle + '|' + Object.entries(options).map(([k, v]) => k + '=' + v).join('|');

function addToCart(handle, options, qty) {
  const key = lineKey(handle, options);
  const found = cart.find(l => l.key === key);
  if (found) found.qty = Math.min(10, found.qty + qty);
  else cart.push({ key, handle, options, qty });
  save(); renderCart();
}
function setQty(key, qty) {
  const l = cart.find(l => l.key === key);
  if (!l) return;
  if (qty <= 0) cart = cart.filter(x => x.key !== key);
  else l.qty = Math.min(10, qty);
  save(); renderCart();
}
const subtotal = () => cart.reduce((s, l) => s + priceFor(byHandle[l.handle], l.options) * l.qty, 0);
const count = () => cart.reduce((s, l) => s + l.qty, 0);

function thumbFor(p, options) {
  const label = options.Design || options.Colour || p.title;
  if (p.images && p.images.length) {
    const match = p.images.find(i => i.design && i.design === (options.Design || options.Colour)) || p.images[0];
    return `<img src="${ROOT}${match.src}" alt="">`;
  }
  return mockupSVG(p.garment, label, p.options.some(o => o.name === 'Design') ? {} : { text: 'From Scratch' });
}

/* ---------------- drawer ---------------- */
function renderCart() {
  $$('.cart-count').forEach(el => { el.textContent = count(); });
  const items = $('#cart-items');
  if (!items) return;
  const ship = DATA.site.shipping;
  if (!cart.length) {
    items.innerHTML = `<div class="empty">Your bag is empty.<br><br><a class="btn btn-line" href="${ROOT}shop${EXT}">Shop all</a></div>`;
    $('#cart-foot').hidden = true;
    return;
  }
  $('#cart-foot').hidden = false;
  items.innerHTML = cart.map(l => {
    const p = byHandle[l.handle];
    const opts = Object.entries(l.options).map(([k, v]) => `${k}: ${v}`).join(' · ');
    return `<div class="line" data-key="${encodeURIComponent(l.key)}">
      <div class="thumb">${thumbFor(p, l.options)}</div>
      <div><div class="name">${p.title}</div><div class="opts">${opts}</div>
        <div class="qty"><button type="button" data-d="-1" aria-label="Decrease quantity">−</button><input type="number" min="1" max="10" value="${l.qty}" aria-label="Quantity"><button type="button" data-d="1" aria-label="Increase quantity">+</button></div></div>
      <div class="right"><span class="price">${money(priceFor(p, l.options) * l.qty)}</span><button type="button" class="remove">Remove</button></div>
    </div>`;
  }).join('');
  const sub = subtotal();
  $('#cart-subtotal').textContent = money(sub);
  if (!ship?.freeOver) { $('#ship-note').textContent = 'Shipping is calculated at checkout.'; return; }
  const left = ship.freeOver - sub;
  $('#ship-note').textContent = left > 0
    ? `You're ${money(left)} away from free shipping. Shipping and any taxes are calculated at checkout.`
    : `You've unlocked free shipping.`;
  $('#ship-bar').style.width = Math.min(100, (sub / ship.freeOver) * 100) + '%';
}

function openCart() { document.body.classList.add('cart-open'); $('#cart-drawer').setAttribute('aria-hidden', 'false'); $('#cart-close')?.focus(); }
function closeCart() { document.body.classList.remove('cart-open'); $('#cart-drawer').setAttribute('aria-hidden', 'true'); }

document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('[data-open-cart]')) { e.preventDefault(); openCart(); }
  if (t.closest('#cart-close') || t.classList.contains('scrim')) closeCart();
  const line = t.closest('.line');
  if (line) {
    const key = decodeURIComponent(line.dataset.key);
    const l = cart.find(x => x.key === key);
    if (t.closest('.remove')) setQty(key, 0);
    const d = t.closest('[data-d]');
    if (d && l) setQty(key, l.qty + Number(d.dataset.d));
  }
});
document.addEventListener('change', e => {
  const line = e.target.closest('.line');
  if (line && e.target.matches('input')) setQty(decodeURIComponent(line.dataset.key), parseInt(e.target.value, 10) || 0);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

$('#menu-btn')?.addEventListener('click', () => {
  const nav = $('#nav'); const open = nav.classList.toggle('open');
  $('#menu-btn').setAttribute('aria-expanded', String(open));
});

/* ---------------- checkout ---------------- */
$('#checkout-btn')?.addEventListener('click', async () => {
  const btn = $('#checkout-btn'); const err = $('#checkout-error');
  err.textContent = ''; btn.disabled = true; btn.textContent = 'Opening secure checkout…';
  try {
    const res = await fetch(ROOT + 'api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart.map(l => ({ handle: l.handle, options: l.options, qty: l.qty })) })
    });
    const out = await res.json().catch(() => ({}));
    if (res.ok && out.url) { window.location.href = out.url; return; }
    throw new Error(out.error === 'not_configured' || out.error === 'shipping_not_set'
      ? 'Online checkout isn\'t switched on yet. Please email us to order.'
      : (out.message || 'Checkout is unavailable right now. Please try again or email us.'));
  } catch (e) {
    err.innerHTML = (e.message && !e.message.startsWith('Failed') && !e.message.includes('JSON') ? e.message : 'Checkout isn\'t available in this preview.')
      + ` <a href="mailto:${DATA.site.email}">${DATA.site.email}</a>`;
  } finally { btn.disabled = false; btn.textContent = 'Checkout'; }
});

/* ---------------- toast ---------------- */
function toast(msg) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------------- product page ---------------- */
const pdp = $('#pdp');
if (pdp) {
  const p = byHandle[pdp.dataset.handle];
  const stage = $('#stage');
  const hasDesign = p.options.some(o => o.name === 'Design');
  const current = () => Object.fromEntries(p.options.map(o => {
    const sel = $(`[name="opt-${o.name}"]`, pdp);
    const val = sel?.tagName === 'SELECT' ? sel.value : $(`[name="opt-${o.name}"]:checked`, pdp)?.value;
    return [o.name, val];
  }));
  const stockFor = DATA.stock?.[p.handle];
  const keyOf = o => p.options.map(x => o[x.name]).join(' / ');
  const qtyOf = o => (!stockFor ? Infinity : (stockFor[keyOf(o)] ?? 0));
  // Sizes: sold out for the chosen design. Designs and colours: sold out when no size is left.
  const markAvailability = o => {
    if (!stockFor) return;
    p.options.forEach((opt, idx) => {
      const avail = v => Object.entries(stockFor).some(([k, q]) => q > 0 && k.split(' / ')[idx] === v);
      const sel = $(`select[name="opt-${opt.name}"]`, pdp);
      if (sel) [...sel.options].forEach(op => { op.textContent = op.value + (avail(op.value) ? '' : ' (sold out)'); });
      $$(`input[name="opt-${opt.name}"]`, pdp).forEach(inp => {
        const ok = opt.name === 'Size' ? qtyOf({ ...o, Size: inp.value }) > 0 : avail(inp.value);
        inp.disabled = !ok; if (!ok) inp.checked = false;
      });
    });
  };
  const paint = () => {
    markAvailability(current());
    const o = current();
    const complete = p.options.every(opt => o[opt.name]);
    if (p.priceBy && complete) $('#pdp-price').textContent = money(priceFor(p, o));
    const left = complete ? qtyOf(o) : Infinity;
    $('#add-btn').disabled = left <= 0;
    $('#add-btn').textContent = left <= 0 ? 'Sold out' : 'Add to bag';
    $('#pdp-notice').textContent = left > 0 && left <= 3 ? `Only ${left} left` : '';
    p.options.forEach(opt => { const s = $(`#val-${opt.name}`); if (s) s.textContent = o[opt.name] || ''; });
    if (p.images && p.images.length) {
      // Show the photo tagged with the chosen design or colour, if there is one.
      const pick = p.images.find(i => i.design && i.design === (o.Design || o.Colour));
      if (pick) stage.innerHTML = `<img src="${ROOT}${pick.src}" alt="${pick.alt || p.title}">`;
      return;
    }
    stage.innerHTML = mockupSVG(p.garment, o.Design || o.Colour || '', hasDesign ? {} : { text: 'From Scratch' });
  };
  pdp.addEventListener('change', e => { if (e.target.name?.startsWith('opt-')) paint(); });
  const qty = $('#qty');
  pdp.addEventListener('click', e => {
    const d = e.target.closest('[data-step]');
    if (d) qty.value = Math.max(1, Math.min(10, (parseInt(qty.value, 10) || 1) + Number(d.dataset.step)));
    const th = e.target.closest('.thumbs button');
    if (th) {
      $$('.thumbs button').forEach(b => b.setAttribute('aria-pressed', String(b === th)));
      stage.innerHTML = `<img src="${th.dataset.src}" alt="${p.title}">`;
    }
  });
  $('#add-form').addEventListener('submit', e => {
    e.preventDefault();
    const o = current();
    const missing = p.options.find(opt => !o[opt.name]);
    if (missing) { $('#pdp-notice').textContent = `Please choose a ${missing.name.toLowerCase()}.`; return; }
    if (qtyOf(o) < (parseInt(qty.value, 10) || 1)) { $('#pdp-notice').textContent = `Only ${qtyOf(o)} left in that option.`; return; }
    $('#pdp-notice').textContent = '';
    addToCart(p.handle, o, Math.max(1, Math.min(10, parseInt(qty.value, 10) || 1)));
    toast(`Added to your bag`);
    openCart();
  });
  paint();
}

/* Shop filters are plain links to one page per collection (no script needed). */

/* ---------------- forms (open the visitor's email app) ---------------- */
$$('form[data-mailto]').forEach(form => form.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(form);
  const subject = form.dataset.subject + (fd.get('name') ? ` from ${fd.get('name')}` : '');
  const body = [...fd.entries()].map(([k, v]) => `${k[0].toUpperCase() + k.slice(1)}: ${v}`).join('\n\n');
  window.location.href = `mailto:${DATA.site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  $('.form-done', form.parentElement)?.removeAttribute('hidden');
}));

/* ---------------- after checkout ---------------- */
if (document.body.dataset.page === 'success') { cart = []; save(); }

renderCart();
if (new URLSearchParams(location.search).get('cart') === 'open') openCart();
