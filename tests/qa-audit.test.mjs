import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('1. Metadata, SEO & Social Sharing Tags', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');

  // Title & Descriptions
  assert.match(indexHtml, /<title>AIMPLB 30th Annual Session \| Chennai 2026<\/title>/);
  assert.match(indexHtml, /name="description"/);
  
  // Canonical & OpenGraph
  assert.match(indexHtml, /rel="canonical" href="https:\/\/aimplb\.vercel\.app\/"/);
  assert.match(indexHtml, /property="og:title"/);
  assert.match(indexHtml, /property="og:description"/);
  assert.match(indexHtml, /property="og:url" content="https:\/\/aimplb\.vercel\.app\/"/);
  assert.match(indexHtml, /property="og:image" content="https:\/\/aimplb\.vercel\.app\/icon-512\.png"/);

  // Twitter / X
  assert.match(indexHtml, /name="twitter:card" content="summary_large_image"/);
  assert.match(indexHtml, /name="twitter:title"/);
  assert.match(indexHtml, /name="twitter:image"/);

  // Robots & Sitemap files
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'public', 'robots.txt')), 'robots.txt must exist');
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'public', 'sitemap.xml')), 'sitemap.xml must exist');
  
  const robots = fs.readFileSync(path.join(ROOT_DIR, 'public', 'robots.txt'), 'utf-8');
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Sitemap: https:\/\/aimplb\.vercel\.app\/sitemap\.xml/);
});

