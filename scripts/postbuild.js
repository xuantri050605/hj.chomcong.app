/**
 * Post-build verification and asset injection
 * 1. Sanitizes asset URLs and manifests in web-build for GitHub Pages subpath (/hj.chomcong.app/).
 * 2. Injects unique build marker (Git commit SHA & timestamp) for production verification.
 * 3. Generates 404.html for GitHub Pages SPA client-side routing fallback.
 * 4. Generates health.json and build-marker.json.
 * 5. Runs automated verification ensuring zero root-relative broken paths.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { verifySubpathAssets } = require('./verify-subpath-assets');

const targetDir = path.join(__dirname, '..', 'web-build');
const EXPECTED_SUBPATH = '/hj.chomcong.app/';

if (!fs.existsSync(targetDir)) {
  console.error('Error: web-build directory does not exist. Run build first.');
  process.exit(1);
}

// 0. Resolve Git commit SHA for build marker
let gitCommit = process.env.GITHUB_SHA || 'local-build';
try {
  gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch {
  // fallback to env or local
}

const buildTimestamp = new Date().toISOString();

// 1. Sanitize index.html: normalize Windows backslashes in URLs & inject build marker
const indexPath = path.join(targetDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let indexHtml = fs.readFileSync(indexPath, 'utf8');

  // Replace any href="\..." or src="\..." backslashes with forward slashes
  indexHtml = indexHtml.replace(/(href|src)=["']\\([^"']+)["']/g, (match, attr, val) => {
    const fixed = val.replace(/\\/g, '/');
    return `${attr}="/${fixed}"`;
  });

  // Also replace any href="/hj.chomcong.app\..." backslashes
  indexHtml = indexHtml.replace(/(href|src)=["'](\/[^"']*)["']/g, (match, attr, val) => {
    const fixed = val.replace(/\\/g, '/');
    return `${attr}="${fixed}"`;
  });

  // Inject build marker meta tags before </head> if not already present
  if (!indexHtml.includes('name="build-commit"')) {
    const markerMeta = `<meta name="build-commit" content="${gitCommit}"/><meta name="build-time" content="${buildTimestamp}"/>`;
    indexHtml = indexHtml.replace('</head>', `${markerMeta}</head>`);
  }

  fs.writeFileSync(indexPath, indexHtml, 'utf8');
  console.log('✓ Successfully sanitized HTML asset paths and injected build marker in index.html');

  // 2. Generate 404.html for GitHub Pages SPA routing fallback
  const notFoundPath = path.join(targetDir, '404.html');
  fs.writeFileSync(notFoundPath, indexHtml, 'utf8');
  console.log('✓ Successfully created 404.html for GitHub Pages SPA routing');
}

// 3. Sanitize manifest.json: ensure start_url and scope use subpath
const manifestPath = path.join(targetDir, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!manifest.start_url || manifest.start_url === '/?utm_source=web_app_manifest' || manifest.start_url === '/') {
      manifest.start_url = `${EXPECTED_SUBPATH}?utm_source=web_app_manifest`;
    }
    if (!manifest.scope || manifest.scope === '/') {
      manifest.scope = EXPECTED_SUBPATH;
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log('✓ Successfully configured manifest.json for subpath');
  } catch (err) {
    console.warn('Warning: Could not update manifest.json:', err.message);
  }
}

// 4. Generate health.json & build-marker.json
const healthData = {
  status: 'healthy',
  timestamp: buildTimestamp,
  version: '0.1.0',
  commit: gitCommit,
  service: 'cham-cong-payroll-app',
  environment: 'production',
  subpath: EXPECTED_SUBPATH,
};

fs.writeFileSync(path.join(targetDir, 'health.json'), JSON.stringify(healthData, null, 2), 'utf8');
console.log('✓ Successfully generated health.json in web-build');

const buildMarkerData = {
  commit: gitCommit,
  buildTimestamp,
  subpath: EXPECTED_SUBPATH,
  verified: true,
};

fs.writeFileSync(path.join(targetDir, 'build-marker.json'), JSON.stringify(buildMarkerData, null, 2), 'utf8');
console.log('✓ Successfully generated build-marker.json in web-build');

// 5. Automated verification: assert all referenced assets are correct
const verification = verifySubpathAssets({
  buildDir: targetDir,
  expectedSubpath: EXPECTED_SUBPATH,
});

if (!verification.success) {
  console.error('\n❌ Sub-path asset verification FAILED:');
  verification.errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
}

console.log(`✓ Automated sub-path verification PASSED (${verification.verifiedAssets.length} assets checked).`);
