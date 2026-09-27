/**
 * THE KARTIK CLICKS — Core Application Controller
 * Photographer: Kartik Gupta
 * Client-Side Router, Lightbox Engine, Theme Manager, Custom Cursor & Interactions
 */

import { SITE_INFO, CATEGORIES, PHOTOS, STORIES, ABOUT_CONTENT, CATEGORY_POOLS } from './galleryData.js';

// --- Category-Aware Photo Queue Manager ---
class CategoryQueueManager {
  constructor(categoryPools) {
    this.pools = categoryPools;
    this.queues = {};
    this.activeOnScreenIds = new Set();
    this.lastServedId = {};

    for (const cat in this.pools) {
      this.queues[cat] = this._shuffledCopy(this.pools[cat]);
    }
  }

  _shuffledCopy(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  getNextPhoto(category, currentPhotoId = null, extraExcludeIds = []) {
    const pool = this.pools[category];
    if (!pool || pool.length === 0) return null;
    if (pool.length === 1) return pool[0];

    let queue = this.queues[category];
    if (!queue || queue.length === 0) {
      let newQueue = this._shuffledCopy(pool);
      if (newQueue[0].id === currentPhotoId && newQueue.length > 1) {
        const swapIdx = Math.floor(Math.random() * (newQueue.length - 1)) + 1;
        [newQueue[0], newQueue[swapIdx]] = [newQueue[swapIdx], newQueue[0]];
      }
      this.queues[category] = newQueue;
      queue = newQueue;
    }

    let candidateIdx = queue.findIndex(p =>
      p.id !== currentPhotoId &&
      !extraExcludeIds.includes(p.id) &&
      !this.activeOnScreenIds.has(p.id)
    );

    if (candidateIdx === -1) {
      candidateIdx = queue.findIndex(p => p.id !== currentPhotoId && !extraExcludeIds.includes(p.id));
    }
    if (candidateIdx === -1) {
      candidateIdx = queue.findIndex(p => p.id !== currentPhotoId);
    }
    if (candidateIdx === -1) {
      candidateIdx = 0;
    }

    const [selected] = queue.splice(candidateIdx, 1);
    this.lastServedId[category] = selected.id;
    return selected;
  }

  registerActive(id) {
    if (id) this.activeOnScreenIds.add(id);
  }

  unregisterActive(id) {
    if (id) this.activeOnScreenIds.delete(id);
  }

  preloadImage(url) {
    if (!url) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }
}

const queueManager = new CategoryQueueManager(CATEGORY_POOLS);

// --- State Management ---
const state = {
  currentCategory: 'all',
  lightboxActive: false,
  lightboxIndex: 0,
  activePhotoList: [...PHOTOS],
  theme: localStorage.getItem('kartik-theme') || 'dark',
};

// --- DOM References ---
const app = document.getElementById('app');
const nav = document.getElementById('nav');
const themeBtn = document.getElementById('theme-toggle');
const menuBtn = document.getElementById('mobile-menu-btn');
const mobileDrawer = document.getElementById('mobile-drawer');
const lightboxEl = document.getElementById('lightbox');
const toastEl = document.getElementById('toast');

// --- Helper Functions ---
function getWebpOrOrig(photo) {
  return photo.web || photo.original;
}

function getThumbOrOrig(photo) {
  return photo.thumb || photo.web || photo.original;
}

function showToast(message, duration = 3200) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), duration);
}

// --- Theme Controller ---
function initTheme() {
  document.documentElement.dataset.theme = state.theme;
  updateThemeIcon();

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = state.theme;
      localStorage.setItem('kartik-theme', state.theme);
      updateThemeIcon();
    });
  }
}

function updateThemeIcon() {
  if (!themeBtn) return;
  themeBtn.innerHTML = state.theme === 'dark' ? '◐' : '◑';
  themeBtn.setAttribute('aria-label', `Switch to ${state.theme === 'dark' ? 'light' : 'dark'} mode`);
}

// --- Lightbox Engine ---
function openLightbox(photoId, customList = null) {
  state.activePhotoList = customList || PHOTOS;
  const index = state.activePhotoList.findIndex(p => p.id === photoId);
  state.lightboxIndex = index !== -1 ? index : 0;
  state.lightboxActive = true;
  renderLightbox();
  lightboxEl.classList.add('active');
  lightboxEl.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  state.lightboxActive = false;
  lightboxEl.classList.remove('active');
  lightboxEl.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function prevLightbox() {
  if (!state.lightboxActive) return;
  state.lightboxIndex = (state.lightboxIndex - 1 + state.activePhotoList.length) % state.activePhotoList.length;
  renderLightbox();
}

function nextLightbox() {
  if (!state.lightboxActive) return;
  state.lightboxIndex = (state.lightboxIndex + 1) % state.activePhotoList.length;
  renderLightbox();
}

function renderLightbox() {
  const photo = state.activePhotoList[state.lightboxIndex];
  if (!photo) return;

  const total = state.activePhotoList.length;
  const currentNum = String(state.lightboxIndex + 1).padStart(2, '0');
  const totalNum = String(total).padStart(2, '0');

  const counterEl = document.getElementById('lb-counter');
  const imgEl = document.getElementById('lb-img');
  const titleEl = document.getElementById('lb-title');
  const captionEl = document.getElementById('lb-caption');
  const metaEl = document.getElementById('lb-meta');
  const rawLinkEl = document.getElementById('lb-raw-link');

  if (counterEl) counterEl.textContent = `${currentNum} / ${totalNum}`;
  if (imgEl) {
    imgEl.style.opacity = '0';
    imgEl.src = getWebpOrOrig(photo);
    imgEl.alt = `${photo.title} by Kartik Gupta`;
    imgEl.onload = () => {
      imgEl.style.opacity = '1';
    };
  }
  if (titleEl) titleEl.textContent = photo.title;
  if (captionEl) captionEl.textContent = photo.caption || `${photo.location} · ${photo.date}`;
  if (metaEl) {
    metaEl.innerHTML = `
      <span>${photo.location}</span>
      <span>•</span>
      <span>${photo.date}</span>
      <span>•</span>
      <span>${photo.category.toUpperCase()}</span>
    `;
  }
  if (rawLinkEl) {
    rawLinkEl.href = photo.original;
    rawLinkEl.setAttribute('download', photo.filename);
  }
}

// Lightbox Event Listeners
function initLightboxEvents() {
  const closeBtn = document.getElementById('lb-close');
  const prevBtn = document.getElementById('lb-prev');
  const nextBtn = document.getElementById('lb-next');
  const stage = document.getElementById('lb-stage');

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', prevLightbox);
  if (nextBtn) nextBtn.addEventListener('click', nextLightbox);

  // Close when clicking empty backdrop
  if (stage) {
    stage.addEventListener('click', (e) => {
      if (e.target === stage || e.target.classList.contains('lightbox-img-wrap')) {
        closeLightbox();
      }
    });
  }

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (!state.lightboxActive) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prevLightbox();
    if (e.key === 'ArrowRight') nextLightbox();
  });

  // Touch Swipe for Mobile
  let touchStartX = 0;
  let touchEndX = 0;

  if (lightboxEl) {
    lightboxEl.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightboxEl.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });
  }

  function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
      nextLightbox(); // Swiped left -> Next photo
    }
    if (touchEndX > touchStartX + swipeThreshold) {
      prevLightbox(); // Swiped right -> Prev photo
    }
  }
}

