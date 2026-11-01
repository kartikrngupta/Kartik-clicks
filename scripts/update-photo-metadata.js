/**
 * THE KARTIK CLICKS — Photo Metadata Updater
 * Safely updates or adds photo metadata in gallery-config.json,
 * preserves existing IDs, image paths, and extra metadata,
 * prevents duplicate entries, validates inputs, and synchronizes gallery manifests.
 *
 * Can be run from GitHub Actions workflow_dispatch or locally:
 *   node scripts/update-photo-metadata.js --filename "..." --title "..." [--category "..."] [--date "..."] [--order "..."]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildGallery,
  resolvePhotoOnDisk,
  stripImageExtensions,
  slugify,
  dateFromFilename,
  CATEGORY_MAP,
  CATEGORY_FOLDERS,
  VALID_EXTS,
} from './build-gallery.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CONFIG_PATH = path.join(rootDir, 'gallery-config.json');
const PHOTOS_DIR = path.join(rootDir, 'assets', 'photos');

// Re-export resolvePhotoOnDisk as findPhotoOnDisk for backward compatibility
export const findPhotoOnDisk = resolvePhotoOnDisk;

// Supported canonical categories
const VALID_CATEGORIES = new Set(['sky', 'wildlife', 'nature', 'street', 'travel', 'bw']);

const CATEGORY_INPUT_MAP = {
  'sky': 'sky',
  'sky-night': 'sky',
  'wildlife': 'wildlife',
  'nature': 'nature',
  'street': 'street',
  'travel': 'travel',
  'bw': 'bw',
  'black-white': 'bw',
};

function getArg(flag) {
  const idx = process.argv.indexOf(`--${flag}`);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1].trim();
  }
  return null;
}

/**
 * Matches an existing photo entry in config.photos by filename, base stem, full path, or ID
 */
