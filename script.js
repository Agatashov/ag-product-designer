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

  /* ---- PROJECT INLINE EXPANSION & VIDEO LIGHTBOX ---- */
  const projectRows = document.querySelectorAll('.project-row');
  const lightbox = document.getElementById('video-lightbox');
  const lightboxVideo = document.getElementById('lightbox-video');

  const videoProgress = {};
  let activeVideoSrc = null;

  function openLightbox(videoSrc) {
    if (activeVideoSrc !== videoSrc) {
      lightboxVideo.src = videoSrc;
      activeVideoSrc = videoSrc;
    }
    lightbox.classList.add('open');
    // Resume from saved progress, or start at 0
    lightboxVideo.currentTime = videoProgress[videoSrc] || 0;
    lightboxVideo.play().catch(() => {});
  }

  function closeLightbox() {
    if (!lightbox.classList.contains('open')) return;
    
    // Save current playback position
    if (activeVideoSrc) {
      videoProgress[activeVideoSrc] = lightboxVideo.currentTime;
    }

    lightbox.classList.remove('open');
    lightboxVideo.pause();
  }

  // Escape as keyboard safety valve
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  projectRows.forEach(row => {
    const mediaContainer = row.querySelector('.proj-media-container');

    if (mediaContainer) {
      // Hover initial image → show popup
      mediaContainer.addEventListener('mouseenter', () => {
        const videoSrc = mediaContainer.dataset.video;
        if (videoSrc) openLightbox(videoSrc);
      });

      // Leave initial image → hide popup
      mediaContainer.addEventListener('mouseleave', closeLightbox);
    }

    // Row toggle expansion logic
    row.addEventListener('click', () => {
      const isOpen = row.classList.contains('open');
      projectRows.forEach(r => r.classList.remove('open'));
      if (!isOpen) row.classList.add('open');
    });
  });

});
