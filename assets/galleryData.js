/**
 * THE KARTIK CLICKS — Photo & Archive Data Store
 * Centralized metadata configuration for photographer Kartik Gupta.
 *
 * NOTE: The PHOTOS array and CATEGORY_POOLS are now dynamically driven by the
 * automated discovery system via ./galleryManifest.js.
 * To add new photos, simply drop them into the appropriate category folder
 * (assets/photos/<category>/) on GitHub or configure gallery-config.json.
 */

import {
  MANIFEST_PHOTOS,
  MANIFEST_CONFIG,
  MANIFEST_CATEGORY_POOLS,
} from './galleryManifest.js';

export const SITE_INFO = {
  brand: "THE KARTIK CLICKS",
  brandShort: "TKC",
  websiteName: "Kartikclicks",
  photographer: "Kartik Gupta",
  location: "Delhi NCR · Silvassa, India",
  tagline: "Capturing moments, telling stories.",
  email: "kartikrngupta180@gmail.com",
  instagram: "https://www.instagram.com/the_kartik_clicks/",
  instagramHandle: "@the_kartik_clicks",
  pinterest: "https://pin.it/5T232Zggp",
  pinterestHandle: "kartikrngupta180",
  bioShort: "Photographer observing light, stillness, urban rhythms, and the living world across Delhi NCR and Silvassa.",
};

export const CATEGORIES = {
  all: {
    id: "all",
    name: "All Works",
    kicker: "Complete Archive",
    subtitle: "The complete visual collection",
    description: "Every frame from the archive — encompassing wildlife, street observations, architectural forms, and changing skies.",
  },
  street: {
    id: "street",
    name: "Street",
    kicker: "Metropolitan Life",
    subtitle: "Unfiltered urban rhythms & timeless architecture",
    description: "Candid moments, historic colonnades, and twilight transit across the historic streets of Delhi NCR.",
    cover: "IMG_20250917_183119.jpg",
  },
  wildlife: {
    id: "wildlife",
    name: "Wildlife",
    kicker: "Quiet Encounters",
    subtitle: "Avian life, fauna & silent glances",
    description: "Intimate studies of wildlife and urban fauna in Delhi and Silvassa, captured with patience and natural daylight.",
    cover: "IMG_20260215_104412.jpg",
  },
  nature: {
    id: "nature",
    name: "Nature",
    kicker: "Botanical Stillness",
    subtitle: "Organic forms, morning dew & wild foliage",
    description: "Botanical studies examining delicate petals, dewdrops, and fruit clusters bathed in morning sunlight.",
    cover: "IMG_20250914_095233.jpg",
  },
  travel: {
    id: "travel",
    name: "Travel",
    kicker: "Journeys & Citadels",
    subtitle: "Heritage ramparts, distant horizons & sacred sites",
    description: "Visual chronicles from the road — from the hilltops of Jaipur to ancient temples and broad expressways.",
    cover: "IMG_20260131_005619.jpg",
  },
  bw: {
    id: "bw",
    name: "Black & White",
    kicker: "Monochrome Study",
    subtitle: "Light, shadow, texture & architectural geometry",
    description: "Moments stripped of color to accentuate architectural lines, human silhouettes, and deep spatial contrast.",
    cover: "IMG_20260405_150547.jpg",
  },
  sky: {
    id: "sky",
    name: "Sky & Night",
    kicker: "Celestial Atmospheres",
    subtitle: "Moonlit horizons, storm clouds & twilight hues",
    description: "Nocturnal and atmospheric studies focusing on lunar phases, sweeping cirrus formations, and quiet skies.",
    cover: "IMG_20260503_013344.jpg",
  },
};

// Central Photo Collection & Configuration from Automatic Discovery Manifest
export const FEATURED_CONFIG = MANIFEST_CONFIG;
export const PHOTOS = MANIFEST_PHOTOS;
export const CATEGORY_POOLS = MANIFEST_CATEGORY_POOLS;

