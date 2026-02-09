# liveneon.org Website

Static landing page for NEON-SOUL at [liveneon.org](https://liveneon.org).

## Local Development

No build step required. Serve the website directory directly.

### Option 1: npx serve (recommended)

```bash
npx serve website/
```

Then open http://localhost:3000 in your browser.

### Option 2: Python http.server

```bash
cd website
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

### Option 3: VS Code Live Server

1. Install the "Live Server" extension
2. Right-click `website/index.html`
3. Select "Open with Live Server"

## Deployment (Railway.com)

The site is deployed to Railway.com with automatic HTTPS.

### Initial Setup

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Create a new project:
   ```bash
   railway init
   ```
   Or link to an existing project:
   ```bash
   railway link
   ```

### Deploy

From the project root:

```bash
railway up
```

Railway uses the `railway.json` configuration to serve the static site.

### Custom Domain Setup

1. In Railway dashboard, go to project settings
2. Add custom domain: `liveneon.org`
3. Railway will provide a CNAME target (e.g., `your-project.up.railway.app`)

### DNS Configuration

Configure these records with your domain registrar:

**For apex domain (liveneon.org):**
- Type: CNAME
- Name: `@` or `liveneon.org`
- Target: `[your-project].up.railway.app`

Note: Some registrars don't support CNAME on apex domains. In that case:
- Use ALIAS record if available, OR
- Use a redirect service, OR
- Consider using www as the primary domain

**For www subdomain:**
- Type: CNAME
- Name: `www`
- Target: `[your-project].up.railway.app`

**www Redirect:**
Configure HTTP 301 redirect from www.liveneon.org to liveneon.org:
1. In Railway dashboard, go to your service settings
2. Under "Custom Domains", add both domains
3. Set the apex domain (liveneon.org) as primary
4. Railway will automatically redirect www to apex

### Verify Deployment

After deployment, verify:

1. **Site accessible**: https://liveneon.org
2. **HTTPS working**: Certificate auto-provisioned via Let's Encrypt
3. **www redirect**: https://www.liveneon.org redirects to https://liveneon.org (HTTP 301)
4. **SEO files accessible**:
   - https://liveneon.org/robots.txt
   - https://liveneon.org/sitemap.xml

## Post-Deploy Checklist

After deploying, complete these verification steps:

### Social Preview Cards

Test how the site appears when shared on social media:

1. **General preview** (OG tags):
   - Visit [opengraph.xyz](https://opengraph.xyz)
   - Enter: `https://liveneon.org`
   - Verify title, description, and image appear correctly

2. **Twitter/X Card**:
   - Visit [Twitter Card Validator](https://cards-dev.twitter.com/validator)
   - Enter: `https://liveneon.org`
   - Verify large image card renders

3. **LinkedIn Preview**:
   - Visit [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
   - Enter: `https://liveneon.org`
   - Verify preview renders correctly

### Uptime Monitoring

Set up basic uptime monitoring:

1. **UptimeRobot** (free tier):
   - Visit [uptimerobot.com](https://uptimerobot.com)
   - Create account, add new monitor
   - URL: `https://liveneon.org`
   - Check interval: 5 minutes
   - Alert contacts: your email

2. **Alternative options**:
   - [Better Uptime](https://betteruptime.com)
   - [Pingdom](https://www.pingdom.com)
   - [StatusCake](https://www.statuscake.com)

### Performance Verification

Run Lighthouse audit:

```bash
# Using Chrome DevTools
# 1. Open https://liveneon.org in Chrome
# 2. Open DevTools (F12)
# 3. Go to Lighthouse tab
# 4. Run audit (Performance, Accessibility, SEO)
# Target: 90+ on all categories
```

Or use online tool: [PageSpeed Insights](https://pagespeed.web.dev/)

## SEO Files

The site includes these SEO-related files:

| File | Purpose |
|------|---------|
| `robots.txt` | Allows all crawlers, points to sitemap |
| `sitemap.xml` | Single-page sitemap for search engines |
| `assets/favicon.svg` | Browser tab icon (SVG format) |
| JSON-LD in index.html | Organization schema for rich snippets |

## File Structure

```
website/
├── index.html          # Single page with JSON-LD schema
├── railway.json        # Railway deployment config
├── robots.txt          # Crawler permissions
├── sitemap.xml         # Sitemap for search engines
├── README.md           # This file
├── styles/
│   ├── variables.css   # Design tokens
│   ├── base.css        # Reset and typography
│   ├── layout.css      # Page structure
│   ├── components.css  # UI components
│   └── animations.css  # Motion effects
└── assets/
    ├── favicon.svg     # Browser favicon
    ├── og-image.svg    # Social preview image
    ├── architecture-diagram.svg
    └── fonts/          # Self-hosted fonts
```

## Performance Budget

| Resource | Budget |
|----------|--------|
| Total page weight | <500KB |
| Critical CSS | <14KB |
| Fonts | <150KB |
| Images | <200KB |
| JavaScript | <50KB |

Target: <2s load on 3G, Lighthouse 90+

## Cache Busting

CSS files use query string versioning:

```html
<link rel="stylesheet" href="styles/variables.css?v=1.0">
```

When deploying updates, increment the version number in `index.html`:

```html
<link rel="stylesheet" href="styles/variables.css?v=1.1">
```

## Related

- [NEON-SOUL README](../README.md)
- [Implementation Plan](../docs/plans/2026-02-08-liveneon-landing-page.md)
