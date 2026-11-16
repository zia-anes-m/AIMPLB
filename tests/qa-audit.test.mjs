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
    'AIMPLB_logo.png',
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

test('9. Simulate Role (Demo) Completely Removed', () => {
  const sidebar = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'layout', 'Sidebar.tsx'), 'utf-8');

  // Verify demo role simulation section is completely removed
  assert.doesNotMatch(sidebar, /Simulate Role/i);
  assert.doesNotMatch(sidebar, /demoRoles/);
  assert.doesNotMatch(sidebar, /switchRole/);

  // User profile and role remain visible
  assert.match(sidebar, /currentUser\?\.full_name/);
  assert.match(sidebar, /currentUser\?\.role/);
  assert.match(sidebar, /handleLogout/);
});

test('10. Dashboard Summary Cards Redesign & Full Title Visibility', () => {
  const statCard = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'common', 'StatCard.tsx'), 'utf-8');

  // Title must not be truncated with ellipses
  assert.doesNotMatch(statCard, /uppercase truncate/);
  assert.match(statCard, /break-words/);

  // Dashboards must have full titles without artificial abbreviations
  const transportDashboard = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'transportation', 'TransportationDashboard.tsx'), 'utf-8');
  assert.match(transportDashboard, /title="Arrivals Pending"/);
  assert.match(transportDashboard, /title="Departures Pending"/);
  assert.doesNotMatch(transportDashboard, /title="Arrivals Pend\."/);
  assert.doesNotMatch(transportDashboard, /title="Departures Pend\."/);

  const foodDashboard = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'food', 'FoodDashboard.tsx'), 'utf-8');
  assert.match(foodDashboard, /title="Arrangements Pending"/);
  assert.doesNotMatch(foodDashboard, /title="Arrang\. Pending"/);
});

test('11. City & State Visibility Restrictions Removed', () => {
  const apiTs = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', 'api.ts'), 'utf-8');

  // city and state must NOT be redacted to [Restricted]
  assert.doesNotMatch(apiTs, /city:\s*'\[Restricted\]'/);
  assert.doesNotMatch(apiTs, /state:\s*'\[Restricted\]'/);

  // address remains restricted for non-admin
  assert.match(apiTs, /address:\s*'\[Restricted\]'/);

  // Invitee detail page renders city & state for all users
  const detailPage = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'invitees', 'InviteeDetailPage.tsx'), 'utf-8');
  assert.match(detailPage, /invitee\.city/);
  assert.match(detailPage, /invitee\.state/);
});

test('12. Mobile Bottom Navigation Layout & Department Scoping', () => {
  const mobileNav = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'layout', 'MobileNav.tsx'), 'utf-8');

  // Depts / My Dept button must be completely removed
  assert.doesNotMatch(mobileNav, /My Dept/);
  assert.doesNotMatch(mobileNav, /getMyDeptRoute/);
  assert.doesNotMatch(mobileNav, /Briefcase/);

  // Must have Invitees, Dashboard, and More buttons
  assert.match(mobileNav, /<span>Invitees<\/span>/);
  assert.match(mobileNav, /<span>Dashboard<\/span>/);
  assert.match(mobileNav, /<span>More<\/span>/);

  // Admin order: Invitees -> Dashboard -> More
  // Non-admin order: Dashboard -> Invitees -> More
  assert.match(mobileNav, /isAdmin\s*\?\s*\(\s*<>\s*\{inviteesButton\}\s*\{dashboardButton\}\s*\{moreButton\}\s*<\/>\s*\)\s*:\s*\(\s*<>\s*\{dashboardButton\}\s*\{inviteesButton\}\s*\{moreButton\}\s*<\/>\s*\)/);
});

test('13. Phase 2: Category-Based Invitee IDs & Dedicated ID Card Remarks', () => {
  const apiTs = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', 'api.ts'), 'utf-8');
  const mockDataTs = fs.readFileSync(path.join(ROOT_DIR, 'src', 'lib', 'mockData.ts'), 'utf-8');
  const typesTs = fs.readFileSync(path.join(ROOT_DIR, 'src', 'types', 'index.ts'), 'utf-8');
  const migrationSql = fs.readFileSync(path.join(ROOT_DIR, 'supabase', 'migrations', '006_category_ids_qr_and_id_cards.sql'), 'utf-8');

  // Types support id_card_remarks and qr_token
  assert.match(typesTs, /id_card_remarks\?: string \| null;/);
  assert.match(typesTs, /qr_token\?: string \| null;/);

  // Category prefix logic
  assert.match(apiTs, /AIM-F-/);
  assert.match(apiTs, /AIM-G-/);
  assert.match(apiTs, /AIM-S-/);

  // Migration creates dedicated category sequences
  assert.match(migrationSql, /CREATE SEQUENCE IF NOT EXISTS invitee_founder_seq/);
  assert.match(migrationSql, /CREATE SEQUENCE IF NOT EXISTS invitee_general_seq/);
  assert.match(migrationSql, /CREATE SEQUENCE IF NOT EXISTS invitee_special_seq/);

  // Migration creates separate id_card_remarks column
  assert.match(migrationSql, /id_card_remarks TEXT/);

  // Mock data contains valid category IDs
  assert.match(mockDataTs, /invitee_code:\s*'AIM-F-001'/);
  assert.match(mockDataTs, /invitee_code:\s*'AIM-G-001'/);
  assert.match(mockDataTs, /invitee_code:\s*'AIM-S-001'/);
});