// --- Custom Desktop Cursor ---
function initCustomCursor() {
  const cursor = document.getElementById('custom-cursor');
  const follower = document.getElementById('cursor-follower');
  if (!cursor || !follower) return;

  let mouseX = -100;
  let mouseY = -100;
  let followerX = -100;
  let followerY = -100;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
  });

  function animateFollower() {
    followerX += (mouseX - followerX) * 0.18;
    followerY += (mouseY - followerY) * 0.18;
    follower.style.transform = `translate(${followerX}px, ${followerY}px)`;
    requestAnimationFrame(animateFollower);
  }
  animateFollower();

  // Hover states on clickable photography elements
  document.addEventListener('mouseover', (e) => {
    const clickablePhoto = e.target.closest('[data-lightbox], .world-card, .story-card, .featured-card, .hero-frame, .filmstrip-thumb');
    if (clickablePhoto) {
      document.body.classList.add('cursor-view');
      follower.textContent = 'VIEW';
    }
  });

  document.addEventListener('mouseout', (e) => {
    const clickablePhoto = e.target.closest('[data-lightbox], .world-card, .story-card, .featured-card, .hero-frame, .filmstrip-thumb');
    if (clickablePhoto) {
      document.body.classList.remove('cursor-view');
      follower.textContent = '';
    }
  });
}

