/**
 * THE KARTIK CLICKS — Hero Page Content Updater
 * Safely updates Hero Page content in hero-config.json,
 * validates image paths against the repository, validates URLs,
 * preserves existing values when inputs are blank or 'keep-current',
 * and synchronizes the gallery build.
 *
 * Can be run from GitHub Actions workflow_dispatch or locally:
 *   node scripts/update-hero-content.js [--bg_image "..."] [--heading "..."] [--tagline "..."] ...
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildGallery, resolvePhotoOnDisk } from './build-gallery.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const HERO_CONFIG_PATH = path.join(rootDir, 'hero-config.json');

const DEFAULT_HERO_CONFIG = {
  backgroundImage: "",
  heading: "THE KARTIK CLICKS",
  tagline: "Capturing moments, telling stories",
  introduction: "A personal archive of quiet encounters, urban motion, and changing skies.",
  buttons: {
    primary: {
      text: "EXPLORE MY WORLD",
      url: "/gallery"
    },
    secondary: {
      text: "",
      url: ""
    }
  },
  socialLinks: {
    instagram: "https://www.instagram.com/the_kartik_clicks/",
    pinterest: "https://pin.it/5T232Zggp",
    email: "kartikrngupta180@gmail.com"
  }
};

const MAX_LENGTHS = {
  heading: 120,
  tagline: 250,
  introduction: 600,
  buttonText: 60,
  buttonUrl: 500,
  socialUrl: 500,
  email: 120,
  imagePath: 300,
};

function getArg(flag) {
  const idx = process.argv.indexOf(`--${flag}`);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1].trim();
  }
  return null;
}

function isKeepCurrent(val) {
  if (val === undefined || val === null) return true;
  const str = String(val).trim().toLowerCase();
  return str === '' || str === 'keep-current' || str === 'keep-existing' || str === 'undefined';
}

function isClearValue(val) {
  if (val === undefined || val === null) return false;
  const str = String(val).trim().toLowerCase();
  return str === 'none' || str === 'clear' || str === 'remove';
}

/**
 * Strips HTML tags and normalizes whitespace from user text inputs.
 */
export function sanitizeText(str, maxLength = 600, fieldName = 'Text') {
  if (isKeepCurrent(str)) return 'KEEP_CURRENT';
  const clean = String(str)
    .replace(/<[^>]*>/g, '')
    .trim();
  if (clean.length > maxLength) {
    throw new Error(`❌ Error: ${fieldName} exceeds maximum permitted length of ${maxLength} characters (received ${clean.length}).`);
  }
  return clean;
}

/**
 * Validates a repository image path for the hero background.
 * Rejects external URLs and nonexistent local files.
 */
export function validateHeroImage(input, baseDir = rootDir) {
  if (isKeepCurrent(input)) return 'KEEP_CURRENT';
  if (isClearValue(input)) return '';

  const trimmed = String(input).trim();

  if (trimmed.length > MAX_LENGTHS.imagePath) {
    throw new Error(`❌ Error: Hero background image path exceeds maximum permitted length of ${MAX_LENGTHS.imagePath} characters.`);
  }

  // 1. Strict external URL rejection
  if (/^https?:\/\/|^\/\//i.test(trimmed)) {
    throw new Error(
      `❌ Error: External URLs are not permitted for hero background image ("${trimmed}"). Select an existing image from the repository.`
    );
  }

  // 2. Path traversal rejection
  if (trimmed.includes('..') || trimmed.includes('\0')) {
    throw new Error('❌ Error: Path traversal is not permitted in image path.');
  }

  // Normalize path
  const normalized = trimmed.replace(/\\/g, '/').replace(/^\/+/, '');

  // 3. Check direct path from project root (e.g. assets/branding/kartik-camera.webp)
  const directPath = path.join(baseDir, normalized);
  if (fs.existsSync(directPath) && !fs.statSync(directPath).isDirectory()) {
    return `/${normalized}`;
  }

  // 4. Check inside assets/
  const assetsPath = path.join(baseDir, 'assets', normalized);
  if (fs.existsSync(assetsPath) && !fs.statSync(assetsPath).isDirectory()) {
    return `/assets/${normalized}`;
  }

  // 5. Check using gallery's resolvePhotoOnDisk
  const photosDir = path.join(baseDir, 'assets', 'photos');
  const photoResolved = resolvePhotoOnDisk(trimmed, photosDir);
  if (photoResolved && fs.existsSync(photoResolved.fullPath)) {
    return photoResolved.relativeUrl;
  }

  throw new Error(
    `❌ Error: Hero background image "${trimmed}" was not found on disk in the repository.`
  );
}