test('14. Phase 3: QR Code Non-PII Token & Dual-Mode Scanner Validation', () => {
  const apiTs = fs.readFileSync(path.join(ROOT_DIR, 'src', 'services', 'api.ts'), 'utf-8');
  const scannerTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'reception', 'QRScannerModal.tsx'), 'utf-8');
  const receptionTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'reception', 'ReceptionDashboard.tsx'), 'utf-8');

  // Secure QR Token does not encode PII
  assert.match(apiTs, /generateSecureQrToken/);
  assert.match(apiTs, /AIM-SEC-/);

  // Reception dashboard offers prominent SCAN IN and SCAN OUT modes
  assert.match(receptionTsx, /SCAN IN/);
  assert.match(receptionTsx, /SCAN OUT/);
  assert.match(receptionTsx, /setScannerMode\('IN'\)/);
  assert.match(receptionTsx, /setScannerMode\('OUT'\)/);

  // Scanner modal has dual modes and camera + manual lookup
  assert.match(scannerTsx, /scanMode === 'IN'/);
  assert.match(scannerTsx, /scanMode === 'OUT'/);
  assert.match(scannerTsx, /Html5Qrcode/);
  assert.match(scannerTsx, /manual/);

  // Prevention of duplicate IN and invalid OUT operations
  assert.match(apiTs, /Duplicate Scan Blocked: Delegate is already checked IN/);
  assert.match(apiTs, /Invalid Scan OUT: Delegate is not currently inside venue/);
});

test('15. Phase 4: Live Event Occupancy Telemetry Dashboard', () => {
  const adminTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'admin', 'AdminDashboard.tsx'), 'utf-8');

  // Live Occupancy Telemetry section
  assert.match(adminTsx, /Live Event Venue Occupancy & Telemetry/);

  // 6 Required Metrics
  assert.match(adminTsx, /title="Total Registered"/);
  assert.match(adminTsx, /title="Currently Inside"/);
  assert.match(adminTsx, /title="Currently Outside"/);
  assert.match(adminTsx, /title="Unique Attendees"/);
  assert.match(adminTsx, /title="Venue IN Moves"/);
  assert.match(adminTsx, /title="Venue OUT Moves"/);

  // Realtime updates & 15s refresh interval
  assert.match(adminTsx, /aimplb_db_update/);
  assert.match(adminTsx, /setInterval/);
  assert.match(adminTsx, /postgres_changes/);
});

test('16. Phase 5: Daily & Individual Movement Reports & IST Timezone', () => {
  const reportsTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'admin', 'ReportsPage.tsx'), 'utf-8');
  const utilsTs = fs.readFileSync(path.join(ROOT_DIR, 'src', 'lib', 'utils.ts'), 'utf-8');

  // Reports tabs include Daily Movement and Individual Audit
  assert.match(reportsTsx, /id:\s*'movement_daily_consolidated'/);
  assert.match(reportsTsx, /id:\s*'movement_individual'/);

  // Daily report covers 14, 15, 16 Dec 2026
  assert.match(reportsTsx, /2026-12-14/);
  assert.match(reportsTsx, /2026-12-15/);
  assert.match(reportsTsx, /2026-12-16/);

  // Metrics: Total registered, unique attendees, inside/outside, movements, no-shows, inconsistent records
  assert.match(reportsTsx, /Registered Invitees Never Checked In/);
  assert.match(reportsTsx, /Inconsistent \/ Audit Corrected Records/);

  // IST Timezone enforcement in utils
  assert.match(utilsTs, /timeZone:\s*'Asia\/Kolkata'/);
});

