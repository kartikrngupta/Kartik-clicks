/**
 * THE KARTIK CLICKS — Automated Photo Discovery & Gallery Manifest Generator
 * Scans category folders during build, merges custom metadata,
 * deduplicates entries, and outputs assets/galleryManifest.js.
 *
 * Runs automatically during:
 *   - npm run build (Vercel deployment)
 *   - npm start     (Local development)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PHOTOS_DIR = path.join(rootDir, 'assets', 'photos');
const CONFIG_PATH = path.join(rootDir, 'gallery-config.json');
const MANIFEST_JS_PATH = path.join(rootDir, 'assets', 'galleryManifest.js');
const MANIFEST_JSON_PATH = path.join(rootDir, 'assets', 'galleryManifest.json');

// Supported image extensions
const VALID_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Category folder mapping to system category IDs
const CATEGORY_MAP = {
  'wildlife': { id: 'wildlife', name: 'Wildlife' },
  'nature': { id: 'nature', name: 'Nature' },
  'street': { id: 'street', name: 'Street' },
  'travel': { id: 'travel', name: 'Travel' },
  'black-white': { id: 'bw', name: 'Black & White' },
  'bw': { id: 'bw', name: 'Black & White' },
  'sky-night': { id: 'sky', name: 'Sky & Night' },
  'sky': { id: 'sky', name: 'Sky & Night' },
};

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

function titleFromFilename(filename) {
  const nameWithoutExt = path.parse(filename).name;
  // If filename looks like IMG_2026... format, return date-aware title
  if (/^IMG_\d{8}_\d{6}$/i.test(nameWithoutExt)) {
    const parts = nameWithoutExt.split('_');
    const dateStr = parts[1]; // YYYYMMDD
    return `Frame ${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
  }
  // Otherwise convert "tiger-in-mist" or "tiger_in_mist" to "Tiger In Mist"
  return nameWithoutExt
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(dateObj) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
}

export function buildGallery() {
  console.log('⚡ [TKC Gallery Discovery] Starting scan of assets/photos...');

  // 1. Read gallery-config.json
  let config = { featured: [], photos: {} };
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch (err) {
      console.warn('⚠️ Could not parse gallery-config.json, using defaults:', err.message);
    }
  }

  const featuredIds = new Set(config.featured || []);
  const customMetadata = config.photos || {};

  const photosById = new Map();
  const photosByFilename = new Map();

  // Helper to add or update photo record
  function registerPhoto(photo) {
    if (photosByFilename.has(photo.filename)) {
      // Merge: custom metadata overrides auto-generated
      const existing = photosByFilename.get(photo.filename);
      Object.assign(existing, photo);
      return;
    }
    photosById.set(photo.id, photo);
    photosByFilename.set(photo.filename, photo);
  }

  // 2. Register Baseline Configured Photos from gallery-config.json
  for (const [filename, meta] of Object.entries(customMetadata)) {
    const baseName = path.parse(filename).name;
    const photoId = meta.id || slugify(meta.title || baseName);
    const category = meta.category || 'street';

    // Verify paths: prefer existing web/originals if present
    const webPath = fs.existsSync(path.join(PHOTOS_DIR, 'web', `${baseName}.webp`))
      ? `/assets/photos/web/${baseName}.webp`
      : `/assets/photos/originals/${filename}`;

    const thumbPath = fs.existsSync(path.join(PHOTOS_DIR, 'thumb', `${baseName}.webp`))
      ? `/assets/photos/thumb/${baseName}.webp`
      : webPath;

    const origPath = fs.existsSync(path.join(PHOTOS_DIR, 'originals', filename))
      ? `/assets/photos/originals/${filename}`
      : webPath;

    const isFeatured = meta.featured !== undefined ? meta.featured : featuredIds.has(photoId);

    registerPhoto({
      id: photoId,
      filename,
      web: webPath,
      thumb: thumbPath,
      original: origPath,
      title: meta.title || titleFromFilename(filename),
      category: category,
      categories: meta.categories || [category],
      location: meta.location || 'Silvassa · Delhi NCR, India',
      date: meta.date || '2026',
      orientation: meta.orientation || 'landscape',
      aspectRatio: meta.aspectRatio || (meta.orientation === 'portrait' ? '3/4' : '4/3'),
      storyId: meta.storyId || null,
      featured: isFeatured,
      hero: meta.hero !== undefined ? meta.hero : true,
      caption: meta.caption || `Photograph captured by Kartik Gupta.`,
      order: meta.order || 999,
    });
  }

  // 3. Scan the 6 Category Folders for Newly Uploaded Photos
  const categoryFolders = ['wildlife', 'nature', 'street', 'travel', 'black-white', 'sky-night'];

  for (const folderName of categoryFolders) {
    const folderPath = path.join(PHOTOS_DIR, folderName);
    if (!fs.existsSync(folderPath)) continue;

    const catInfo = CATEGORY_MAP[folderName] || { id: folderName, name: folderName };
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      if (file.startsWith('.')) continue; // ignore .gitkeep, .DS_Store
      const ext = path.extname(file).toLowerCase();
      if (!VALID_EXTS.has(ext)) continue;

      const baseName = path.parse(file).name;
      const photoId = slugify(baseName);
      const relativeUrl = `/assets/photos/${folderName}/${file}`;

      // Check if already registered
      if (photosByFilename.has(file)) {
        continue;
      }

      // Check stats for file date
      let fileDate = '2026';
      try {
        const stats = fs.statSync(path.join(folderPath, file));
        fileDate = formatDate(stats.mtime);
      } catch (e) {
        // keep default
      }

      const meta = customMetadata[file] || {};
      const title = meta.title || titleFromFilename(file);
      const category = meta.category || catInfo.id;
      const isFeatured = meta.featured !== undefined ? meta.featured : featuredIds.has(photoId);

      registerPhoto({
        id: meta.id || photoId,
        filename: file,
        web: relativeUrl,
        thumb: relativeUrl,
        original: relativeUrl,
        title: title,
        category: category,
        categories: meta.categories || [category],
        location: meta.location || 'Delhi NCR · Silvassa, India',
        date: meta.date || fileDate,
        orientation: meta.orientation || 'landscape',
        aspectRatio: meta.aspectRatio || '4/3',
        storyId: meta.storyId || null,
        featured: isFeatured,
        hero: meta.hero !== undefined ? meta.hero : true,
        caption: meta.caption || `Curated in the ${catInfo.name} photography archive.`,
        order: meta.order || 1000,
      });

      console.log(`  ✓ Discovered new photograph: [${catInfo.name}] ${file} -> "${title}"`);
    }
  }

  // 4. Sort Photos by Order, then Title
  const photoList = Array.from(photosById.values()).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });

  // 5. Pre-Compute Category Pools
  const categoryPools = {
    street: photoList.filter(p => p.categories && p.categories.includes('street')),
    wildlife: photoList.filter(p => p.categories && p.categories.includes('wildlife')),
    nature: photoList.filter(p => p.categories && p.categories.includes('nature')),
    travel: photoList.filter(p => p.categories && p.categories.includes('travel')),
    bw: photoList.filter(p => p.categories && p.categories.includes('bw')),
    sky: photoList.filter(p => p.categories && p.categories.includes('sky')),
  };

  // Hero pools: only photos eligible for hero
  const heroPools = {
    street: categoryPools.street.filter(p => p.hero !== false),
    wildlife: categoryPools.wildlife.filter(p => p.hero !== false),
    nature: categoryPools.nature.filter(p => p.hero !== false),
    travel: categoryPools.travel.filter(p => p.hero !== false),
    bw: categoryPools.bw.filter(p => p.hero !== false),
    sky: categoryPools.sky.filter(p => p.hero !== false),
  };

  // 6. Write galleryManifest.js
  const manifestJs = `/**
 * AUTO-GENERATED MANIFEST — DO NOT EDIT MANUALLY
 * Generated by scripts/build-gallery.js at ${new Date().toISOString()}
 * Total Photos: ${photoList.length}
 */

