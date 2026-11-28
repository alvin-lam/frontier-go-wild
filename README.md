# All Trips Considered web app template

The starting point for every All Trips Considered tool. It provides the brand header, the Appearance panel, Travel Tools links, the footer, a back-to-top button, the Add to Home Screen banner and the standard privacy page.

This template is not a published site. Each app built from it is published on its own subdomain of alltripsconsidered.com.

## Features

- **Brand header and footer:** "All Trips Considered" in Instrument Serif, the app name, a 75 px app icon and the copyright line.
- **Appearance panel:** light, dark or automatic mode, plus season and holiday colors. Holiday names are translated into 59 languages and the panel's labels into 45, including English. Only the visitor's language file is fetched.
- **Season and holiday colors:** the automatic scheme follows the season and the holidays celebrated in the visitor's country. See [Holidays and colors](#holidays-and-colors).
- **Travel Tools:** links to the other All Trips Considered tools.
- **Add to Home Screen banner** and a **back-to-top button.**
- **Standard privacy page:** the same sections, wording and look as every other app, with the app-specific parts marked `TEMPLATE:`.

## Privacy

The template saves only the visitor's mode, color choice and whether they closed the Add to Home Screen banner, in the browser's local storage. Nothing is uploaded. Each app fills in the rest of its policy in [`docs/privacy.html`](docs/privacy.html).

## Project structure

Everything the site serves lives in `docs/`, which GitHub Pages publishes. Development files stay at the repository root and are not published.

```
docs/index.html                   Page markup only: no inline scripts or styles
docs/privacy.html                 Standard privacy page (fill in the TEMPLATE: parts per app)
docs/favicon.ico                  Default tab icon (16, 32 and 48 px)
docs/manifest.webmanifest         Home Screen app details
docs/robots.txt                   Crawling rules
docs/assets/css/app.css           All styles for index.html
docs/assets/css/privacy.css       Shared privacy page styles; the same file ships with every app
docs/assets/js/calendar-data.js   Color schemes, holiday date rules, regions and time zones (data only)
docs/assets/js/theme-boot.js      Runs in <head>: applies the mode and colors before the page paints
docs/assets/js/app.js             Runs after parsing: Appearance panel, translations, banner, back to top
docs/assets/i18n/<language>.json  Holiday names and panel labels, one file per language
docs/assets/img/                  Icons at the sizes the pages use
docs/assets/fonts/                Instrument Serif (self-hosted) and its license
README.md                         This file
.claude/agents/qc-bug-hunter.md   QC and bug hunting agent for Claude Code (edit its Project checks per app)
design/icon-source.png            Full-size icon artwork, the source of every icon
```

## Run locally

The page loads its language files with `fetch`, which browsers block for `file://` pages, so serve the folder:

```bash
python3 -m http.server 8000 --directory docs
```

Open http://localhost:8000.

## Making changes

### Make a new app from the template

Search for `TEMPLATE:` in `docs/`. In short:

1. Set `data-app` on `<html>` in `index.html` and `privacy.html` to a short unique id. Saved settings are named after it.
2. Replace "App Name" in both pages and in `manifest.webmanifest`, and replace the h1 emoji. The main page title is "App Name | All Trips Considered" and the privacy page title is "Privacy | App Name | All Trips Considered", with the app's name in place of "App Name".
3. Replace the images in `docs/assets/img/` and `docs/favicon.ico`. Keep the file names and sizes, and keep the source artwork in `design/`.
4. Mark this app's link in Travel Tools with `aria-current="page"` and change its arrow text to "You are here".
5. Fill in the privacy page: what the app saves, the optional export and link sections, and the date. Keep the section order and wording the same as the other apps.
6. Add `docs/CNAME` with the app's subdomain, and copy this README's outline for the new repository.

### Holidays and colors

- Every holiday lists the countries where it is a public holiday or widely celebrated (`where`), plus device languages for diasporas (`langs`). A visitor sees only their own country's holidays, plus seasons. New Year's Eve is the only holiday listed everywhere.
- The country comes from the device time zone, then from the region in the language setting.
- When two holidays overlap, a pinned rule wins. Pinned rules cover Christmas Eve and Day, February 14, and the main day of each moving holiday such as Eid, Diwali, Holi and Lunar New Year. Next comes the holiday celebrated in fewer countries, then the shorter one. Because of this, a holiday can lose its main day in some years. For example, Hanukkah can take New Year's Eve, Christmas or Thanksgiving in the United States, Eid can take Valentine's Day, and Día de Muertos takes Halloween in Mexico.
- Serbia, Montenegro, North Macedonia, Georgia, Belarus and Ethiopia get Christmas on January 7. Rules can use `out` and `in` to split countries.
- Lunar, Hebrew, Hindu and Islamic calendar dates are in `tables` in `docs/assets/js/calendar-data.js` and run through 2036. The comment above the data says how each was checked.
- Translations were written without an official source, so check them before launch. Eid dates follow Saudi Arabia's Umm al-Qura calendar. Local moon sighting can move them by a day, and the date windows allow for it.

### Updating the font

Download the new files from Google Fonts with a new version in the file name. Then update the `@font-face` rules in `app.css` and `privacy.css` and the preload line in both pages.

### Releasing an update

The template has no service worker. In an app that has one, bump the cache name in `docs/sw.js` and add any new files to its list whenever a cached file changes, so installed copies update.

## Security

- **Content-Security-Policy:** a `<meta>` tag in both pages lets scripts, styles, fonts and data load only from this site. There is no inline code, no `eval` and no third-party request.
- **Trusted Types:** enforced with no policies allowed (`trusted-types 'none'`), so the browser blocks `innerHTML`, `insertAdjacentHTML`, `document.write` and similar HTML sinks. Build the interface with `textContent` and `createElement`. If an app truly needs HTML, add a named policy to `trusted-types` in both pages and in the Cloudflare header rule.
- **Self-hosted fonts:** pages make no requests to Google or any other service.
- **Checked input:** interface text is inserted with `textContent`. Language files are checked (known keys, short strings only) before use, and only listed language codes are fetched. Saved values are checked against known values before use.

### Headers to set in Cloudflare

GitHub Pages cannot send custom headers, so set them with a Cloudflare Transform Rule (Rules > Transform Rules > Modify Response Header) for the app's hostname:

- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; require-trusted-types-for 'script'; trusted-types 'none'; frame-ancestors 'none'; upgrade-insecure-requests`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`

## Deployment

The template itself is not published. `main` is its default branch, and changes reach it through approved pull requests.

Each app built from it is published the same way. GitHub Pages publishes the `/docs` folder of the app's `prod` branch (Settings > Pages > Deploy from a branch). `docs/CNAME` sets the custom domain, and Cloudflare provides DNS. `prod` is the default branch. Changes reach it only through an approved pull request, and the site updates a few minutes after a merge.

## Credits and licenses

- Instrument Serif is used under the SIL Open Font License (`docs/assets/fonts/OFL.txt`).

<p align="center">© 2026 All Trips Considered. All rights reserved.</p>
