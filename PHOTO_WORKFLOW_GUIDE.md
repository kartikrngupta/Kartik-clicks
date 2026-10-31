# THE KARTIK CLICKS — Photo Management & Deployment Guide

Welcome to your automated photo publishing workflow! You do not need any database, admin logins, or complex tools. You can add new photographs to your portfolio directly through GitHub, and Vercel will build and deploy your changes live automatically.

---

## 📁 1. Category Folders

All photos are organized inside `assets/photos/` by category:

| Category | Folder Path | Website Section |
| :--- | :--- | :--- |
| **Wildlife** | `assets/photos/wildlife/` | Wildlife Gallery & Wildlife Hero Frame |
| **Nature** | `assets/photos/nature/` | Nature Gallery & Nature Hero Frame |
| **Street** | `assets/photos/street/` | Street Gallery & Street Hero Frame |
| **Travel** | `assets/photos/travel/` | Travel Gallery & Travel Hero Frame |
| **Black & White** | `assets/photos/black-white/` | B&W Gallery & B&W Hero Frame |
| **Sky & Night** | `assets/photos/sky-night/` | Sky Gallery & Sky Hero Frame |

---

## 🚀 2. How to Upload a Photo (Step-by-Step)

### Option A: Using the GitHub Website (Quickest & Easiest)
1. Open your repository on GitHub:
   👉 **[https://github.com/kartikrngupta/Kartik-clicks](https://github.com/kartikrngupta/Kartik-clicks)**
2. Navigate into `assets` ➔ `photos` ➔ choose the category folder (e.g., `wildlife`).
3. Click the **Add file** button at the top right, then select **Upload files**.
4. Drag and drop your image file (e.g., `spotted-deer.webp` or `IMG_20261102.jpg`).
5. Scroll down to the **Commit changes** box:
   - Enter a message (e.g., `"feat: add spotted deer photograph"`).
   - Click the green **Commit changes** button.
6. **That's it!** Vercel will automatically detect your commit, run the build discovery script, and publish your new photograph live within 15–30 seconds.

---

## 🎨 3. Image Recommendations & Supported Formats

- **Supported Formats:** `.webp`, `.jpg`, `.jpeg`, `.png` (WebP is strongly recommended for best web performance).
- **Recommended Dimensions:**
  - **Landscape:** 1600px to 2400px wide.
  - **Portrait:** 1200px to 1800px wide.
- **Recommended File Size:** 300 KB – 1.5 MB for instant loading across mobile and desktop.

---

## 🏷️ 4. Automatic Titles & Custom Metadata

### Automatic Title (Zero Configuration Needed)
If you just upload `monsoon-canopy.webp`:
- The system automatically titles it: **"Monsoon Canopy"**
- Category is automatically assigned from the folder name.
- It automatically enters the corresponding category gallery and hero rotation pool!

### Optional Custom Metadata (`gallery-config.json`)
If you want to set a custom title, caption, location, specific date, or custom order:
1. Open [`gallery-config.json`](./gallery-config.json) on GitHub.
2. Click the ✏️ **Edit** icon.
3. Under the `"photos"` object, add your photo filename:

```json
"spotted-deer.webp": {
  "title": "The Spotted Stag at Dawn",
  "location": "Silvassa, India",
  "date": "November 2026",
  "caption": "A solitary spotted deer pausing in the morning golden hour mist.",
  "featured": true,
  "hero": true
}
```

---

## ⭐ 5. Featured Photos (Homepage Section)

To change which photographs appear in the **Featured Frames** section on the homepage:
Open [`gallery-config.json`](./gallery-config.json) and edit the `"featured"` array:

```json
"featured": [
  "azure-perch",
  "golden-hour-transit",
  "ramparts-of-the-sun",
  "connaught-pillars-1",
  "spotted-deer"
]
```

---

## 🔄 6. Hero Rotation Control

- Every photo uploaded into a category folder is automatically eligible for that category's rotating frame in the cinematic hero collage.
- If you have a photograph that you **only** want in the Gallery but **not** in the hero rotation, set `"hero": false` in its [`gallery-config.json`](./gallery-config.json) entry.
- **Kartik Cutout / Camera Portrait**: Stored separately in `assets/branding/` and remains **100% fixed, authentic, and untouched**.

---

## ✅ 7. How to Verify Your Vercel Deployment

1. Visit your live website:
   👉 **[https://kartikclicks.vercel.app](https://kartikclicks.vercel.app)**
2. Navigate to the category gallery of your photo (e.g., `/gallery/wildlife`).
3. You will see your new photograph displayed in the grid with lightbox zoom, full metadata, and smooth animations!