test('17. Phase 6: Invitee ID Card Layout & Specifications', () => {
  const idCardTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'id-cards', 'InviteeIDCard.tsx'), 'utf-8');
  const idCardPageTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'admin', 'IDCardManagementPage.tsx'), 'utf-8');

  // Official logo
  assert.match(idCardTsx, /\/AIMPLB_logo\.png/);

  // Event details
  assert.match(idCardTsx, /All India Muslim Personal Law Board/);
  assert.match(idCardTsx, /30th Annual Session/);
  assert.match(idCardTsx, /14–16 December 2026/);
  assert.match(idCardTsx, /Hajj House, Chennai/);

  // Invitee details
  assert.match(idCardTsx, /invitee\.full_name/);
  assert.match(idCardTsx, /invitee\.invitee_code/);
  assert.match(idCardTsx, /invitee\.city/);
  assert.match(idCardTsx, /invitee\.state/);
  assert.match(idCardTsx, /invitee\.phone/);

  // Dedicated ID Card Remarks (Decoupled from internal remarks)
  assert.match(idCardTsx, /invitee\.id_card_remarks/);
  assert.doesNotMatch(idCardTsx, /invitee\.remarks\b/);

  // Strictly no photo upload / profile image
  assert.doesNotMatch(idCardTsx, /photo_url/);
  assert.doesNotMatch(idCardTsx, /avatar/);

  // Bulk print and category filter support
  assert.match(idCardPageTsx, /Bulk Print/);
  assert.match(idCardPageTsx, /selectedCategory/);
});

test('18. Phase 7: Row Level Security & Migration Schema Integrity', () => {
  const migrationSql = fs.readFileSync(path.join(ROOT_DIR, 'supabase', 'migrations', '006_category_ids_qr_and_id_cards.sql'), 'utf-8');

  assert.match(migrationSql, /ALTER TABLE public\.event_attendance ENABLE ROW LEVEL SECURITY/);
  assert.match(migrationSql, /CREATE POLICY "Authenticated users can view event attendance"/);
  assert.match(migrationSql, /CREATE POLICY "Reception and Admin can record gate attendance"/);
  assert.match(migrationSql, /CREATE POLICY "Admin and Reception supervisors can correct attendance"/);
  assert.match(migrationSql, /CREATE POLICY "Only Admin can delete attendance records"/);
});

test('19. ID Card Print Isolation, Standardized 90mm x 140mm Dimensions & Hierarchy', () => {
  const idCardTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'id-cards', 'InviteeIDCard.tsx'), 'utf-8');
  const idCardPageTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'admin', 'IDCardManagementPage.tsx'), 'utf-8');
  const indexCss = fs.readFileSync(path.join(ROOT_DIR, 'src', 'index.css'), 'utf-8');

  // 1. Standardized 90mm x 140mm exact dimensions
  assert.match(idCardTsx, /width:\s*'90mm'/);
  assert.match(idCardTsx, /height:\s*'140mm'/);
  assert.match(indexCss, /@page\s*\{\s*size:\s*90mm\s*140mm;\s*margin:\s*0;\s*\}/);

  // 2. Print isolation: #root & modals hidden, only isolated portal shown
  assert.match(indexCss, /body\.aimplb-printing-id-card #root\s*\{\s*display:\s*none !important;/);
  assert.match(indexCss, /body\.aimplb-printing-id-card #aimplb-print-isolated-root\s*\{\s*display:\s*block !important;/);
  assert.match(idCardPageTsx, /aimplb-print-isolated-root/);
  assert.match(idCardPageTsx, /createPortal/);

  // 3. Logo alignment: object-fit contain, original aspect ratio preserved
  assert.match(idCardTsx, /objectFit:\s*'contain'/);
  assert.doesNotMatch(idCardTsx, /rounded-full/);

  // 4. Upper section event hierarchy: Event Date and Venue appear above category and name
  const dateIdx = idCardTsx.indexOf('14–16 December 2026');
  const venueIdx = idCardTsx.indexOf('Hajj House, Chennai');
  const nameIdx = idCardTsx.indexOf('{invitee.full_name}');
  assert.ok(dateIdx > 0, 'Date must be present');
  assert.ok(venueIdx > 0, 'Venue must be present');
  assert.ok(nameIdx > 0, 'Name must be present');
  assert.ok(dateIdx < nameIdx, 'Event date must appear before invitee personal name in JSX');
  assert.ok(venueIdx < nameIdx, 'Event venue must appear before invitee personal name in JSX');

  // 5. Unnecessary elements removed: "OFFICIAL SESSION PASS" and "NON-TRANSFERABLE"
  assert.doesNotMatch(idCardTsx, /OFFICIAL SESSION PASS/i);
  assert.doesNotMatch(idCardTsx, /NON-TRANSFERABLE/i);
});

