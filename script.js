/* ============ Cash Flow Media – animations & interactions ============ */
gsap.registerPlugin(ScrollTrigger);

/* ---------- Smooth scroll (Lenis) ---------- */
const lenis = new Lenis({
  duration: 1.2,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  smoothTouch: false,
});
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
lenis.on('scroll', ScrollTrigger.update);

/* ---------- Custom cursor ---------- */
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursor-dot');
let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0;
window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; cursorDot.style.left = mouseX + 'px'; cursorDot.style.top = mouseY + 'px'; });
function animateCursor() {
  cursorX += (mouseX - cursorX) * 0.15;
  cursorY += (mouseY - cursorY) * 0.15;
  cursor.style.left = cursorX + 'px';
  cursor.style.top  = cursorY + 'px';
  requestAnimationFrame(animateCursor);
}
animateCursor();
document.querySelectorAll('a, button, .card, .price-card, .faq-item summary').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
});

/* ---------- Loader ---------- */
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  gsap.to(loader, {
    opacity: 0, duration: 0.6, delay: 1.4,
    onComplete: () => { loader.style.display = 'none'; runHeroIntro(); }
  });
});

/* ---------- Hero intro ---------- */
function runHeroIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.to('.hero-badge', { opacity: 1, duration: 0.8 })
    .to('.hero-title .word', {
      y: 0, opacity: 1, duration: 1.2,
      stagger: 0.06,
    }, '-=0.5')
    .to('.hero-sub',  { opacity: 1, y: 0, duration: 1 }, '-=0.7')
    .to('.hero-cta',  { opacity: 1, y: 0, duration: 0.9 }, '-=0.6')
    .to('.hero-stats',{ opacity: 1, y: 0, duration: 0.9 }, '-=0.6')
    .to('.scroll-hint',{ opacity: 1, duration: 0.8 }, '-=0.4');

  // count-up
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.includes('.')) ? 1 : 0;
    gsap.fromTo(el, { innerText: 0 }, {
      innerText: target,
      duration: 2, delay: 1.2, ease: 'power2.out',
      snap: decimals ? { innerText: 0.1 } : { innerText: 1 },
      onUpdate: function () {
        el.innerText = decimals
          ? parseFloat(el.innerText).toFixed(1)
          : Math.floor(el.innerText).toLocaleString();
      }
    });
  });
}

/* ---------- Scroll reveal ---------- */
gsap.utils.toArray('[data-anim]').forEach(el => {
  // skip hero-internal — handled by intro timeline
  if (el.closest('.hero')) return;
  const delay = parseFloat(el.dataset.delay || 0);
  gsap.to(el, {
    opacity: 1, y: 0,
    duration: 1, delay,
    ease: 'expo.out',
    scrollTrigger: { trigger: el, start: 'top 85%' }
  });
});

/* ---------- Card spotlight follow ---------- */
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
});

/* ---------- Magnetic buttons ---------- */
document.querySelectorAll('.magnetic').forEach(btn => {
  const strength = 0.35;
  btn.addEventListener('mousemove', e => {
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top  - r.height / 2;
    gsap.to(btn, { x: x * strength, y: y * strength, duration: 0.4, ease: 'power3.out' });
  });
  btn.addEventListener('mouseleave', () => {
    gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' });
  });
});

/* ---------- Nav scroll state ---------- */
const nav = document.getElementById('nav');
ScrollTrigger.create({
  start: 'top -50',
  end: 99999,
  onUpdate: self => {
    nav.classList.toggle('scrolled', self.scroll() > 50);
  }
});

/* ---------- Smooth anchor links via Lenis ---------- */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const id = link.getAttribute('href');
    if (id.length > 1) {
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target, { offset: -80, duration: 1.4 });
      }
    }
  });
});

/* ---------- Hero parallax on glow ---------- */
gsap.to('.bg-glow-1', {
  yPercent: 30, ease: 'none',
  scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom top', scrub: 1 }
});
gsap.to('.bg-glow-2', {
  yPercent: -20, ease: 'none',
  scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom top', scrub: 1 }
});

/* ---------- Section title char shimmer on enter ---------- */
gsap.utils.toArray('.section-title').forEach(title => {
  ScrollTrigger.create({
    trigger: title, start: 'top 80%',
    onEnter: () => title.classList.add('in-view')
  });
});

/* ---------- Support widget toggle ---------- */
const supportWidget = document.getElementById('supportWidget');
const supportFab = document.getElementById('supportFab');
if (supportFab && supportWidget) {
  supportFab.addEventListener('click', e => {
    e.stopPropagation();
    const open = supportWidget.classList.toggle('open');
    supportFab.setAttribute('aria-expanded', open);
  });
  // close on outside click
  document.addEventListener('click', e => {
    if (!supportWidget.contains(e.target) && supportWidget.classList.contains('open')) {
      supportWidget.classList.remove('open');
      supportFab.setAttribute('aria-expanded', 'false');
    }
  });
  // close on escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && supportWidget.classList.contains('open')) {
      supportWidget.classList.remove('open');
      supportFab.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ---------- Footer year ---------- */
document.getElementById('year').textContent = new Date().getFullYear();