export const STORIES = [
  {
    id: "monochrome-metropolis",
    title: "Monochrome Metropolis",
    kicker: "Visual Essay · 01",
    subtitle: "Echoes of Delhi's classical colonnades and subterranean heritage",
    description: "Stripping the chaotic urban fabric down to light, shadow, and architectural mass. From the British neoclassical arches of Connaught Place to the haunting medieval depth of Agrasen ki Baoli, this series studies how human life flows across monumental stone.",
    location: "New Delhi",
    date: "April 2026",
    cover: "/assets/photos/web/IMG_20260405_150547.webp",
    photoIds: ["connaught-pillars-1", "connaught-pillars-2", "agrasen-ki-baoli"],
  },
  {
    id: "citadels-and-dusk",
    title: "Citadels & Dusk",
    kicker: "Visual Essay · 02",
    subtitle: "Ramparts, sacred silhouettes and the fading embers of daylight",
    description: "As dusk descends across North India, stone turns to gold and the sky takes on shades of lilac and flame. This series captures the historic walls of Nahargarh Fort suspended over Jaipur and the towering gopuram of Delhi temples rising into twilight silence.",
    location: "Jaipur & New Delhi",
    date: "September 2025 – January 2026",
    cover: "/assets/photos/web/IMG_20260131_005619.webp",
    photoIds: ["ramparts-of-the-sun", "dusk-over-gopuram"],
  },
  {
    id: "quiet-encounters",
    title: "Quiet Encounters",
    kicker: "Visual Essay · 03",
    subtitle: "Intimate pauses and observing living beings in their habitat",
    description: "Wildlife photography requires stepping out of the human tempo. Whether waiting beside an alert squirrel poised on high branches or locking gazes with a resting street companion, each frame is an exercise in stillness, respect, and patience.",
    location: "Silvassa & Delhi NCR",
    date: "2025 – 2026",
    cover: "/assets/photos/web/IMG_20260215_104412.webp",
    photoIds: ["azure-perch", "patience-in-the-dust", "inquisitive-babbler", "solitary-dove"],
  },
  {
    id: "nocturne-and-skies",
    title: "Nocturne & Skies",
    kicker: "Visual Essay · 04",
    subtitle: "Lunar craters, veiled horizons and the celestial dark",
    description: "The celestial realm offers a perspective on scale and mystery. Focusing telephoto optics into the night reveals the stark geological craters of the waxing moon and the dramatic diffusion of light through fast-moving monsoon cloud layers.",
    location: "Delhi NCR & Silvassa",
    date: "October 2025 – May 2026",
    cover: "/assets/photos/web/IMG_20260503_013344.webp",
    photoIds: ["lunar-veil", "waxing-gibbous"],
  },
];

export const ABOUT_CONTENT = {
  quote: "Different scenes. Different stories. Same perspective.",
  subquote: "The frame changes when you slow down enough to notice it.",
  paragraphs: [
    "Kartik Gupta is an Indian visual artist and photographer working between the historic capital of Delhi NCR and the lush natural landscapes of Silvassa. His photographic approach is rooted in deliberate observation—finding poetry in the ordinary, patience in the presence of wildlife, and structure in urban chaos.",
    "Without staging or intrusive interference, Kartik's work spans wildlife, candid street scenes, botanical stillness, and expansive skies. Each frame is treated not merely as a recorded record, but as an atmospheric narrative shaped by natural daylight, authentic texture, and emotional resonance.",
    "Whether capturing the century-old arches of Connaught Place, waiting quietly for avian movement among sunlit branches, or framing the sun sinking behind desert citadels, his portfolio represents an evolving archive of moments that ask the viewer to pause and look closer.",
  ],
  pillars: [
    { title: "Street & Architecture", desc: "Documenting cultural rhythm, human movement, and monumental spaces without disruption." },
    { title: "Wildlife & Avian", desc: "Grounded in silence and patience, honoring the innate dignity of animal subjects." },
    { title: "Atmosphere & Light", desc: "Chasing twilight gradients, golden transitions, and celestial chiaroscuro in night skies." },
  ],
  specs: [
    { label: "Based in", value: "Delhi NCR · Silvassa, India" },
    { label: "Primary Focus", value: "Wildlife, Street, Nature, Travel, Monochrome" },
    { label: "Approach", value: "Natural Light, Unstaged, Narrative-Driven" },
    { label: "Archive Began", value: "2023 – Present" },
  ],
};