test('2. PWA Manifest, Service Worker & Web App Icons', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');
  assert.match(indexHtml, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(indexHtml, /name="theme-color" content="#164734"/);
  assert.match(indexHtml, /rel="apple-touch-icon"/);
  assert.match(indexHtml, /rel="shortcut icon" href="\/favicon\.ico"/);

  // Manifest validation
  const manifestPath = path.join(ROOT_DIR, 'public', 'manifest.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert.equal(manifest.name, 'AIMPLB 30th Annual Session');
  assert.equal(manifest.short_name, 'AIMPLB 2026');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#164734');
  assert.ok(manifest.icons.length >= 4, 'Manifest must have at least 4 icons');

  // Service Worker validation
  const swPath = path.join(ROOT_DIR, 'public', 'sw.js');
  assert.ok(fs.existsSync(swPath), 'sw.js must exist');
  const swContent = fs.readFileSync(swPath, 'utf-8');
  assert.match(swContent, /addEventListener\('install'/);
  assert.match(swContent, /addEventListener\('activate'/);
  assert.match(swContent, /addEventListener\('fetch'/);

  // Physical Icon files
  const requiredIcons = [
    'favicon.ico',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'apple-touch-icon.png',
    'apple-touch-icon-precomposed.png',
    'icon-192.png',
    'icon-512.png',
    'maskable-icon-512.png',
    'new_logo.png',
    'logo.png',
  ];
  for (const icon of requiredIcons) {
    const iconPath = path.join(ROOT_DIR, 'public', icon);
    assert.ok(fs.existsSync(iconPath), `Icon ${icon} must exist in public/`);
    assert.ok(fs.statSync(iconPath).size > 0, `Icon ${icon} must not be empty`);
  }
});

test('3. Landing Page Semantic Hierarchy & Urdu RTL Formatting', () => {
  const landingPage = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'LandingPage.tsx'), 'utf-8');

  // Heading hierarchy
  assert.match(landingPage, /<h1/);
  assert.match(landingPage, /آل انڈیا مسلم پرسنل لا بورڈ/);
  assert.match(landingPage, /All India Muslim Personal Law Board/);
  assert.match(landingPage, /dir="rtl"/);
  assert.match(landingPage, /lang="ur"/);
  assert.match(landingPage, /font-urdu/);

  // Subtitle (H2) and Details
  assert.match(landingPage, /<h2/);
  assert.match(landingPage, /30th/);
  assert.match(landingPage, /Annual Session/);
  assert.match(landingPage, /14, 15 and 16 December 2026/);
  assert.match(landingPage, /Hajj House, Chennai, Tamil Nadu, India/);

  // Ensure removed cards are not present
  assert.doesNotMatch(landingPage, />Session Dates</);
  assert.doesNotMatch(landingPage, />Official Venue</);
  assert.doesNotMatch(landingPage, />Organization</);
});

test('4. Route Stability & Mobile Public Entry Loading', () => {
  const routesContent = fs.readFileSync(path.join(ROOT_DIR, 'src', 'routes', 'AppRoutes.tsx'), 'utf-8');

  // Verify critical public pages are statically imported to prevent mobile blank screens
  assert.match(routesContent, /import \{ LandingPage \} from '@\/pages\/LandingPage'/);
  assert.match(routesContent, /import \{ LoginPage \} from '@\/pages\/LoginPage'/);
  assert.match(routesContent, /import \{ UnauthorizedPage \} from '@\/pages\/UnauthorizedPage'/);
  assert.match(routesContent, /import \{ NotFoundPage \} from '@\/pages\/NotFoundPage'/);

  // Department routes are properly defined
  assert.match(routesContent, /path="\/invitees"/);
  assert.match(routesContent, /path="\/transportation"/);
  assert.match(routesContent, /path="\/accommodation"/);
  assert.match(routesContent, /path="\/food"/);
  assert.match(routesContent, /path="\/reception"/);
  assert.match(routesContent, /path="\/meeting-hall"/);
  assert.match(routesContent, /path="\/admin\/dashboard"/);
  assert.match(routesContent, /path="\/admin\/reports"/);
});

test('5. Admin Login Default Routing Logic', () => {
  const authContext = fs.readFileSync(path.join(ROOT_DIR, 'src', 'context', 'AuthContext.tsx'), 'utf-8');

  // Admin should land on centralized invitees page
  assert.match(authContext, /case 'Admin':\s*return '\/invitees'/);
  assert.match(authContext, /case 'Transportation Team':\s*return '\/transportation\/dashboard'/);
  assert.match(authContext, /case 'Accommodation Team':\s*return '\/accommodation\/dashboard'/);
  assert.match(authContext, /case 'Food Team':\s*return '\/food\/dashboard'/);
  assert.match(authContext, /case 'Reception Team':\s*return '\/reception\/dashboard'/);
  assert.match(authContext, /case 'Meeting Hall Team':\s*return '\/meeting-hall\/dashboard'/);
});

test('6. Tailwind Configuration & Theme Palette Sanity', () => {
  const tailwindConfig = fs.readFileSync(path.join(ROOT_DIR, 'tailwind.config.js'), 'utf-8');

  // Verify no non-ASCII typos in color codes
  assert.doesNotMatch(tailwindConfig, /#C5DECة/);
  assert.match(tailwindConfig, /#C5DEC8/);
  assert.match(tailwindConfig, /#164734/); // Institutional green
});

test('7. Reports Page Module Stability & Tab Switching', () => {
  const reportsPage = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'admin', 'ReportsPage.tsx'), 'utf-8');

  // Verify all 9 tabs exist
  const expectedTabs = [
    'invitees_all',
    'invitees_contacts',
    'transport_arrivals',
    'transport_departures',
    'accommodation_hotels',
    'accommodation_hajj_house',
    'food_daily',
    'reception_summary',
    'seating_chart',
  ];
  for (const tab of expectedTabs) {
    assert.ok(reportsPage.includes(`selectedReport === '${tab}'`), `Report view for ${tab} must be handled`);
  }
});

test('8. Error Boundary & Safe Storage Fallbacks', () => {
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'src', 'components', 'common', 'ErrorBoundary.tsx')));
  assert.ok(fs.existsSync(path.join(ROOT_DIR, 'src', 'lib', 'safeStorage.ts')));

  const mainTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'main.tsx'), 'utf-8');
  assert.match(mainTsx, /<ErrorBoundary>/);
});

