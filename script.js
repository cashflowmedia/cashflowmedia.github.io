/* ============ Cash Flow Media – animations & interactions ============ */
gsap.registerPlugin(ScrollTrigger);

/* ---------- Smooth scroll (Lenis) ---------- */
const lenis = new Lenis({
  duration: 0.7,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  smoothTouch: false,
  wheelMultiplier: 1.2,
});
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
lenis.on('scroll', ScrollTrigger.update);

/* ---------- Custom cursor ---------- */
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursor-dot');
let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0;
window.addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  cursorDot.style.left = mouseX + 'px';
  cursorDot.style.top = mouseY + 'px';
});
function animateCursor() {
  cursorX += (mouseX - cursorX) * 0.32;
  cursorY += (mouseY - cursorY) * 0.32;
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
/* Loader fade is handled by inline script (real progress tracking).
   We just trigger the hero intro shortly after window.load. */
window.addEventListener('load', () => {
  setTimeout(runHeroIntro, 1100);
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

/* ---------- Contact chooser modal ---------- */
const contactModal = document.getElementById('contactModal');
function openContactModal() {
  if (!contactModal) return;
  contactModal.classList.add('open');
  contactModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeContactModal() {
  if (!contactModal) return;
  contactModal.classList.remove('open');
  contactModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
if (contactModal) {
  contactModal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeContactModal));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeContactModal(); });
}

/* ---------- Smooth anchor links via Lenis (with contact-modal hijack) ---------- */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const id = link.getAttribute('href');
    // #contact links open the chooser modal instead of scrolling
    if (id === '#contact' && contactModal) {
      e.preventDefault();
      openContactModal();
      return;
    }
    if (id.length > 1) {
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target, { offset: -80, duration: 0.8 });
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

/* ---------- Pricing tab toggle ---------- */
document.querySelectorAll('.price-toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.price-toggle-btn').forEach(b => b.classList.toggle('is-active', b === btn));
    document.querySelectorAll('[data-tab-panel]').forEach(panel => {
      const isMatch = panel.dataset.tabPanel === tab;
      panel.hidden = !isMatch;
      if (isMatch) {
        // re-trigger fade-up animations on the visible panel
        gsap.fromTo(panel.querySelectorAll('.price-card'),
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.07, ease: 'expo.out', overwrite: true }
        );
      }
    });
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

/* ---------- Cycling reviews bubble (upper right) ---------- */
const reviewBubble = document.getElementById('reviewBubble');
if (reviewBubble) {
  const reviews = [
    { text: '"Replaced three banned accounts in one afternoon. Spent more in week 2 than the entire previous month."', author: 'Verified Operator · 8-figure DTC' },
    { text: '"Onboarded in under 30 minutes. Their team actually picks up at 2am."', author: 'Media Buyer · Insurance' },
    { text: '"Onyx BM2500 changed how we operate. We don’t even pause campaigns anymore."', author: 'Agency Founder · 7-fig spend' },
    { text: '"The only provider that actually understood our compliance edge cases."', author: 'Performance Lead · Nutra' },
    { text: '"Was burning $4k/day. They held the line through three policy waves last quarter."', author: 'Growth Lead · Mobile' },
    { text: '"I tried being cheap. Cost me $40k in a week. Cash Flow paid for itself the day I switched."', author: 'Solo Buyer · Coaching' }
  ];
  const textEl = reviewBubble.querySelector('.review-text');
  const authorEl = reviewBubble.querySelector('.review-author');
  let idx = 0;

  function show() {
    const r = reviews[idx];
    textEl.textContent = r.text;
    authorEl.textContent = '— ' + r.author;
    reviewBubble.classList.add('is-visible');
  }
  function hide() { reviewBubble.classList.remove('is-visible'); }

  // Initial show after page settles
  setTimeout(show, 2800);
  // Cycle every 7s
  setInterval(() => {
    hide();
    setTimeout(() => {
      idx = (idx + 1) % reviews.length;
      show();
    }, 600);
  }, 7000);
}

/* ---------- Side ScrollSpy nav ---------- */
const pageNav = document.getElementById('pageNav');
if (pageNav) {
  const items = Array.from(pageNav.querySelectorAll('.page-nav-item'));
  const sections = items
    .map(item => {
      const id = item.getAttribute('href').slice(1);
      return { item, el: document.getElementById(id) };
    })
    .filter(x => x.el);

  // Show nav once user scrolls past the hero
  ScrollTrigger.create({
    start: 'top -180',
    end: 99999,
    onUpdate: self => {
      pageNav.classList.toggle('is-visible', self.scroll() > 220);
    }
  });

  // Mark active section as user scrolls
  function updateActive() {
    const scrollY = window.scrollY + 160; // offset for top nav
    let active = sections[0];
    for (const s of sections) {
      if (s.el.offsetTop <= scrollY) active = s;
    }
    items.forEach(i => i.classList.remove('is-active'));
    if (active) active.item.classList.add('is-active');
  }
  window.addEventListener('scroll', updateActive, { passive: true });
  window.addEventListener('resize', updateActive);
  setTimeout(updateActive, 100);
}

/* ---------- Footer year ---------- */
document.getElementById('year').textContent = new Date().getFullYear();
