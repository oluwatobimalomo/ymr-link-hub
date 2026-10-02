# YMR Global — Link Hub

A single-page link hub for joining YMR Global WhatsApp groups.

## Editing content

- Group links, names, and descriptions: `src/data/groups.js`
- Logo: `src/assets/ymr-logo.png`
- Colors and fonts: CSS variables at the top of `src/index.css`

## Running locally

```
npm install
npm run dev
```

## Building for deployment

```
npm run build
```

This outputs a static site to `dist/`. Upload the contents of `dist/` to your
subdomain's hosting (Netlify, Vercel, cPanel, S3, etc.) — it's plain HTML/CSS/JS,
no server required.
