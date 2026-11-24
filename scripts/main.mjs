// SPDX-FileCopyrightText: Copyright (c) 2026 MissionHub Open Source Community
// SPDX-License-Identifier: MIT

import { COPY, META } from './i18n.mjs';
import { initHeroField } from './hero-field.mjs';
import { initMascotPet } from './mascot-buddy.mjs';

const root = document.documentElement;
root.classList.add('js');

const pageKey = document.body.dataset.page && META[document.body.dataset.page] ? document.body.dataset.page : 'home';

/* ---------- Language Switcher ---------- */
const langButton = document.getElementById('lang-toggle');
const menuButton = document.getElementById('menu-toggle');
const mainNav = document.getElementById('main-nav');
let currentLang = 'zh';
let resizeHeroField = () => {};

function syncMenuLabel() {
  if (!menuButton || !mainNav) return;
  const open = mainNav.classList.contains('is-open');
  menuButton.setAttribute('aria-label', META[pageKey][currentLang][open ? 'menuClose' : 'menuOpen']);
}

function applyLanguage(next) {
  currentLang = next === 'en' ? 'en' : 'zh';
  root.lang = currentLang === 'en' ? 'en' : 'zh-CN';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const entry = COPY[el.dataset.i18n];
    if (entry?.[currentLang] !== undefined) {
      el.textContent = entry[currentLang];
    }
  });

  for (const attr of ['aria-label', 'alt']) {
    document.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => {
      const key = el.getAttribute(`data-i18n-${attr}`);
      const entry = COPY[key];
      if (entry?.[currentLang] !== undefined) {
        el.setAttribute(attr, entry[currentLang]);
      }
    });
  }

  document.title = META[pageKey][currentLang].title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', META[pageKey][currentLang].description);

  if (langButton) {
    langButton.textContent = META[pageKey][currentLang].langLabel;
    langButton.setAttribute('aria-label', META[pageKey][currentLang].langAria);
  }

  syncMenuLabel();
  try {
    localStorage.setItem('missionhub.lang', currentLang);
  } catch {
    // Ignore storage quota or privacy-mode errors.
  }
  requestAnimationFrame(() => resizeHeroField());
}

langButton?.addEventListener('click', () => {
  applyLanguage(currentLang === 'en' ? 'zh' : 'en');
});

/* ---------- Mobile Navigation Drawer ---------- */
function setMenuOpen(open) {
  if (!mainNav || !menuButton) return;
  mainNav.classList.toggle('is-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  const openIcon = menuButton.querySelector('.i-open');
  const closeIcon = menuButton.querySelector('.i-close');
  if (openIcon && closeIcon) {
    openIcon.hidden = open;
    closeIcon.hidden = !open;
  }
  syncMenuLabel();
}

menuButton?.addEventListener('click', () => {
  setMenuOpen(!mainNav.classList.contains('is-open'));
});

mainNav?.addEventListener('click', event => {
  if (event.target.closest('a')) setMenuOpen(false);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && mainNav?.classList.contains('is-open')) {
    setMenuOpen(false);
    menuButton?.focus();
  }
});

window.matchMedia('(min-width: 961px)').addEventListener('change', event => {
  if (event.matches) setMenuOpen(false);
});

/* ---------- Sticky Header State & Scroll Spy ---------- */
const header = document.querySelector('.site-header');
function onScroll() {
  header?.classList.toggle('is-scrolled', window.scrollY > 10);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const navHashLinks = [...document.querySelectorAll('#main-nav a[href^="#"]')];
if ('IntersectionObserver' in window) {
  if (navHashLinks.length) {
    const spyObserver = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const hash = `#${entry.target.id}`;
          navHashLinks.forEach(link => {
            if (link.getAttribute('href') === hash) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
          });
        }
      },
      { rootMargin: '-40% 0px -50% 0px' },
    );
    document.querySelectorAll('main section[id]').forEach(section => spyObserver.observe(section));
  }

  const revealObserver = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -6% 0px' },
  );
  document.querySelectorAll('.reveal').forEach((el, idx) => {
    el.style.transitionDelay = `${(idx % 4) * 55}ms`;
    revealObserver.observe(el);
  });
} else {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-in'));
}