// --- Mobile Navigation Drawer ---
function initMobileMenu() {
  if (!menuBtn || !mobileDrawer) return;

  menuBtn.addEventListener('click', () => {
    const isOpen = mobileDrawer.classList.contains('open');
    if (isOpen) {
      mobileDrawer.classList.remove('open');
      menuBtn.classList.remove('open');
      document.body.style.overflow = '';
      menuBtn.setAttribute('aria-expanded', 'false');
    } else {
      mobileDrawer.classList.add('open');
      menuBtn.classList.add('open');
      document.body.style.overflow = 'hidden';
      menuBtn.setAttribute('aria-expanded', 'true');
    }
  });

  mobileDrawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileDrawer.classList.remove('open');
      menuBtn.classList.remove('open');
      document.body.style.overflow = '';
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

// --- Contact Form & Mail Handler ---
window.handleContactSubmit = function (e) {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const projectType = form.project_type ? form.project_type.value : 'Photography Inquiry';
  const message = form.message.value.trim();

  const subject = encodeURIComponent(`${projectType} — ${name} [THE KARTIK CLICKS Inquiry]`);
  const body = encodeURIComponent(
    `Hello Kartik,\n\n${message}\n\nKind regards,\n${name}\nEmail: ${email}`
  );

  window.location.href = `mailto:${SITE_INFO.email}?subject=${subject}&body=${body}`;
  showToast('Opening your email client...');
};

window.copyEmail = function () {
  navigator.clipboard.writeText(SITE_INFO.email).then(() => {
    showToast(`Copied ${SITE_INFO.email} to clipboard!`);
  }).catch(() => {
    showToast(`Contact: ${SITE_INFO.email}`);
  });
};

// --- Page Renderers ---

// 1. Home Page
function renderHome() {
  const initialFrames = [
    {
      frameId: 0,
      num: '05',
      cat: 'NATURE',
      category: 'nature',
      photo: PHOTOS.find(p => p.id === 'foliage-perch') || PHOTOS.find(p => p.category === 'nature') || PHOTOS[0],
      displayTitle: 'Hidden Beauty',
      displayLoc: 'Dadra & Nagar Haveli'
    },
    {
      frameId: 1,
      num: '03',
      cat: 'TRAVEL',
      category: 'travel',
      photo: PHOTOS.find(p => p.id === 'ramparts-of-the-sun') || PHOTOS.find(p => p.category === 'travel') || PHOTOS[1],
      displayTitle: 'The Open Corridor',
      displayLoc: 'Delhi-NCR Expressway'
    },
    {
      frameId: 2,
      num: '02',
      cat: 'STREET',
      category: 'street',
      photo: PHOTOS.find(p => p.id === 'connaught-pillars-1') || PHOTOS.find(p => p.category === 'street') || PHOTOS[2],
      displayTitle: 'Pillars of Comfort',
      displayLoc: 'Connaught Place, Delhi'
    },
    {
      frameId: 3,
      num: '04',
      cat: 'WILDLIFE',
      category: 'wildlife',
      photo: PHOTOS.find(p => p.id === 'patience-in-the-dust') || PHOTOS.find(p => p.category === 'wildlife') || PHOTOS[3],
      displayTitle: 'A Silent Companion',
      displayLoc: 'Dadra & Nagar Haveli'
    },
    {
      frameId: 4,
      num: '06',
      cat: 'SKY',
      category: 'sky',
      photo: PHOTOS.find(p => p.id === 'lunar-veil') || PHOTOS.find(p => p.category === 'sky') || PHOTOS[4],
      displayTitle: 'Moonlit Nights',
      displayLoc: 'Silvassa'
    }
  ];

  const featuredLead = PHOTOS.find(p => p.id === 'azure-perch') || PHOTOS[0];
  const featuredStack1 = PHOTOS.find(p => p.id === 'ramparts-of-the-sun') || PHOTOS[1];
  const featuredStack2 = PHOTOS.find(p => p.id === 'golden-hour-transit') || PHOTOS[3];

  const triad1 = PHOTOS.find(p => p.id === 'connaught-pillars-1');
  const triad2 = PHOTOS.find(p => p.id === 'dusk-over-gopuram');
  const triad3 = PHOTOS.find(p => p.id === 'lunar-veil');

  return `
    <div class="home-view">
      <!-- Section 1: Cinematic Editorial Hero (Exact Reference Matched) -->
      <section class="hero cinematic-hero" id="hero">
        <div class="hero-vignette" aria-hidden="true"></div>
        <div class="hero-foliage bottom-left" aria-hidden="true"></div>
        <div class="hero-foliage bottom-right" aria-hidden="true"></div>

        <!-- Subtle Background Film Negative Strips -->
        <div class="hero-film-backing" aria-hidden="true">
          <div class="film-negative-strip strip-1"></div>
          <div class="film-negative-strip strip-2"></div>
        </div>

        <!-- Left: Editorial Content Block -->
        <div class="hero-copy">
          <div class="hero-kicker-box">
            <span class="hkb-line1">DELHI NCR — SILVASSA</span>
            <span class="hkb-line2">PHOTOGRAPHY — STORIES — MOMENTS</span>
          </div>

          <div class="hero-script-lead">Capturing moments,<br>telling stories</div>

          <h1 class="hero-title">
            THE KARTIK<br>
            <span class="clicks-red">CLICKS</span>
          </h1>

          <!-- Red accent dot near CLICKS -->
          <span class="hero-lead-red-dot" aria-hidden="true"></span>

          <div class="hero-author-meta">KARTIK GUPTA / PHOTOGRAPHER</div>
          <div class="hero-author-sub">35MM · ISO 400 · APERTURE &amp; LIGHT</div>

          <div class="hero-cat-pills">
            <span>STREET</span>
            <span class="cat-bullet">·</span>
            <span>NATURE</span>
            <span class="cat-bullet">·</span>
            <span>TRAVEL</span>
            <span class="cat-bullet">·</span>
            <span>WILDLIFE</span>
            <span class="cat-bullet">·</span>
            <span>B&amp;W</span>
          </div>

          <div class="hero-cta-row">
            <a class="cta-pill" href="/gallery">
              <span class="cta-arrow-circle">→</span>
              <span>EXPLORE MY WORLD</span>
            </a>
          </div>

          <div class="hero-script-subnote">
            A personal archive of quiet encounters, urban motion, and changing skies.
          </div>
        </div>

        <!-- Center Visual Stage: 5 Large Film Frames + Fixed Foreground Cutout -->
        <div class="hero-stage">
          <div class="hero-collage" id="hero-collage">
            ${initialFrames.map((item, idx) => `
              <!-- Frame ${item.num}: ${item.cat} -->
              <div class="hero-film-frame hff-${idx + 1}" id="hf-${idx}" data-frame-index="${idx}" data-category="${item.category}" data-photo-id="${item.photo.id}" title="Click to view full photo: ${item.photo.title}">
                <div class="ff-bracket top-left"></div>
                <div class="ff-bracket top-right"></div>
                <div class="ff-bracket bottom-left"></div>
                <div class="ff-bracket bottom-right"></div>

                <div class="ff-header">
                  <span class="ff-num">${item.num}</span>
                  <span class="ff-cat">${item.cat}</span>
                  <div class="ff-meta">
                    <span>35MM · ISO 400</span>
                    <span class="ff-red-dot">●</span>
                  </div>
                </div>

                <div class="ff-media-box">
                  <div class="ff-layer current">
                    <img src="${getWebpOrOrig(item.photo)}" alt="${item.photo.title}">
                  </div>
                  <div class="ff-layer next">
                    <img src="" alt="">
                  </div>
                </div>

                <div class="ff-footer">
                  <div class="ff-footer-left">
                    <span class="ff-title">${item.displayTitle || item.photo.title}</span>
                    <span class="ff-sub-tech">35MM · ISO 400</span>
                  </div>
                  <span class="ff-location">${item.displayLoc || item.photo.location}</span>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- FIXED FOREGROUND SUBJECT: REAL KARTIK CUTOUT (CANON CAMERA) -->
          <div class="hero-portrait-wrapper">
            <picture>
              <source srcset="/assets/optimized/web/kartik-cutout.webp" type="image/webp">
              <img class="hero-portrait" src="/assets/kartik-cutout.png" alt="Kartik Gupta holding Canon camera">
            </picture>
          </div>
        </div>

        <!-- Right Side Vertical Editorial Handwriting -->
        <div class="hero-editorial-right" aria-hidden="true">
          <div class="hero-cat-handwriting">
            <span>Street</span>
            <span>Nature</span>
            <span>Travel</span>
            <span>Wildlife</span>
            <span>B&amp;W</span>
            <span>Sky</span>
            <span class="hero-curved-swirl">⤹</span>
          </div>
        </div>

        <!-- Bottom Interactive Contact-Sheet Filmstrip Bar -->
        <div class="hero-filmstrip-bar">
          <button class="hero-scroll-btn" onclick="document.getElementById('about').scrollIntoView({behavior:'smooth'})" aria-label="Scroll to about section">
            <span class="mouse-icon" aria-hidden="true"></span>
            <span class="hero-scroll-text">SCROLL<br>TO EXPLORE</span>
          </button>

          <div class="filmstrip-container">
            <div class="filmstrip-sprockets top" aria-hidden="true">
              <span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span>
            </div>
            <div class="filmstrip-track" id="hero-filmstrip-track">
              ${initialFrames.map((item, idx) => `
                <button class="filmstrip-thumb ${idx === 1 ? 'active' : ''}" data-target-frame="${idx}" aria-label="Frame ${item.num}: ${item.photo.title}">
                  <img src="${getThumbOrOrig(item.photo)}" alt="${item.photo.title}">
                </button>
              `).join('')}
            </div>
            <div class="filmstrip-sprockets bottom" aria-hidden="true">
              <span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span><span>■</span>
            </div>
          </div>

          <div class="hero-bottom-controls">
            <span class="hero-counter-label"><span id="hero-counter-num">03</span> / 06</span>
            <button class="hero-circle-btn" id="hero-prev" aria-label="Previous collage frame">←</button>
            <button class="hero-circle-btn" id="hero-next" aria-label="Next collage frame">→</button>
          </div>
        </div>
      </section>

      <!-- Section 2: About Me (STRICT REQUIREMENT: MUST DIRECTLY FOLLOW HERO) -->
      <section class="about" id="about">
        <div class="about-photo">
          <picture>
            <source srcset="/assets/optimized/web/kartik-camera.webp" type="image/webp">
            <img src="/assets/kartik-camera.png" alt="Kartik Gupta with Canon camera">
          </picture>
          <div class="about-photo-badge">KARTIK GUPTA / PHOTOGRAPHER</div>
        </div>
        <div class="about-copy">
          <div class="kicker">01 / About the Artist</div>
          <h2 class="section-title">A photographer with an eye for <em>moments.</em></h2>
          <p>
            Kartik Gupta is a photographer working across Delhi NCR and Silvassa, India. His work explores the delicate equilibrium between urban cadence and natural stillness—capturing moments that unfold without intervention or stage direction.
          </p>
          <p>
            His archive spans wildlife, architectural geometry, changing skies, candid street scenes, and travel diaries. Grounded in patience and natural daylight, each photograph is an inquiry into how light sculpts emotion.
          </p>
          <div class="about-quote">
            “Different scenes. Different stories. Same perspective.”
          </div>
          <div class="about-signature-row">
            <div>
              <div style="font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px;">Visual Artist</div>
              <div class="signature">Kartik Gupta</div>
            </div>
            <a class="cta" href="/about">Read monograph →</a>
          </div>
        </div>
      </section>

      <!-- Section 3: Featured Frames -->
      <section class="featured-section" id="featured">
        <div class="section-head">
          <div>
            <div class="kicker">02 / Selected Works</div>
            <h2 class="section-title">Featured <em>Frames</em></h2>
          </div>
          <p class="lead">
            Curated highlights from the archive. Each frame reflects an unstaged moment where light, subject, and atmosphere converged.
          </p>
        </div>

        <div class="featured-grid">
          <article class="featured-card hero-card" id="featured-master-card" data-lightbox="${featuredLead.id}">
            <div class="featured-media-box">
              <div class="featured-layer current">
                <img loading="lazy" src="${getWebpOrOrig(featuredLead)}" alt="${featuredLead.title}">
              </div>
              <div class="featured-layer next">
                <img alt="">
              </div>
            </div>
            <div class="view-badge">↗</div>
            <div class="featured-overlay">
              <span class="featured-tag" id="f-master-tag">Wildlife / Master Frame</span>
              <h3 id="f-master-title">${featuredLead.title}</h3>
              <div class="featured-meta" id="f-master-meta">${featuredLead.location} · ${featuredLead.date}</div>
            </div>
          </article>

          <div class="featured-stack">
            <article class="featured-card stack-card" data-lightbox="${featuredStack1.id}">
              <img loading="lazy" src="${getWebpOrOrig(featuredStack1)}" alt="${featuredStack1.title}">
              <div class="view-badge">↗</div>
              <div class="featured-overlay">
                <span class="featured-tag">Travel / Architecture</span>
                <h3>${featuredStack1.title}</h3>
                <div class="featured-meta">${featuredStack1.location}</div>
              </div>
            </article>

            <article class="featured-card stack-card" data-lightbox="${featuredStack2.id}">
              <img loading="lazy" src="${getWebpOrOrig(featuredStack2)}" alt="${featuredStack2.title}">
              <div class="view-badge">↗</div>
              <div class="featured-overlay">
                <span class="featured-tag">Street / Delhi NCR</span>
                <h3>${featuredStack2.title}</h3>
                <div class="featured-meta">${featuredStack2.location}</div>
              </div>
            </article>
          </div>
        </div>

        <!-- Secondary Triad Row -->
        <div class="featured-triad">
          <article class="triad-card" data-lightbox="${triad1.id}">
            <img loading="lazy" src="${getThumbOrOrig(triad1)}" alt="${triad1.title}">
            <div class="triad-overlay">
              <span class="featured-tag">Black & White</span>
              <h4>${triad1.title}</h4>
            </div>
          </article>
          <article class="triad-card" data-lightbox="${triad2.id}">
            <img loading="lazy" src="${getThumbOrOrig(triad2)}" alt="${triad2.title}">
            <div class="triad-overlay">
              <span class="featured-tag">Travel & Dusk</span>
              <h4>${triad2.title}</h4>
            </div>
          </article>
          <article class="triad-card" data-lightbox="${triad3.id}">
            <img loading="lazy" src="${getThumbOrOrig(triad3)}" alt="${triad3.title}">
            <div class="triad-overlay">
              <span class="featured-tag">Sky & Night</span>
              <h4>${triad3.title}</h4>
            </div>
          </article>
        </div>
      </section>

      <!-- Section 4: Explore My World (Archive Grid) -->
      <section class="world-section" id="world">
        <div class="section-head">
          <div>
            <div class="kicker">03 / The Archive</div>
            <h2 class="section-title">Explore my <em>world</em></h2>
          </div>
          <p class="lead">
            Six distinct visual directions spanning street life, avian patience, botanical quietude, and celestial darkness.
          </p>
        </div>

        <div class="world-grid">
          ${[
            ['street', 'IMG_20250917_183119.jpg', 'Street', 'Metropolitan Life'],
            ['wildlife', 'IMG_20260215_104412.jpg', 'Wildlife', 'Quiet Encounters'],
            ['nature', 'IMG_20250914_095233.jpg', 'Nature', 'Botanical Stillness'],
            ['travel', 'IMG_20260131_005619.jpg', 'Travel', 'Journeys & Citadels'],
            ['bw', 'IMG_20260405_150547.jpg', 'Black & White', 'Monochrome Study'],
            ['sky', 'IMG_20260503_013344.jpg', 'Sky & Night', 'Celestial Atmospheres'],
          ].map(([key, photoFilename, title, kicker]) => `
            <a class="world-card" href="/gallery/${key}" data-world-cat="${key}">
              <div class="world-media-box">
                <div class="world-layer current">
                  <img loading="lazy" src="/assets/optimized/web/${photoFilename.replace('.jpg', '.webp')}" alt="${title} category cover">
                </div>
                <div class="world-layer next">
                  <img alt="">
                </div>
              </div>
              <div class="world-label">
                <span class="world-kicker">${kicker}</span>
                <b>${title}</b>
                <span>View collection →</span>
              </div>
            </a>
          `).join('')}
        </div>
      </section>

      <!-- Section 5: Stories Preview -->
      <section class="stories-section" id="stories-preview">
        <div class="section-head">
          <div>
            <div class="kicker">04 / Photo Essays</div>
            <h2 class="section-title">Frames with a <em>story.</em></h2>
          </div>
          <p class="lead">
            Photographs bound together by place, light, mood, and time. Small visual essays capturing interconnected moments.
          </p>
        </div>

        <div class="stories-grid">
          ${STORIES.map(story => `
            <article class="story-card" onclick="window.router.navigate('/stories')">
              <div class="story-thumb">
                <img loading="lazy" src="${story.cover}" alt="${story.title}">
                <div class="story-badge">${story.location}</div>
              </div>
              <h3>${story.title}</h3>
              <p>${story.subtitle}</p>
              <div class="story-read">Explore essay →</div>
            </article>
          `).join('')}
        </div>
      </section>

      <!-- Section 6: Contact & Inquiries -->
      <section class="contact-section" id="contact">
        <div>
          <div class="kicker">05 / Inquiries & Collaboration</div>
          <h2 class="section-title">Let’s make something <em>visual.</em></h2>
          <p class="lead" style="margin-top: 18px;">
            Available for editorial assignments, architectural & travel documentation, bespoke portrait sessions, and archival print inquiries.
          </p>

          <div class="contact-list">
            <div class="contact-item">
              <span>Direct Email</span>
              <div>
                <a href="mailto:${SITE_INFO.email}"><strong>${SITE_INFO.email}</strong></a>
                <button type="button" onclick="window.copyEmail()" style="margin-left: 10px; font-size: 11px; color: var(--accent); text-transform: uppercase;">(Copy)</button>
              </div>
            </div>
            <div class="contact-item">
              <span>Instagram</span>
              <a href="${SITE_INFO.instagram}" target="_blank" rel="noopener noreferrer">
                <strong>${SITE_INFO.instagramHandle} ↗</strong>
              </a>
            </div>
            <div class="contact-item">
              <span>Pinterest</span>
              <a href="${SITE_INFO.pinterest}" target="_blank" rel="noopener noreferrer">
                <strong>${SITE_INFO.pinterestHandle} ↗</strong>
              </a>
            </div>
            <div class="contact-item">
              <span>Studio Bases</span>
              <strong>${SITE_INFO.location}</strong>
            </div>
          </div>
        </div>

        <form class="contact-form" onsubmit="window.handleContactSubmit(event)">
          <div class="form-field">
            <label for="name">Your Name</label>
            <input id="name" name="name" placeholder="E.g. Elena Rostova" required>
          </div>
          <div class="form-field">
            <label for="email">Your Email Address</label>
            <input id="email" name="email" type="email" placeholder="name@domain.com" required>
          </div>
          <div class="form-field">
            <label for="project_type">Inquiry Focus</label>
            <select id="project_type" name="project_type">
              <option value="Editorial Assignment">Editorial & Documentary Assignment</option>
              <option value="Travel / Architectural Project">Travel / Architectural Project</option>
              <option value="Archival Print Inquiry">Archival Fine Art Print</option>
              <option value="Creative Collaboration">Creative Collaboration / General</option>
            </select>
          </div>
          <div class="form-field">
            <label for="message">Project Description</label>
            <textarea id="message" name="message" placeholder="Outline your project scope, location, and dates..." required></textarea>
          </div>
          <button type="submit" class="submit-btn">Send inquiry →</button>
        </form>
      </section>
    </div>
  `;
}

// 2. Gallery Archive Page (supports /gallery and /gallery/:cat)
function renderGallery(catKey = 'all') {
  const activeKey = CATEGORIES[catKey] ? catKey : 'all';
  const categoryInfo = CATEGORIES[activeKey];

  const filteredPhotos = activeKey === 'all'
    ? PHOTOS
    : PHOTOS.filter(p => p.categories && p.categories.includes(activeKey));

  return `
    <div class="page gallery-page">
      <div class="page-hero">
        <div>
          <div class="kicker">Kartik Gupta / Portfolio Archive</div>
          <h1>${categoryInfo.name}</h1>
        </div>
        <div>
          <p>${categoryInfo.description}</p>
          <div style="font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); margin-top: 14px; font-weight: 600;">
            Showing ${filteredPhotos.length} Photographs in Collection
          </div>
        </div>
      </div>

      <!-- Category Filter Pills -->
      <nav class="filters-bar" aria-label="Gallery category filters">
        ${Object.keys(CATEGORIES).map(k => `
          <a class="filter-btn ${k === activeKey ? 'active' : ''}" href="/gallery${k === 'all' ? '' : '/' + k}">
            ${CATEGORIES[k].name}
          </a>
        `).join('')}
      </nav>

      <!-- Photos Grid -->
      <div class="gallery-grid" id="gallery-grid">
        ${filteredPhotos.map((photo, i) => {
          const isWide = photo.orientation === 'landscape' && (i % 3 === 0);
          return `
            <article class="gallery-item ${isWide ? 'wide' : 'vertical'}" data-lightbox="${photo.id}">
              <img loading="lazy" src="${getThumbOrOrig(photo)}" alt="${photo.title} by Kartik Gupta">
              <div class="gallery-caption">
                <div>
                  <div class="gallery-caption-title">${photo.title}</div>
                  <div class="gallery-caption-sub">${photo.location} · ${photo.date}</div>
                </div>
                <div class="gallery-index">${String(i + 1).padStart(2, '0')}</div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// 3. Stories Page
function renderStories() {
  return `
    <div class="page stories-page">
      <div class="page-hero">
        <div>
          <div class="kicker">Visual Narratives · Photo Essays</div>
          <h1>Stories</h1>
        </div>
        <p>
          Photography is an act of prolonged attention. These thematic essays weave isolated moments into broader narratives of light, heritage, and coexistence.
        </p>
      </div>

      <div class="stories-page-grid">
        ${STORIES.map(story => {
          const storyPhotos = PHOTOS.filter(p => story.photoIds.includes(p.id));
          return `
            <article class="story-feature">
              <div class="story-feature-cover" data-lightbox="${storyPhotos[0] ? storyPhotos[0].id : ''}">
                <img loading="lazy" src="${story.cover}" alt="${story.title}">
                <div class="view-badge">↗</div>
              </div>
              <div class="story-feature-content">
                <div class="kicker">${story.kicker} · ${story.location}</div>
                <h2>${story.title}</h2>
                <div style="font-size: 13px; color: var(--text); font-weight: 500; margin-bottom: 14px;">${story.subtitle}</div>
                <p>${story.description}</p>

                <div style="font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px;">
                  Frames in Essay (${storyPhotos.length})
                </div>
                <div class="story-thumbnails-mini">
                  ${storyPhotos.map(p => `
                    <div class="story-thumb-mini" data-lightbox="${p.id}" title="${p.title}">
                      <img loading="lazy" src="${getThumbOrOrig(p)}" alt="${p.title}">
                    </div>
                  `).join('')}
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// 4. About Page
function renderAbout() {
  return `
    <div class="page about-page">
      <section class="about" style="border: none; padding-top: 20px;">
        <div class="about-photo">
          <picture>
            <source srcset="/assets/optimized/web/kartik-camera.webp" type="image/webp">
            <img src="/assets/kartik-camera.png" alt="Kartik Gupta with Canon camera">
          </picture>
          <div class="about-photo-badge">KARTIK GUPTA / PHOTOGRAPHER</div>
        </div>
        <div class="about-copy">
          <div class="kicker">Monograph · Perspective</div>
          <h1 class="section-title">Seeing the world <em>differently.</em></h1>
          ${ABOUT_CONTENT.paragraphs.map(p => `<p>${p}</p>`).join('')}

          <div class="about-quote">
            “${ABOUT_CONTENT.quote}”
          </div>
          <p style="font-size: 14px; font-style: italic; color: var(--muted); margin-top: -10px;">
            ${ABOUT_CONTENT.subquote}
          </p>

          <div class="about-signature-row">
            <div>
              <div style="font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px;">Photographer & Creator</div>
              <div class="signature">Kartik Gupta</div>
            </div>
            <a class="cta" href="/contact">Get in touch →</a>
          </div>
        </div>
      </section>

      <!-- Artistic Pillars -->
      <section style="padding-top: 0;">
        <div class="about-pillars">
          ${ABOUT_CONTENT.pillars.map(pillar => `
            <div class="pillar-card">
              <h3>${pillar.title}</h3>
              <p>${pillar.desc}</p>
            </div>
          `).join('')}
        </div>

        <!-- Specifications & Archive Notes -->
        <div class="about-specs">
          ${ABOUT_CONTENT.specs.map(spec => `
            <div class="spec-item">
              <small>${spec.label}</small>
              <strong>${spec.value}</strong>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;
}

// 5. Contact Page
function renderContact() {
  return `
    <div class="page contact-page">
      <div class="page-hero">
        <div>
          <div class="kicker">Direct Commissions & Inquiries</div>
          <h1>Let’s connect.</h1>
        </div>
        <p>
          Whether seeking an editorial collaborator, licensing archival imagery, or commissioning custom architectural & travel photography, send a note below.
        </p>
      </div>

      <section class="contact-section" style="border: none; padding-top: 20px;">
        <div>
          <h2 class="section-title" style="font-size: clamp(34px, 4vw, 56px);">Direct <em>Channels</em></h2>
          <p class="lead" style="margin-top: 14px;">
            Inquiries are typically reviewed within 24 to 48 hours. Direct email is always preferred for formal project briefs.
          </p>

          <div class="contact-list">
            <div class="contact-item">
              <span>Direct Email</span>
              <div>
                <a href="mailto:${SITE_INFO.email}"><strong>${SITE_INFO.email}</strong></a>
                <button type="button" onclick="window.copyEmail()" style="margin-left: 10px; font-size: 11px; color: var(--accent); text-transform: uppercase;">(Copy)</button>
              </div>
            </div>
            <div class="contact-item">
              <span>Instagram</span>
              <a href="${SITE_INFO.instagram}" target="_blank" rel="noopener noreferrer">
                <strong>${SITE_INFO.instagramHandle} ↗</strong>
              </a>
            </div>
            <div class="contact-item">
              <span>Pinterest Archive</span>
              <a href="${SITE_INFO.pinterest}" target="_blank" rel="noopener noreferrer">
                <strong>${SITE_INFO.pinterestHandle} ↗</strong>
              </a>
            </div>
            <div class="contact-item">
              <span>Locations</span>
              <strong>Delhi NCR · Silvassa, India</strong>
            </div>
          </div>
        </div>

        <form class="contact-form" onsubmit="window.handleContactSubmit(event)">
          <div class="form-field">
            <label for="c-name">Your Full Name</label>
            <input id="c-name" name="name" placeholder="Your name" required>
          </div>
          <div class="form-field">
            <label for="c-email">Your Email Address</label>
            <input id="c-email" name="email" type="email" placeholder="your.name@domain.com" required>
          </div>
          <div class="form-field">
            <label for="c-type">Project Classification</label>
            <select id="c-type" name="project_type">
              <option value="Editorial & Commercial">Editorial & Commercial Project</option>
              <option value="Travel & Landscape Assignment">Travel & Landscape Assignment</option>
              <option value="Fine Art Print Inquiry">Fine Art Print Inquiry</option>
              <option value="General Conversation">General Conversation / Press</option>
            </select>
          </div>
          <div class="form-field">
            <label for="c-message">Brief or Message</label>
            <textarea id="c-message" name="message" placeholder="Details about timeline, locations, deliverables, and vision..." required></textarea>
          </div>
          <button type="submit" class="submit-btn">Send message →</button>
        </form>
      </section>
    </div>
  `;
}

// --- Dynamic Photography Rotation System ---
const dynamicSystem = {
  heroTimer: null,
  worldTimer: null,
  featuredTimer: null,
  isPaused: false,
  heroActiveFrame: 1, // Start on Frame 03 Travel (matching reference 03 / 06)
  heroFramesCount: 5,
  frameNumbers: ['05', '03', '02', '04', '06'],
  worldCategories: ['street', 'wildlife', 'nature', 'travel', 'bw', 'sky'],
  worldActiveIndex: 0,
  featuredCuratedIds: [
    'azure-perch',
    'ramparts-of-the-sun',
    'golden-hour-transit',
    'connaught-pillars-1',
    'foliage-perch'
  ],
  featuredCurrentIndex: 0,

  teardown() {
    if (this.heroTimer) { clearInterval(this.heroTimer); this.heroTimer = null; }
    if (this.worldTimer) { clearInterval(this.worldTimer); this.worldTimer = null; }
    if (this.featuredTimer) { clearInterval(this.featuredTimer); this.featuredTimer = null; }
    this.isPaused = false;
  },

  init(container = document) {
    this.teardown();
    const heroEl = container.querySelector('#hero');
    if (!heroEl) return;

    // Register active initial photo IDs in queue manager
    for (let i = 0; i < this.heroFramesCount; i++) {
      const frameEl = container.querySelector(`#hf-${i}`);
      if (frameEl && frameEl.dataset.photoId) {
        queueManager.registerActive(frameEl.dataset.photoId);
      }
    }

    this.bindHeroEvents(container);
    this.bindWorldEvents(container);
    this.bindFeaturedEvents(container);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    // Auto-Rotation for Hero (every 5.8s, rotating through frames)
    this.heroTimer = setInterval(() => {
      if (this.isPaused) return;
      this.rotateHeroNext();
    }, 5800);

    // Staggered Auto-Rotation for World cards (every 7.2s, rotating one card)
    this.worldTimer = setInterval(() => {
      if (this.isPaused) return;
      this.rotateWorldNext();
    }, 7200);

    // Staggered Auto-Rotation for Featured master frame (every 11.5s)
    this.featuredTimer = setInterval(() => {
      if (this.isPaused) return;
      this.rotateFeaturedMaster();
    }, 11500);
  },

  bindHeroEvents(container) {
    const prevBtn = container.querySelector('#hero-prev');
    const nextBtn = container.querySelector('#hero-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.rotateHeroPrev();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.rotateHeroNext();
      });
    }

    const filmstripThumbs = container.querySelectorAll('.filmstrip-thumb');
    filmstripThumbs.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetIdx = parseInt(btn.dataset.targetFrame, 10);
        if (!isNaN(targetIdx)) {
          this.setActiveHeroFrame(targetIdx);
          this.triggerFrameCrossfade(targetIdx);
        }
      });
    });

    const frames = container.querySelectorAll('.hero-film-frame');
    frames.forEach(frame => {
      frame.addEventListener('click', (e) => {
        const photoId = frame.dataset.photoId;
        const category = frame.dataset.category;
        if (photoId) {
          const catPool = CATEGORY_POOLS[category] || PHOTOS;
          openLightbox(photoId, catPool);
        }
      });
    });
  },

  bindWorldEvents(container) {
    const worldCards = container.querySelectorAll('.world-card');
    worldCards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        this.isPaused = true;
      });
      card.addEventListener('mouseleave', () => {
        this.isPaused = false;
      });
    });
  },

  bindFeaturedEvents(container) {
    const masterCard = container.querySelector('#featured-master-card');
    if (masterCard) {
      masterCard.addEventListener('mouseenter', () => {
        this.isPaused = true;
      });
      masterCard.addEventListener('mouseleave', () => {
        this.isPaused = false;
      });
    }
  },

  setActiveHeroFrame(idx) {
    this.heroActiveFrame = idx;
    const numEl = document.getElementById('hero-counter-num');
    if (numEl) numEl.textContent = this.frameNumbers[idx] || String(idx + 1).padStart(2, '0');

    document.querySelectorAll('.filmstrip-thumb').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === idx);
    });
  },

  rotateHeroNext() {
    const nextIdx = (this.heroActiveFrame + 1) % this.heroFramesCount;
    this.setActiveHeroFrame(nextIdx);
    this.triggerFrameCrossfade(nextIdx);
  },

  rotateHeroPrev() {
    const prevIdx = (this.heroActiveFrame - 1 + this.heroFramesCount) % this.heroFramesCount;
    this.setActiveHeroFrame(prevIdx);
    this.triggerFrameCrossfade(prevIdx);
  },

  async triggerFrameCrossfade(frameIndex) {
    const frameEl = document.getElementById(`hf-${frameIndex}`);
    if (!frameEl) return;
    if (frameEl.classList.contains('is-crossfading')) return;

    const category = frameEl.dataset.category;
    const currentId = frameEl.dataset.photoId;

    // Collect all other active frame IDs on screen to avoid duplicates
    const onScreenIds = [];
    document.querySelectorAll('.hero-film-frame').forEach(f => {
      if (f !== frameEl && f.dataset.photoId) onScreenIds.push(f.dataset.photoId);
    });

    const nextPhoto = queueManager.getNextPhoto(category, currentId, onScreenIds);
    if (!nextPhoto || nextPhoto.id === currentId) return;

    const imgUrl = getWebpOrOrig(nextPhoto);
    await queueManager.preloadImage(imgUrl);

    queueManager.unregisterActive(currentId);
    queueManager.registerActive(nextPhoto.id);

    const nextLayer = frameEl.querySelector('.ff-layer.next img');
    const currentLayer = frameEl.querySelector('.ff-layer.current img');
    const titleEl = frameEl.querySelector('.ff-title');
    const locEl = frameEl.querySelector('.ff-location');

    if (nextLayer) {
      nextLayer.src = imgUrl;
      nextLayer.alt = nextPhoto.title;
    }

    frameEl.classList.add('is-crossfading');

    setTimeout(() => {
      if (currentLayer && nextLayer) {
        currentLayer.src = imgUrl;
        currentLayer.alt = nextPhoto.title;
      }
      if (titleEl) titleEl.textContent = nextPhoto.title;
      if (locEl) locEl.textContent = nextPhoto.location;
      frameEl.dataset.photoId = nextPhoto.id;
      frameEl.title = `Click to view full photo: ${nextPhoto.title}`;

      frameEl.classList.remove('is-crossfading');

      // Update matching thumbnail in filmstrip
      const thumbBtn = document.querySelector(`.filmstrip-thumb[data-target-frame="${frameIndex}"]`);
      if (thumbBtn) {
        const thumbImg = thumbBtn.querySelector('img');
        if (thumbImg) thumbImg.src = getThumbOrOrig(nextPhoto);
        thumbBtn.setAttribute('aria-label', `Frame 0${frameIndex + 1}: ${nextPhoto.title}`);
      }
    }, 1200);
  },

  async rotateWorldNext() {
    const cat = this.worldCategories[this.worldActiveIndex];
    this.worldActiveIndex = (this.worldActiveIndex + 1) % this.worldCategories.length;

    const card = document.querySelector(`.world-card[data-world-cat="${cat}"]`);
    if (!card) return;
    if (card.classList.contains('is-crossfading')) return;

    const currentId = card.dataset.photoId || '';
    const nextPhoto = queueManager.getNextPhoto(cat, currentId);
    if (!nextPhoto || nextPhoto.id === currentId) return;

    const imgUrl = getWebpOrOrig(nextPhoto);
    await queueManager.preloadImage(imgUrl);

    const nextLayer = card.querySelector('.world-layer.next img');
    const currentLayer = card.querySelector('.world-layer.current img');

    if (nextLayer) {
      nextLayer.src = imgUrl;
      nextLayer.alt = `${nextPhoto.title} category cover`;
    }

    card.classList.add('is-crossfading');

    setTimeout(() => {
      if (currentLayer && nextLayer) {
        currentLayer.src = imgUrl;
        currentLayer.alt = `${nextPhoto.title} category cover`;
      }
      card.dataset.photoId = nextPhoto.id;
      card.classList.remove('is-crossfading');
    }, 1200);
  },

  async rotateFeaturedMaster() {
    const card = document.getElementById('featured-master-card');
    if (!card) return;
    if (card.classList.contains('is-crossfading')) return;

    this.featuredCurrentIndex = (this.featuredCurrentIndex + 1) % this.featuredCuratedIds.length;
    const nextId = this.featuredCuratedIds[this.featuredCurrentIndex];
    const nextPhoto = PHOTOS.find(p => p.id === nextId);
    if (!nextPhoto) return;

    const imgUrl = getWebpOrOrig(nextPhoto);
    await queueManager.preloadImage(imgUrl);

    const nextLayer = card.querySelector('.featured-layer.next img');
    const currentLayer = card.querySelector('.featured-layer.current img');
    const titleEl = document.getElementById('f-master-title');
    const metaEl = document.getElementById('f-master-meta');
    const tagEl = document.getElementById('f-master-tag');

    if (nextLayer) {
      nextLayer.src = imgUrl;
      nextLayer.alt = nextPhoto.title;
    }

    card.classList.add('is-crossfading');

    setTimeout(() => {
      if (currentLayer && nextLayer) {
        currentLayer.src = imgUrl;
        currentLayer.alt = nextPhoto.title;
      }
      if (titleEl) titleEl.textContent = nextPhoto.title;
      if (metaEl) metaEl.textContent = `${nextPhoto.location} · ${nextPhoto.date}`;
      if (tagEl) tagEl.textContent = `${nextPhoto.category.toUpperCase()} / Curated Master`;
      card.dataset.lightbox = nextPhoto.id;
      card.classList.remove('is-crossfading');
    }, 1200);
  }
};