/**
 * Validates button destination URLs (internal paths or safe HTTPS URLs).
 */
export function validateButtonUrl(url, fieldName = 'Button URL') {
  if (isKeepCurrent(url)) return 'KEEP_CURRENT';
  if (isClearValue(url)) return '';

  const trimmed = String(url).trim();

  if (trimmed.length > MAX_LENGTHS.buttonUrl) {
    throw new Error(`❌ Error: ${fieldName} exceeds maximum permitted length of ${MAX_LENGTHS.buttonUrl} characters.`);
  }

  // Reject malicious schemes and protocol-relative URLs
  if (/^(javascript|data|vbscript|file):/i.test(trimmed) || trimmed.startsWith('//')) {
    throw new Error(`❌ Error: Insecure scheme or protocol-relative URL detected in ${fieldName}: "${trimmed}".`);
  }

  // Allow internal paths (/gallery, /stories, /about, /contact, #about, etc.)
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed;
  }

  // Allow valid external HTTPS links
  if (/^https:\/\//i.test(trimmed)) {
    return trimmed;
  }

  throw new Error(
    `❌ Error: Invalid ${fieldName} "${trimmed}". Must start with "/" for internal routes or "https://" for external destinations.`
  );
}

/**
 * Validates social media URLs.
 */
export function validateSocialUrl(url, platform = 'Social') {
  if (isKeepCurrent(url)) return 'KEEP_CURRENT';
  const trimmed = String(url).trim();

  if (trimmed.length > MAX_LENGTHS.socialUrl) {
    throw new Error(`❌ Error: ${platform} URL exceeds maximum permitted length of ${MAX_LENGTHS.socialUrl} characters.`);
  }

  if (trimmed.startsWith('//')) {
    throw new Error(`❌ Error: Protocol-relative URLs are not permitted in ${platform} URL: "${trimmed}".`);
  }

  if (!/^https:\/\/[^\s$.?#].[^\s]*$/i.test(trimmed)) {
    throw new Error(`❌ Error: ${platform} URL must be a valid HTTPS address (received: "${trimmed}").`);
  }
  return trimmed;
}

/**
 * Validates email addresses.
 */
export function validateEmail(email) {
  if (isKeepCurrent(email)) return 'KEEP_CURRENT';
  const trimmed = String(email).trim();

  if (trimmed.length > MAX_LENGTHS.email) {
    throw new Error(`❌ Error: Email address exceeds maximum permitted length of ${MAX_LENGTHS.email} characters.`);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error(`❌ Error: Invalid email address "${trimmed}".`);
  }
  return trimmed;
}

/**
 * Core function to update hero content configuration.
 */
export function updateHeroContent({
  bgImage,
  heading,
  tagline,
  introduction,
  primaryButtonText,
  primaryButtonUrl,
  secondaryButtonText,
  secondaryButtonUrl,
  instagramUrl,
  pinterestUrl,
  email,
  configPath = HERO_CONFIG_PATH,
  baseDir = rootDir,
  rebuildManifest = true,
}) {
  // 1. Load existing config or use defaults
  let currentConfig = { ...DEFAULT_HERO_CONFIG };
  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      currentConfig = {
        ...DEFAULT_HERO_CONFIG,
        ...parsed,
        buttons: { ...DEFAULT_HERO_CONFIG.buttons, ...(parsed.buttons || {}) },
        socialLinks: { ...DEFAULT_HERO_CONFIG.socialLinks, ...(parsed.socialLinks || {}) },
      };
    } catch (e) {
      console.warn(`⚠️ Could not parse existing ${path.basename(configPath)}, using defaults.`);
    }
  }

  const updated = {
    ...currentConfig,
    buttons: { ...currentConfig.buttons },
    socialLinks: { ...currentConfig.socialLinks },
  };

  // 2. Validate & Update Background Image
  if (!isKeepCurrent(bgImage)) {
    const validatedBg = validateHeroImage(bgImage, baseDir);
    if (validatedBg !== 'KEEP_CURRENT') {
      updated.backgroundImage = validatedBg;
      console.log(`✓ Background image: ${validatedBg || '(none)'}`);
    }
  }

  // 3. Validate & Update Heading (strips HTML tags, enforces length)
  if (!isKeepCurrent(heading)) {
    const cleanHeading = sanitizeText(heading, MAX_LENGTHS.heading, 'Heading');
    if (cleanHeading !== 'KEEP_CURRENT') {
      updated.heading = cleanHeading;
      console.log(`✓ Heading: "${updated.heading}"`);
    }
  }

  // 4. Validate & Update Tagline (strips HTML tags, enforces length)
  if (!isKeepCurrent(tagline)) {
    const cleanTagline = sanitizeText(tagline, MAX_LENGTHS.tagline, 'Tagline');
    if (cleanTagline !== 'KEEP_CURRENT') {
      updated.tagline = cleanTagline;
      console.log(`✓ Tagline: "${updated.tagline}"`);
    }
  }

  // 5. Validate & Update Introduction (strips HTML tags, enforces length)
  if (!isKeepCurrent(introduction)) {
    const cleanIntro = sanitizeText(introduction, MAX_LENGTHS.introduction, 'Introduction');
    if (cleanIntro !== 'KEEP_CURRENT') {
      updated.introduction = cleanIntro;
      console.log(`✓ Introduction: "${updated.introduction}"`);
    }
  }

  // 6. Validate & Update Primary Button
  if (!isKeepCurrent(primaryButtonText)) {
    const cleanPrimaryText = sanitizeText(primaryButtonText, MAX_LENGTHS.buttonText, 'Primary Button Text');
    if (cleanPrimaryText !== 'KEEP_CURRENT') {
      updated.buttons.primary.text = cleanPrimaryText;
      console.log(`✓ Primary Button Text: "${updated.buttons.primary.text}"`);
    }
  }
  if (!isKeepCurrent(primaryButtonUrl)) {
    const validatedUrl = validateButtonUrl(primaryButtonUrl, 'Primary Button URL');
    if (validatedUrl !== 'KEEP_CURRENT') {
      updated.buttons.primary.url = validatedUrl;
      console.log(`✓ Primary Button URL: "${updated.buttons.primary.url}"`);
    }
  }

  // 7. Validate & Update Secondary Button
  if (!isKeepCurrent(secondaryButtonText)) {
    if (isClearValue(secondaryButtonText)) {
      updated.buttons.secondary.text = '';
      updated.buttons.secondary.url = '';
      console.log(`✓ Secondary Button: cleared`);
    } else {
      const cleanSecText = sanitizeText(secondaryButtonText, MAX_LENGTHS.buttonText, 'Secondary Button Text');
      if (cleanSecText !== 'KEEP_CURRENT') {
        updated.buttons.secondary.text = cleanSecText;
        console.log(`✓ Secondary Button Text: "${updated.buttons.secondary.text}"`);
      }
    }
  }
  if (!isKeepCurrent(secondaryButtonUrl)) {
    if (isClearValue(secondaryButtonUrl)) {
      updated.buttons.secondary.url = '';
    } else {
      const validatedSecUrl = validateButtonUrl(secondaryButtonUrl, 'Secondary Button URL');
      if (validatedSecUrl !== 'KEEP_CURRENT') {
        updated.buttons.secondary.url = validatedSecUrl;
        console.log(`✓ Secondary Button URL: "${updated.buttons.secondary.url}"`);
      }
    }
  }

  // 8. Validate & Update Social Links
  if (!isKeepCurrent(instagramUrl)) {
    const validatedInsta = validateSocialUrl(instagramUrl, 'Instagram');
    if (validatedInsta !== 'KEEP_CURRENT') {
      updated.socialLinks.instagram = validatedInsta;
      console.log(`✓ Instagram URL: "${updated.socialLinks.instagram}"`);
    }
  }
  if (!isKeepCurrent(pinterestUrl)) {
    const validatedPin = validateSocialUrl(pinterestUrl, 'Pinterest');
    if (validatedPin !== 'KEEP_CURRENT') {
      updated.socialLinks.pinterest = validatedPin;
      console.log(`✓ Pinterest URL: "${updated.socialLinks.pinterest}"`);
    }
  }
  if (!isKeepCurrent(email)) {
    const validatedEmail = validateEmail(email);
    if (validatedEmail !== 'KEEP_CURRENT') {
      updated.socialLinks.email = validatedEmail;
      console.log(`✓ Email: "${updated.socialLinks.email}"`);
    }
  }

  // 9. Write back to config file
  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2) + '\n', 'utf8');
  console.log(`\n✅ Successfully saved Hero configuration in ${path.basename(configPath)}.`);

  // 10. Rebuild gallery manifest if requested and operating on actual project config
  if (rebuildManifest && path.resolve(configPath) === path.resolve(HERO_CONFIG_PATH)) {
    console.log('\n⚡ Synchronizing gallery build...');
    buildGallery();
  }

  return updated;
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith('update-hero-content.js')) {
  try {
    const bgImage = getArg('bg_image') || process.env.HERO_BG_IMAGE || process.env.INPUT_BG_IMAGE;
    const heading = getArg('heading') || process.env.HERO_HEADING || process.env.INPUT_HEADING;
    const tagline = getArg('tagline') || process.env.HERO_TAGLINE || process.env.INPUT_TAGLINE;
    const introduction = getArg('introduction') || process.env.HERO_INTRODUCTION || process.env.INPUT_INTRODUCTION;
    const primaryButtonText = getArg('primary_button_text') || process.env.HERO_PRIMARY_BUTTON_TEXT || process.env.INPUT_PRIMARY_BUTTON_TEXT;
    const primaryButtonUrl = getArg('primary_button_url') || process.env.HERO_PRIMARY_BUTTON_URL || process.env.INPUT_PRIMARY_BUTTON_URL;
    const secondaryButtonText = getArg('secondary_button_text') || process.env.HERO_SECONDARY_BUTTON_TEXT || process.env.INPUT_SECONDARY_BUTTON_TEXT;
    const secondaryButtonUrl = getArg('secondary_button_url') || process.env.HERO_SECONDARY_BUTTON_URL || process.env.INPUT_SECONDARY_BUTTON_URL;
    const instagramUrl = getArg('instagram_url') || process.env.HERO_INSTAGRAM_URL || process.env.INPUT_INSTAGRAM_URL;
    const pinterestUrl = getArg('pinterest_url') || process.env.HERO_PINTEREST_URL || process.env.INPUT_PINTEREST_URL;
    const email = getArg('email') || process.env.HERO_EMAIL || process.env.INPUT_EMAIL;

    updateHeroContent({
      bgImage,
      heading,
      tagline,
      introduction,
      primaryButtonText,
      primaryButtonUrl,
      secondaryButtonText,
      secondaryButtonUrl,
      instagramUrl,
      pinterestUrl,
      email,
    });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