/* ---------- Kinetic 3D Pointer Tilt for MissionHub Hero Emblem Stage ---------- */
const stage = document.querySelector('.hub-stage');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (stage) {
  let stageVisible = true;
  let tiltFrame = null;
  let pointerX = 0;
  let pointerY = 0;

  function resetTilt() {
    if (tiltFrame !== null) cancelAnimationFrame(tiltFrame);
    tiltFrame = null;
    stage.style.removeProperty('--tilt-x');
    stage.style.removeProperty('--tilt-y');
  }

  function syncStageMotion() {
    const paused = document.hidden || !stageVisible || reducedMotion.matches;
    stage.classList.toggle('motion-paused', paused);
    if (paused) resetTilt();
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      stageVisible = entry.isIntersecting;
      syncStageMotion();
    }).observe(stage);
  }
  document.addEventListener('visibilitychange', syncStageMotion);
  reducedMotion.addEventListener('change', syncStageMotion);

  stage.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || reducedMotion.matches || !stageVisible) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (tiltFrame !== null) return;
    tiltFrame = requestAnimationFrame(() => {
      tiltFrame = null;
      const bounds = stage.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, ((pointerX - bounds.left) / bounds.width) * 2 - 1));
      const ny = Math.max(-1, Math.min(1, ((pointerY - bounds.top) / bounds.height) * 2 - 1));
      stage.style.setProperty('--tilt-x', `${(-ny * 5).toFixed(2)}deg`);
      stage.style.setProperty('--tilt-y', `${(nx * 5).toFixed(2)}deg`);
    });
  });
  stage.addEventListener('pointerleave', resetTilt);
  stage.addEventListener('pointercancel', resetTilt);
  syncStageMotion();
}

/* ---------- Mascot Sticker Filter & Lightbox ---------- */
const filterButtons = [...document.querySelectorAll('[data-sticker-filter]')];
const stickerCards = [...document.querySelectorAll('[data-sticker-cat]')];

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    const category = button.dataset.stickerFilter;
    filterButtons.forEach(btn => {
      const active = btn === button;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    stickerCards.forEach(card => {
      card.hidden = category !== 'all' && card.dataset.stickerCat !== category;
    });
  });
});

const lightbox = document.getElementById('sticker-lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxClose = document.getElementById('lightbox-close');

document.querySelectorAll('[data-sticker-trigger]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!lightbox || !lightboxImg) return;
    const img = btn.querySelector('img');
    const titleEl = btn.querySelector('span');
    const fileCode = btn.dataset.stickerFile || '';
    lightboxImg.src = img.currentSrc || img.src;
    lightboxImg.alt = img.alt;
    if (lightboxTitle) lightboxTitle.textContent = titleEl?.textContent || 'MissionHub-chan';
    if (lightboxCaption) lightboxCaption.textContent = `missionhub-oss/mascot · ${fileCode} · Apache-2.0`;
    lightbox.showModal();
  });
});

lightboxClose?.addEventListener('click', () => lightbox?.close());
lightbox?.addEventListener('click', event => {
  if (event.target === lightbox) lightbox.close();
});

/* ---------- Initialize ---------- */
const heroCanvas = document.getElementById('hero-field');
if (heroCanvas) {
  resizeHeroField = initHeroField(heroCanvas);
}
let savedLang = 'zh';
try {
  if (localStorage.getItem('missionhub.lang') === 'en') savedLang = 'en';
} catch {
  savedLang = 'zh';
}
const petEl = document.getElementById('mascot-pet');
if (petEl) {
  initMascotPet(petEl);
}
applyLanguage(savedLang);
