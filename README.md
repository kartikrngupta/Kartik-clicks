# THE KARTIK CLICKS — Portfolio & Visual Archive

> **Official photography portfolio and editorial archive of Kartik Gupta (Kartikclicks).**  
> Based across **Delhi NCR & Silvassa, India**.

---

## ✦ Brand Identity & Channels

- **Brand Name:** THE KARTIK CLICKS
- **Website / Identity:** Kartikclicks
- **Photographer:** Kartik Gupta
- **Locations:** Delhi NCR · Silvassa, India
- **Instagram:** [@the_kartik_clicks](https://www.instagram.com/the_kartik_clicks/)
- **Pinterest:** [kartikrngupta180](https://pin.it/5T232Zggp)
- **Direct Inquiries:** [kartikrngupta180@gmail.com](mailto:kartikrngupta180@gmail.com)

---

## ✦ Features & Architecture

1. **Approved Hero Section (Locked Design)**
   - Dominant subject: Kartik Gupta with his Canon camera (`assets/optimized/web/kartik-camera.webp` with `assets/kartik-camera.png` fallback).
   - Angled floating film contact-sheet cards (`hb1` through `hb4`) displaying real works from the archive.
   - Editorial typography: Google Fonts *Instrument Serif* and *DM Sans*.
   - Location tag: `DELHI NCR — SILVASSA · PHOTOGRAPHY — STORIES — MOMENTS`.
   - Tagline: *"Capturing moments, telling stories."*
   - Title: `THE KARTIK CLICKS`.
   - Subtitle: `KARTIK GUPTA / PHOTOGRAPHER • STREET • WILDLIFE • NATURE • TRAVEL • SKY`.
   - Call-to-action: `EXPLORE MY WORLD →`.

2. **Homepage Layout Structure (Strictly Ordered)**
   1. **Hero Section**
   2. **About Section** (Immediately follows the Hero with artist monograph, quote: *"Different scenes. Different stories. Same perspective."*, and signature)
   3. **Featured Frames** (Asymmetrical editorial showcase of master photographs)
   4. **Explore My World** (Archive portals for 6 core categories)
   5. **Stories Preview** (Thematic photo essays linking to `/stories`)
   6. **Contact & Inquiries** (Working inquiry form that pre-populates email, one-click copy email button, and direct social links)
   7. **Footer** (Minimalist copyright, location, and back-to-top button)

3. **Multi-Route Client-Side Router**
   - `/` — Homepage
   - `/gallery` — Complete archive with dynamic category filter pills (All, Street, Wildlife, Nature, Travel, Black & White, Sky)
   - `/gallery/:category` — Direct category views (e.g., `/gallery/wildlife`, `/gallery/street`)
   - `/stories` — In-depth visual photo essays
   - `/about` — Extended artist statement, philosophy, artistic pillars, and archive specs
   - `/contact` — Commission inquiries, licensing, and direct email contacts

4. **Fullscreen Editorial Lightbox**
   - Click any photograph anywhere on the site to inspect it in full high-resolution.
   - Next / Previous buttons + keyboard arrow shortcuts (`ArrowLeft` / `ArrowRight`).
   - `Escape` key and backdrop click to close.
   - Touch swipe gestures on mobile devices (left = next, right = prev).
   - Live photo counter (e.g. `04 / 20`), title, location, category tag, and story notes.
   - "View Original Resolution" link for clients and print buyers.

5. **Theme Engine & Micro-Interactions**
   - **Dark Mode (Default):** Deep obsidian/carbon palette with warm cream typography and vermilion accent.
   - **Light Mode:** Archival museum cotton paper palette with crisp carbon ink typography.
   - Persisted across visits via `localStorage`.
   - Magnetic desktop cursor with interactive "VIEW" expander on clickable photos.
   - Subtle darkroom film grain overlay.

6. **Performance & Asset Pipeline**
   - All 21 original camera files remain 100% untouched in `assets/`.
   - High-fidelity WebP versions generated in `assets/optimized/web/` (~130KB–680KB) and fast thumbnails in `assets/optimized/thumb/` (~30KB–110KB) for instant loading on mobile networks.

---

## ✦ How to Add New Photos in the Future

Adding new photographs to the portfolio is centralized and takes under 60 seconds:

### Step 1: Copy your new photo to `assets/`
Drop your raw image (e.g. `IMG_20260710_sunset.jpg`) into the `assets/` folder.

### Step 2: (Recommended) Generate WebP Copies
You can run the built-in optimizer script in PowerShell:
```bash
python -c "
from PIL import Image
p = 'assets/IMG_20260710_sunset.jpg'
with Image.open(p) as img:
    w = img.copy(); w.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
    w.save('assets/optimized/web/IMG_20260710_sunset.webp', 'WEBP', quality=85)
    t = img.copy(); t.thumbnail((800, 800), Image.Resampling.LANCZOS)
    t.save('assets/optimized/thumb/IMG_20260710_sunset.webp', 'WEBP', quality=80)
print('Optimized successfully!')
"
```

### Step 3: Add the entry to `assets/galleryData.js`
Open `assets/galleryData.js` and add a new item to the `PHOTOS` array:

```javascript
{
  id: "delhi-sunset-ridge",
  filename: "IMG_20260710_sunset.jpg",
  web: "/assets/optimized/web/IMG_20260710_sunset.webp",
  thumb: "/assets/optimized/thumb/IMG_20260710_sunset.webp",
  original: "/assets/IMG_20260710_sunset.jpg",
  title: "Sunset Over the Ridge",
  category: "travel", // 'street' | 'wildlife' | 'nature' | 'travel' | 'bw' | 'sky'
  categories: ["travel", "sky"],
  location: "Delhi NCR, India",
  date: "July 2026",
  orientation: "landscape", // 'landscape' | 'portrait'
  aspectRatio: "4/3",
  storyId: "citadels-and-dusk",
  featured: true,
  caption: "Warm twilight glow settling over the Northern Ridge.",
},
```

That's it! The homepage featured grid, archive counts, category filters, and fullscreen lightbox will automatically include your new photo.

---

## ✦ Local Development & Deployment

### Local Server
Run with any static server:
```bash
# Using Node:
npx serve .

# Or using Python:
python -m http.server 3000
```
Open `http://localhost:3000` in your browser.

### Deploying to Vercel
The repository includes a ready-to-deploy `vercel.json` configuring client-side routing rewrites:
```json
{
  "rewrites": [
    { "source": "/((?!assets/).*)", "destination": "/index.html" }
  ]
}
```
Simply connect your GitHub repository to Vercel or run:
```bash
vercel --prod
```