export function findExistingPhotoKey(configPhotos, rawInput) {
  if (!configPhotos || !rawInput || typeof rawInput !== 'string') return null;

  const trimmed = rawInput.trim();
  const baseName = path.basename(trimmed.replace(/\\/g, '/')).toLowerCase();
  const strippedInput = stripImageExtensions(baseName).toLowerCase();
  const inputId = slugify(strippedInput);
  const normalizedLower = trimmed.toLowerCase();

  for (const [key, photo] of Object.entries(configPhotos)) {
    const keyLower = key.toLowerCase();
    const keyBase = stripImageExtensions(path.basename(key.replace(/\\/g, '/'))).toLowerCase();
    const keyId = photo.id ? photo.id.toLowerCase() : slugify(keyBase);

    // 1. Exact key match (case-insensitive)
    if (keyLower === normalizedLower) return key;

    // 2. Basename match with key
    if (keyLower === baseName) return key;

    // 3. Stripped base match (handles .jpg vs .jpg.jpeg)
    if (keyBase === strippedInput) return key;

    // 4. ID match
    if (keyId === inputId || (photo.id && photo.id.toLowerCase() === normalizedLower)) return key;

    // 5. URL path matches (web, thumb, original)
    if (photo.web) {
      const webLower = photo.web.toLowerCase();
      if (webLower === normalizedLower || webLower.replace(/^\//, '') === normalizedLower) return key;
    }
    if (photo.original) {
      const origLower = photo.original.toLowerCase();
      if (origLower === normalizedLower || origLower.replace(/^\//, '') === normalizedLower) return key;
    }
  }

  return null;
}

export function updatePhotoMetadata({
  filename,
  title,
  category,
  date,
  order,
  configPath = CONFIG_PATH,
  photosDir = PHOTOS_DIR,
  rebuildManifest = true,
}) {
  // 1. Validate Filename
  if (!filename || typeof filename !== 'string' || !filename.trim()) {
    throw new Error('❌ Error: Exact photo filename is required.');
  }

  const rawFilename = filename.trim();

  // Path traversal check
  if (rawFilename.includes('..') || rawFilename.includes('\0')) {
    throw new Error('❌ Error: Path traversal is not permitted in filename.');
  }

  // Extract base filename (supports "IMG_123.jpg", "assets/photos/sky-night/IMG_123.jpg", etc.)
  const cleanFilename = path.basename(rawFilename.replace(/\\/g, '/'));
  const ext = path.extname(cleanFilename).toLowerCase();

  if (ext && !VALID_EXTS.has(ext)) {
    throw new Error(`❌ Error: Unsupported file extension "${ext}". Supported extensions: .jpg, .jpeg, .png, .webp`);
  }

  // 2. Validate Title
  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new Error('❌ Error: New photo title is required.');
  }
  const cleanTitle = title.trim();

  // 3. Validate Order (strict positive integer if provided)
  let cleanOrder = null;
  if (order !== undefined && order !== null && String(order).trim() !== '') {
    const rawOrderStr = String(order).trim();
    const parsedOrder = Number(rawOrderStr);
    if (!Number.isInteger(parsedOrder) || parsedOrder <= 0) {
      throw new Error(`❌ Error: Order must be a strict positive integer (received: "${order}").`);
    }
    cleanOrder = parsedOrder;
  }

  // 4. Validate Category (strict check against canonical categories)
  let normalizedCategory = null;
  if (category && typeof category === 'string' && category.trim()) {
    const trimmedCat = category.trim().toLowerCase();
    if (trimmedCat !== 'keep-current' && trimmedCat !== 'keep-existing') {
      normalizedCategory = CATEGORY_INPUT_MAP[trimmedCat];
      if (!normalizedCategory || !VALID_CATEGORIES.has(normalizedCategory)) {
        throw new Error(
          `❌ Error: Invalid category "${category}". Supported categories: ${Array.from(VALID_CATEGORIES).join(', ')}`
        );
      }
    }
  }

  // 5. Validate Date
  const cleanDate = date && typeof date === 'string' && date.trim() ? date.trim() : null;

  // 6. Load gallery-config.json
  if (!fs.existsSync(configPath)) {
    throw new Error(`❌ Error: Config file not found at ${configPath}`);
  }

  const rawConfig = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(rawConfig);
  if (!config.photos) {
    config.photos = {};
  }

  // 7. Find Existing Photo in Config OR Locate File on Disk using gallery build resolver
  const diskFile = resolvePhotoOnDisk(rawFilename, photosDir);
  const existingKey =
    findExistingPhotoKey(config.photos, rawFilename) ||
    (diskFile ? findExistingPhotoKey(config.photos, diskFile.filename) : null);

  let updatedPhoto;
  let targetKey;

  if (existingKey) {
    // === UPDATE EXISTING PHOTO ===
    console.log(`⚡ Updating existing metadata entry for: ${existingKey}`);
    const existing = config.photos[existingKey];

    // Update title
    existing.title = cleanTitle;

    // Update category only if explicitly specified and not keep-current
    if (normalizedCategory) {
      existing.category = normalizedCategory;
      // Preserve other secondary tags if present, ensuring primary category is first
      const otherCategories = (existing.categories || []).filter(
        c => c !== existing.category && c !== normalizedCategory
      );
      existing.categories = [normalizedCategory, ...otherCategories];
    }

    // Update date if provided
    if (cleanDate) {
      existing.date = cleanDate;
    }

    // Update order if provided
    if (cleanOrder !== null) {
      existing.order = cleanOrder;
    }

    targetKey = existingKey;

    // If disk file has canonical name (e.g. .jpg.jpeg vs .jpg), normalize key
    if (diskFile && diskFile.filename !== existingKey) {
      delete config.photos[existingKey];
      config.photos[diskFile.filename] = existing;
      targetKey = diskFile.filename;
    }

    updatedPhoto = existing;
  } else {
    // === CREATE NEW PHOTO ENTRY ===
    console.log(`⚡ Creating new metadata entry for: ${cleanFilename}`);

    // Reject files that do not exist physically on disk
    if (!diskFile) {
      throw new Error(
        `❌ Error: File "${cleanFilename}" not found on disk in assets/photos/. Upload the image to a category folder before adding metadata.`
      );
    }

    const canonicalFilename = diskFile.filename;
    const assignedCategory = normalizedCategory || diskFile.category || 'street';
    const cleanBase = stripImageExtensions(canonicalFilename);
    const photoId = slugify(cleanBase);

    // Check for duplicate ID against other photos
    const duplicateIdEntry = Object.entries(config.photos).find(
      ([k, p]) => p.id === photoId && k !== canonicalFilename
    );
    if (duplicateIdEntry) {
      throw new Error(
        `❌ Error: Photo ID "${photoId}" is already used by "${duplicateIdEntry[0]}". Photo IDs must be unique.`
      );
    }

    // Calculate default order if not provided
    const existingOrders = Object.values(config.photos)
      .map(p => p.order)
      .filter(o => typeof o === 'number');
    const nextOrder = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 1;

    updatedPhoto = {
      id: photoId,
      title: cleanTitle,
      category: assignedCategory,
      categories: [assignedCategory],
      location: 'Delhi NCR · Silvassa, India',
      date: cleanDate || dateFromFilename(canonicalFilename) || '2026',
      orientation: 'landscape',
      aspectRatio: '4/3',
      featured: false,
      hero: true,
      caption: `Curated in the photography archive.`,
      order: cleanOrder !== null ? cleanOrder : nextOrder,
    };

    config.photos[canonicalFilename] = updatedPhoto;
    targetKey = canonicalFilename;
  }

  // 8. Write back to config file
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log(`✅ Successfully saved metadata in ${path.basename(configPath)}:`);
  console.log(`   - Key:      ${targetKey}`);
  console.log(`   - ID:       ${updatedPhoto.id}`);
  console.log(`   - Title:    "${updatedPhoto.title}"`);
  console.log(`   - Category: ${updatedPhoto.category}`);
  console.log(`   - Date:     ${updatedPhoto.date}`);
  console.log(`   - Order:    ${updatedPhoto.order}`);

  // 9. Rebuild manifest if requested and operating on actual project config
  if (rebuildManifest && path.resolve(configPath) === path.resolve(CONFIG_PATH)) {
    console.log('\n⚡ Synchronizing gallery manifest...');
    buildGallery();
  }

  return updatedPhoto;
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith('update-photo-metadata.js')) {
  try {
    const filename = getArg('filename') || process.env.PHOTO_FILENAME || process.env.INPUT_FILENAME;
    const title = getArg('title') || process.env.PHOTO_TITLE || process.env.INPUT_TITLE;
    const category = getArg('category') || process.env.PHOTO_CATEGORY || process.env.INPUT_CATEGORY;
    const date = getArg('date') || process.env.PHOTO_DATE || process.env.INPUT_DATE;
    const order = getArg('order') || process.env.PHOTO_ORDER || process.env.INPUT_ORDER;

    updatePhotoMetadata({ filename, title, category, date, order });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