// --- Client-Side Router ---
class Router {
  constructor() {
    this.routes = [
      { pattern: /^\/?$/, view: () => renderHome(), navKey: 'home' },
      { pattern: /^\/gallery\/?$/, view: () => renderGallery('all'), navKey: 'gallery' },
      { pattern: /^\/gallery\/([a-zA-Z0-9_-]+)\/?$/, view: (match) => renderGallery(match[1]), navKey: 'gallery' },
      { pattern: /^\/stories\/?$/, view: () => renderStories(), navKey: 'stories' },
      { pattern: /^\/about\/?$/, view: () => renderAbout(), navKey: 'about' },
      { pattern: /^\/contact\/?$/, view: () => renderContact(), navKey: 'contact' },
    ];

    window.addEventListener('popstate', () => this.handleRoute());
    document.addEventListener('click', (e) => this.handleLinkClick(e));
  }

  handleLinkClick(e) {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // External or special links
    if (
      link.target === '_blank' ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('http://') ||
      href.startsWith('https://')
    ) {
      return;
    }

    // Anchor hash link on same page
    if (href.startsWith('#')) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Internal router path
    e.preventDefault();
    this.navigate(href);
  }

  navigate(url) {
    history.pushState(null, '', url);
    this.handleRoute();
  }

  handleRoute() {
    dynamicSystem.teardown();

    const pathname = window.location.pathname;
    let matched = null;
    let activeNavKey = 'home';

    for (const route of this.routes) {
      const match = pathname.match(route.pattern);
      if (match) {
        matched = route.view(match);
        activeNavKey = route.navKey;
        break;
      }
    }

    if (!matched) {
      matched = renderHome();
      activeNavKey = 'home';
    }

    app.innerHTML = matched;
    this.updateActiveNav(activeNavKey, pathname);

    // Scroll to top or anchor
    if (window.location.hash) {
      const anchor = document.querySelector(window.location.hash);
      if (anchor) {
        setTimeout(() => anchor.scrollIntoView({ behavior: 'smooth' }), 50);
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Attach lightbox triggers to newly rendered DOM
    this.attachLightboxTriggers();

    // Start dynamic photography system if on home page
    if (activeNavKey === 'home') {
      dynamicSystem.init(app);
    }
  }

  updateActiveNav(navKey, pathname) {
    document.querySelectorAll('[data-nav]').forEach(el => {
      const key = el.dataset.nav;
      const isActive = key === navKey;
      el.classList.toggle('active', isActive);
      if (isActive) {
        el.setAttribute('aria-current', 'page');
      } else {
        el.removeAttribute('aria-current');
      }
    });
  }

  attachLightboxTriggers() {
    document.querySelectorAll('[data-lightbox]').forEach(el => {
      el.addEventListener('click', (e) => {
        // Avoid clicking sub-links
        if (e.target.closest('a') && !e.target.closest('[data-lightbox]')) return;
        const photoId = el.dataset.lightbox;
        if (!photoId) return;

        // If in a filtered gallery view, pass the filtered list
        const isGallery = window.location.pathname.startsWith('/gallery');
        if (isGallery) {
          const cat = window.location.pathname.split('/')[2] || 'all';
          const filtered = cat === 'all'
            ? PHOTOS
            : PHOTOS.filter(p => p.categories && p.categories.includes(cat));
          openLightbox(photoId, filtered);
        } else {
          openLightbox(photoId);
        }
      });
    });
  }
}

// --- Scroll Effects & Sticky Nav ---
function initScrollEffects() {
  window.addEventListener('scroll', () => {
    if (nav) {
      nav.classList.toggle('scrolled', window.scrollY > 25);
    }
  }, { passive: true });
}

// --- Application Bootstrapping ---
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initCustomCursor();
  initMobileMenu();
  initLightboxEvents();
  initScrollEffects();

  window.router = new Router();
  window.router.handleRoute();
});