export const MANIFEST_CONFIG = ${JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      totalPhotos: photoList.length,
      featured: Array.from(featuredIds),
    },
    null,
    2
  )};

export const MANIFEST_PHOTOS = ${JSON.stringify(photoList, null, 2)};

export const MANIFEST_CATEGORY_POOLS = {
  street: MANIFEST_PHOTOS.filter(p => p.categories && p.categories.includes('street')),
  wildlife: MANIFEST_PHOTOS.filter(p => p.categories && p.categories.includes('wildlife')),
  nature: MANIFEST_PHOTOS.filter(p => p.categories && p.categories.includes('nature')),
  travel: MANIFEST_PHOTOS.filter(p => p.categories && p.categories.includes('travel')),
  bw: MANIFEST_PHOTOS.filter(p => p.categories && p.categories.includes('bw')),
  sky: MANIFEST_PHOTOS.filter(p => p.categories && p.categories.includes('sky')),
};

export const MANIFEST_HERO_POOLS = {
  street: MANIFEST_CATEGORY_POOLS.street.filter(p => p.hero !== false),
  wildlife: MANIFEST_CATEGORY_POOLS.wildlife.filter(p => p.hero !== false),
  nature: MANIFEST_CATEGORY_POOLS.nature.filter(p => p.hero !== false),
  travel: MANIFEST_CATEGORY_POOLS.travel.filter(p => p.hero !== false),
  bw: MANIFEST_CATEGORY_POOLS.bw.filter(p => p.hero !== false),
  sky: MANIFEST_CATEGORY_POOLS.sky.filter(p => p.hero !== false),
};
`;

  fs.writeFileSync(MANIFEST_JS_PATH, manifestJs, 'utf8');

  // Also write JSON version for diagnostics/external tools
  fs.writeFileSync(
    MANIFEST_JSON_PATH,
    JSON.stringify({ config: MANIFEST_CONFIG_SUMMARY(photoList, featuredIds), photos: photoList }, null, 2),
    'utf8'
  );

  console.log(`✅ [TKC Gallery Discovery] Manifest generated successfully! Total photos: ${photoList.length}`);
  console.log(`   - Street:   ${categoryPools.street.length}`);
  console.log(`   - Wildlife: ${categoryPools.wildlife.length}`);
  console.log(`   - Nature:   ${categoryPools.nature.length}`);
  console.log(`   - Travel:   ${categoryPools.travel.length}`);
  console.log(`   - B&W:      ${categoryPools.bw.length}`);
  console.log(`   - Sky:      ${categoryPools.sky.length}`);
  return photoList;
}

function MANIFEST_CONFIG_SUMMARY(photoList, featuredIds) {
  return {
    total: photoList.length,
    featuredCount: photoList.filter(p => p.featured).length,
    featuredList: Array.from(featuredIds),
    generatedAt: new Date().toISOString(),
  };
}

// Run immediately if called from CLI
if (process.argv[1] && process.argv[1].endsWith('build-gallery.js')) {
  buildGallery();
}
