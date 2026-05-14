/* ================================================
   Swiss Portfolio — Interaction Logic
   Purposeful, minimal, functional.
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- SCROLL REVEAL ---- */
  const allRevealEls = document.querySelectorAll('.reveal, .reveal-clip, .reveal-left');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = prefersReducedMotion ? 0 : (parseInt(el.dataset.delay, 10) || 0);
          setTimeout(() => el.classList.add('in'), delay);
          revealObserver.unobserve(el);
        }
      });
    },
    { threshold: 0.06, rootMargin: '0px 0px -60px 0px' }
  );

  // Stagger sibling reveals within the same parent container
  const staggerContainers = [
    '.project-list', '.cert-folders', '#experience', '#certifications'
  ];
  const staggeredEls = new Set();

  staggerContainers.forEach(selector => {
    const container = document.querySelector(selector);
    if (!container) return;
    container.querySelectorAll('.reveal, .reveal-clip, .reveal-left').forEach((el, i) => {
      el.dataset.delay = i * 80;
      staggeredEls.add(el);
    });
  });

  allRevealEls.forEach((el) => {
    if (!staggeredEls.has(el)) el.dataset.delay = 0;
    revealObserver.observe(el);
  });

  /* ---- STAT COUNTER ---- */
  const counterEls = document.querySelectorAll('.stat-num[data-count]');

  if (!prefersReducedMotion && counterEls.length) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          const suffix = el.dataset.suffix || '';
          const duration = 1000;
          const start = performance.now();

          const step = (now) => {
            const t = Math.min((now - start) / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(eased * target) + suffix;
            if (t < 1) requestAnimationFrame(step);
          };

          requestAnimationFrame(step);
          counterObserver.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );

    counterEls.forEach(el => counterObserver.observe(el));
  }

  /* ---- ACTIVE NAV STATE (visual + aria-current) ---- */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');

  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(a => {
            const isActive = a.getAttribute('href') === '#' + id;
            a.classList.toggle('active', isActive);
            // aria-current for screen readers
            if (isActive) {
              a.setAttribute('aria-current', 'true');
            } else {
              a.removeAttribute('aria-current');
            }
          });
        }
      });
    },
    { threshold: 0.3 }
  );

  sections.forEach(s => navObserver.observe(s));

  /* ---- HAMBURGER MENU (mobile) ---- */
  const hamburger = document.getElementById('nav-hamburger');
  const navLinksEl = document.getElementById('nav-links');

  if (hamburger && navLinksEl) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinksEl.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      // Prevent body scroll when menu is open
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close menu on link tap
    navLinksEl.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinksEl.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---- PROJECT INLINE EXPANSION ---- */
  const projectRows = document.querySelectorAll('.project-row');

  projectRows.forEach(row => {
    row.addEventListener('click', (e) => {
      // Don't toggle expansion if click is inside the media container
      if (e.target.closest('.proj-media-container')) return;

      const isOpen = row.classList.contains('open');
      projectRows.forEach(r => r.classList.remove('open'));
      if (!isOpen) row.classList.add('open');
    });
  });

  /* ---- IMAGE / VIDEO GALLERY LIGHTBOX — vertical scroll ---- */
  const lightbox       = document.getElementById('img-lightbox');
  const lightboxClose  = document.getElementById('img-lightbox-close');
  const lightboxPrev   = document.getElementById('img-lightbox-prev');
  const lightboxNext   = document.getElementById('img-lightbox-next');
  const lightboxBg     = document.getElementById('img-lightbox-backdrop');
  const lightboxCtr    = document.getElementById('img-lightbox-counter');
  const lightboxScroll = document.getElementById('img-lightbox-scroll');

  const VIDEO_EXTS = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;

  let galleryItems = []; // DOM nodes for each .gallery-item
  let loadObserver = null;
  let counterObserver = null;

  function isVideo(src) { return VIDEO_EXTS.test(src); }

  /* Build all gallery-item DOM nodes (with shimmer placeholders) */
  function buildGallery(srcs) {
    lightboxScroll.innerHTML = '';
    galleryItems = [];

    srcs.forEach((src, i) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.dataset.index = i;
      item.dataset.src = src;

      // Shimmer placeholder rendered immediately
      const placeholder = document.createElement('div');
      placeholder.className = 'gallery-item-placeholder';
      item.appendChild(placeholder);

      lightboxScroll.appendChild(item);
      galleryItems.push(item);
    });
  }

  /* Progressive load observer — loads src when item approaches viewport */
  function setupLoadObserver() {
    if (loadObserver) loadObserver.disconnect();

    loadObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const item = entry.target;
        const src = item.dataset.src;
        if (!src) return;

        if (entry.isIntersecting) {
          // Already loaded? Skip.
          if (item.dataset.loaded) return;
          item.dataset.loaded = '1';

          if (isVideo(src)) {
            const vid = document.createElement('video');
            vid.controls = true;
            vid.playsInline = true;
            vid.muted = true;
            vid.src = src;
            // Remove placeholder once metadata loads
            vid.addEventListener('loadedmetadata', () => {
              item.querySelector('.gallery-item-placeholder')?.remove();
            }, { once: true });
            item.appendChild(vid);
            // Autoplay if it's the first item
            if (parseInt(item.dataset.index) === 0) {
              vid.play().catch(() => {});
            }
          } else {
            const img = document.createElement('img');
            img.alt = `Gallery image ${parseInt(item.dataset.index) + 1}`;
            img.draggable = false;
            img.addEventListener('load', () => {
              img.classList.add('loaded');
              item.querySelector('.gallery-item-placeholder')?.remove();
            }, { once: true });
            img.src = src; // triggers load
            item.appendChild(img);
          }
        } else {
          // Far off-screen: pause & unload videos to free memory
          const vid = item.querySelector('video');
          if (vid && !entry.isIntersecting) {
            const rect = entry.boundingClientRect;
            const rootRect = entry.rootBounds;
            // Only unload if more than ~1 screen away
            if (rootRect && (rect.bottom < rootRect.top - 800 || rect.top > rootRect.bottom + 800)) {
              vid.pause();
              vid.removeAttribute('src');
              vid.load();
              delete item.dataset.loaded; // allow reload when it re-enters
              // Restore placeholder
              if (!item.querySelector('.gallery-item-placeholder')) {
                const ph = document.createElement('div');
                ph.className = 'gallery-item-placeholder';
                item.insertBefore(ph, item.querySelector('video'));
              }
            }
          }
        }
      });
    }, {
      root: lightboxScroll,
      rootMargin: '300px 0px 300px 0px', // start loading 300px before entering view
      threshold: 0
    });

    galleryItems.forEach(item => loadObserver.observe(item));
  }

  /* Counter observer — updates "X / Y" as items scroll into view */
  function setupCounterObserver(total) {
    if (counterObserver) counterObserver.disconnect();

    counterObserver = new IntersectionObserver((entries) => {
      // Find the entry closest to the center that is intersecting
      let best = null;
      let bestRatio = -1;
      entries.forEach(e => {
        if (e.intersectionRatio > bestRatio) {
          bestRatio = e.intersectionRatio;
          best = e;
        }
      });
      if (best && best.isIntersecting) {
        const idx = parseInt(best.target.dataset.index) + 1;
        lightboxCtr.textContent = `${idx} / ${total}`;
      }
    }, {
      root: lightboxScroll,
      rootMargin: '0px',
      threshold: [0.1, 0.5]
    });

    galleryItems.forEach(item => counterObserver.observe(item));
  }

  function openGallery(srcs) {
    buildGallery(srcs);
    lightbox.classList.toggle('single', srcs.length === 1);
    lightboxCtr.textContent = `1 / ${srcs.length}`;
    lightboxScroll.scrollTop = 0;

    setupLoadObserver();
    setupCounterObserver(srcs.length);

    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeGallery() {
    // Pause and unload all videos
    lightboxScroll.querySelectorAll('video').forEach(v => {
      v.pause();
      v.removeAttribute('src');
      v.load();
    });
    if (loadObserver) loadObserver.disconnect();
    if (counterObserver) counterObserver.disconnect();

    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Clear DOM after fade-out
    setTimeout(() => { lightboxScroll.innerHTML = ''; }, 350);
  }

  /* Scroll to adjacent item */
  function scrollToItem(delta) {
    // Find which item is most visible now
    let currentIdx = 0;
    let bestRatio = -1;
    galleryItems.forEach((item, i) => {
      const rect = item.getBoundingClientRect();
      const scrollRect = lightboxScroll.getBoundingClientRect();
      const visible = Math.min(rect.bottom, scrollRect.bottom) - Math.max(rect.top, scrollRect.top);
      const ratio = visible / rect.height;
      if (ratio > bestRatio) { bestRatio = ratio; currentIdx = i; }
    });

    const targetIdx = Math.max(0, Math.min(galleryItems.length - 1, currentIdx + delta));
    galleryItems[targetIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  lightboxClose.addEventListener('click', closeGallery);
  lightboxBg.addEventListener('click', closeGallery);
  lightboxPrev.addEventListener('click', () => scrollToItem(-1));
  lightboxNext.addEventListener('click', () => scrollToItem(1));

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')    closeGallery();
    if (e.key === 'ArrowUp')   scrollToItem(-1);
    if (e.key === 'ArrowDown') scrollToItem(1);
  });

  // Wire up each project's media container
  document.querySelectorAll('.proj-media-container[data-gallery]').forEach(container => {
    container.addEventListener('click', (e) => {
      e.stopPropagation();
      const items = JSON.parse(container.dataset.gallery);
      openGallery(items);
    });

    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const items = JSON.parse(container.dataset.gallery);
        openGallery(items);
      }
    });
  });

});
