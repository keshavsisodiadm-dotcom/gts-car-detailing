# GTS Car Detailing

Production source for the GTS Car Detailing website at [gtscardetailing.shop](https://gtscardetailing.shop). The project is a mobile-first static website backed by Netlify Functions and Netlify Blobs. It provides a public service catalogue, generated SEO service pages, a guided booking flow, WhatsApp hand-off, and an authenticated administration panel.

## Technology

- HTML, CSS, and browser-native JavaScript
- Node.js scripts for generated SEO pages and validation
- Netlify Functions for the application API
- Netlify Blobs for services, bookings, and public contact settings
- Netlify CLI for local development and deployment

Use Node.js 20 or newer. The repository includes `package-lock.json`; use `npm ci` for reproducible installs.

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html`, `styles.css`, `app.js`, `site.js` | Public landing page and shared runtime settings |
| `book.html`, `flow.css`, `booking.js` | Guided booking flow |
| `service.html`, `service.css`, `service.js` | Runtime service-page template and behaviour |
| `admin.html`, `admin.css`, `admin.js` | Authenticated service, booking, and contact manager |
| `assets/` | Brand, service, vehicle, and manufacturer artwork |
| `data/services.json` | Seed catalogue and source for generated service pages |
| `data/brands.json` | Vehicle brands and models used by the booking flow |
| `services/` | Generated, crawlable service landing pages |
| `scripts/generate-seo.mjs` | Generates `services/*/index.html` and `sitemap.xml` |
| `netlify/functions/` | Public and authenticated API functions |
| `netlify.toml` | Netlify publishing, redirects, functions, headers, and security policy |
| `robots.txt`, `sitemap.xml`, `llms.txt` | Search and crawler metadata |

The generated `services/` directory and `sitemap.xml` are committed intentionally so the same static output can be deployed with a manual Netlify upload. Run the build after editing `data/services.json` or `service.html`.

## Environment variables

Copy `.env.example` to `.env` for local development. Never commit `.env` or real credentials.

| Variable | Required | Description |
| --- | --- | --- |
| `ADMIN_USERNAME` | Yes | Username accepted by the administration login function |
| `ADMIN_PASSWORD` | Yes | Administration password; use a strong, unique value |
| `ADMIN_SESSION_SECRET` | Yes | Long random secret used to sign eight-hour admin session tokens; use at least 32 random bytes |
| `CONTACT_PHONE` | No | Initial 10-digit public phone/WhatsApp number used before a value is saved in Netlify Blobs |
| `CONTACT_EMAIL` | No | Initial public email used before a value is saved in Netlify Blobs |

Generate a session secret locally with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set production values in **Netlify → Project configuration → Environment variables**. Do not place credentials in browser JavaScript, HTML, `netlify.toml`, or GitHub repository variables intended for public use.

## Installation and local development

```powershell
git clone <repository-url>
cd gts-car-detailing
npm ci
Copy-Item .env.example .env
npm run dev
```

Fill in the required values in `.env`, then open the URL printed by Netlify CLI. `npm run dev` starts the static site, Netlify Functions, redirects, and local Netlify Blobs emulation together.

The administration interface is available at `/admin`; the booking flow is available at `/book`.

## Database and persistence

No separate database server or migration command is required. The application uses three Netlify Blob stores:

| Store | Data |
| --- | --- |
| `gts-services` | Live service catalogue and administrator-defined ordering |
| `gts-bookings` | Booking submissions keyed by booking ID |
| `gts-settings` | Public phone number and email address |

On the first request, `gts-services` is seeded from `data/services.json`. Public contact settings are seeded from `CONTACT_PHONE` and `CONTACT_EMAIL` when no saved settings exist. Later changes made in the admin panel are stored in Netlify Blobs and do not rewrite the repository seed files.

During local development, Netlify CLI stores emulated Blob data under the ignored `.netlify/` directory. Production Blob data belongs to the linked Netlify site. To start with a different production catalogue, update the seed file before the first deployment or deliberately update the catalogue through the admin API after deployment.

## API overview

Public functions:

- `GET /.netlify/functions/services`
- `GET /.netlify/functions/settings`
- `POST /.netlify/functions/booking`

Authenticated functions:

- `POST /.netlify/functions/admin-login`
- `GET|PUT /.netlify/functions/admin-services`
- `GET /.netlify/functions/bookings`
- `GET|PUT /.netlify/functions/admin-settings`

Authenticated endpoints require the bearer token returned by `admin-login`. Tokens are signed with `ADMIN_SESSION_SECRET` and expire after eight hours.

## Validation and production build

```powershell
npm run build
npm test
```

`npm run build` regenerates the static service pages and sitemap, then performs syntax checks on the browser and function JavaScript. `npm test` validates the handover-critical project structure, seed data, and environment template.

The site has no compiled asset directory: the Netlify publish directory is the repository root (`.`). Do not remove source HTML, CSS, JavaScript, generated service pages, SEO files, or referenced assets from a production package.

## Deployment

### Continuous deployment from GitHub

1. Create or select a Netlify project connected to this repository.
2. Set the build command to `npm run build`.
3. Keep the publish directory as `.` and functions directory as `netlify/functions`; both are also declared in `netlify.toml`.
4. Add all required environment variables in Netlify.
5. Deploy the production branch.
6. Attach the custom domain and verify that `/`, `/book`, `/admin`, and a generated `/services/<service-id>` URL load successfully.

### Existing/manual Netlify workflow

For the existing project, first run the production checks, then deploy from the repository root with the linked Netlify account:

```powershell
npm ci
npm run build
npx netlify deploy --prod --dir . --functions netlify/functions
```

The `.netlifyignore` file prevents local credentials, installed dependencies, Git metadata, and release archives from being uploaded. The Google Search Console verification file in the repository root is a required production asset.

## Development notes

- Treat `data/services.json` as the source for a fresh installation; the live catalogue may differ after admin edits.
- Preserve service IDs because booking links and generated SEO URLs depend on them.
- Run `npm run build` after changing service data, service-page markup, or SEO generation logic.
- Keep `data/**` available to Netlify Functions; `netlify.toml` includes it in function bundles.
- Keep all secrets server-side. Browser code should only receive short-lived admin bearer tokens after a successful login.
- Test responsive changes on the public home page, booking flow, service detail page, and administration panel before deployment.

## Handover checklist

Before releasing a change:

1. Run `npm ci`, `npm run build`, and `npm test`.
2. Review `git status` and confirm that `.env`, `.netlify/`, `node_modules/`, screenshots, and archives are not staged.
3. Confirm that no credentials or tokens appear in the diff.
4. Verify the generated service pages and sitemap are included when service data changes.
5. Deploy to Netlify and smoke-test the public pages, functions, booking flow, and admin login.