test('20. Refined ID Card Design: Logo Left Alignment, Dedicated Remarks, QR Labeling & Responsive Layout', () => {
  const idCardTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'id-cards', 'InviteeIDCard.tsx'), 'utf-8');
  const idCardPageTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'pages', 'admin', 'IDCardManagementPage.tsx'), 'utf-8');

  // 1. Logo placed on the LEFT side of header with org & session titles beside it
  assert.match(idCardTsx, /img\s+src="\/AIMPLB_logo\.png"/);
  assert.match(idCardTsx, /objectFit:\s*'contain'/);
  assert.match(idCardTsx, /All India Muslim Personal Law Board/i);
  assert.match(idCardTsx, /30th Annual Session – Chennai/i);

  // 2. Clear QR Code Description Labels centered below QR
  assert.match(idCardTsx, /OFFICIAL GATE PASS/);
  assert.match(idCardTsx, /SCAN FOR ENTRY VERIFICATION/);

  // 3. Dedicated Remarks section ALWAYS displayed (mobile + laptop)
  assert.match(idCardTsx, /REMARKS:/);
  assert.match(idCardTsx, /displayRemarks/);
  assert.match(idCardTsx, /wordBreak:\s*'break-word'/);

  // 4. Overlap prevention on desktop screen: flex-wrap with 90mm clearance
  assert.match(idCardPageTsx, /flex flex-wrap justify-center gap-8/);
  assert.match(idCardPageTsx, /style=\{\{\s*width:\s*'90mm'\s*\}\}/);
});

test('21. ID Card Design Refinements: Enlarged QR Code (32-38mm), Consistent Rounded Corners & Empty Space Elimination', () => {
  const idCardTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'id-cards', 'InviteeIDCard.tsx'), 'utf-8');

  // 1. Enlarged QR Code target (35mm inside 39mm container with quiet zone)
  assert.match(idCardTsx, /width:\s*'35mm',\s*height:\s*'35mm'/);
  assert.match(idCardTsx, /width:\s*'39mm',\s*height:\s*'39mm'/);

  // 2. Consistent Rounded Corners across UI elements
  assert.match(idCardTsx, /borderRadius:\s*'4\.5mm'/); // Main card border
  assert.match(idCardTsx, /borderTopLeftRadius:\s*'3\.3mm'/); // Header top-left
  assert.match(idCardTsx, /borderTopRightRadius:\s*'3\.3mm'/); // Header top-right
  assert.match(idCardTsx, /borderRadius:\s*'2\.5mm'/); // Category & ID & Remarks
  assert.match(idCardTsx, /borderRadius:\s*'3\.5mm'/); // QR container

  // 3. Compact space-between vertical distribution eliminating empty white space
  assert.match(idCardTsx, /justifyContent:\s*'space-between'/);
  assert.match(idCardTsx, /OFFICIAL GATE PASS/);
  assert.match(idCardTsx, /SCAN FOR ENTRY VERIFICATION/);
});

test('22. QR Scanner Camera Robustness: HTTPS Check, Error Classification, Rear Camera Fallback & Cooldown', () => {
  const scannerTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'reception', 'QRScannerModal.tsx'), 'utf-8');
  const viteConfig = fs.readFileSync(path.join(ROOT_DIR, 'vite.config.ts'), 'utf-8');

  // 1. Vite HTTPS development plugin configured
  assert.match(viteConfig, /basicSsl/);

  // 2. Insecure connection / HTTPS verification
  assert.match(scannerTsx, /checkIsSecureOrigin/);
  assert.match(scannerTsx, /INSECURE_CONNECTION/);
  assert.match(scannerTsx, /Switch to HTTPS/);

  // 3. Granular error classification
  assert.match(scannerTsx, /PERMISSION_DENIED/);
  assert.match(scannerTsx, /NOT_FOUND/);
  assert.match(scannerTsx, /IN_USE/);
  assert.match(scannerTsx, /GENERAL_ERROR/);
  assert.match(scannerTsx, /Retry Camera/);

  // 4. Rear camera preference and enumeration fallback
  assert.match(scannerTsx, /facingMode:\s*'environment'/);
  assert.match(scannerTsx, /Html5Qrcode\.getCameras/);

  // 5. Duplicate scan prevention & cooldown
  assert.match(scannerTsx, /lastScannedCodeRef/);
  assert.match(scannerTsx, /lastScannedTimeRef/);

  // 6. Manual lookup fallback preserved
  assert.match(scannerTsx, /Manual ID \/ Phone Lookup/);
  assert.match(scannerTsx, /handleManualSubmit/);
});


