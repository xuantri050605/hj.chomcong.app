/**
 * Post-build verification and asset injection
 * 1. Sanitizes asset URLs and manifests in web-build for GitHub Pages subpath (/hj.chomcong.app/).
 * 2. Normalizes index.html (rewrites /static/, /_expo/, /manifest.json, /index.html to /hj.chomcong.app/...).
 * 3. Normalizes asset-manifest.json (all files and entrypoints).
 * 4. Normalizes manifest.json (start_url and scope).
 * 5. Normalizes static/js/*.js bundles (Webpack publicPath .p="/").
 * 6. Generates 404.html for GitHub Pages SPA client-side routing fallback.
 * 7. Injects build marker (Git commit SHA & timestamp) and generates health.json, build-marker.json.
 * 8. Runs automated verification ensuring zero root-relative broken paths.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { verifySubpathAssets } = require('./verify-subpath-assets');

const EXPECTED_SUBPATH = '/hj.chomcong.app/';

/**
 * Normalizes an individual asset URL to ensure it starts with /hj.chomcong.app/
 */
function normalizeSubpathUrl(rawUrl, subpath = EXPECTED_SUBPATH) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;

  // External URLs, protocol-relative, data URIs, anchor hashes, javascript:, mailto:, tel:
  if (/^(https?:|\/\/|data:|blob:|javascript:|mailto:|tel:|#)/i.test(rawUrl)) {
    return rawUrl;
  }

  // Normalize Windows backslashes
  let url = rawUrl.replace(/\\/g, '/');

  // Strip trailing slash from subpath prefix helper if needed
  const cleanSubpath = subpath.endsWith('/') ? subpath.slice(0, -1) : subpath;

  // If already starts with /hj.chomcong.app/
  if (url.startsWith(`${cleanSubpath}/`)) {
    // Collapse any duplicate prefixes
    while (url.includes(`${cleanSubpath}${cleanSubpath}`)) {
      url = url.replace(`${cleanSubpath}${cleanSubpath}`, cleanSubpath);
    }
    return url;
  }

  // If it is exact match /hj.chomcong.app
  if (url === cleanSubpath) {
    return `${cleanSubpath}/`;
  }

  // If it starts with /hj.chomcong.app?param or /hj.chomcong.app#hash
  if (url.startsWith(`${cleanSubpath}?`) || url.startsWith(`${cleanSubpath}#`)) {
    return url;
  }

  // If starts with root slash /
  if (url.startsWith('/')) {
    return `${cleanSubpath}${url}`;
  }

  // If relative path without ./ or ../ (e.g. static/js/..., manifest.json)
  if (!url.startsWith('.')) {
    return `${cleanSubpath}/${url}`;
  }

  return url;
}

/**
 * Normalizes index.html contents:
 * - Backslashes -> forward slashes
 * - href/src attributes: /static/..., /_expo/..., /manifest.json, /index.html -> /hj.chomcong.app/...
 * - Prevent double prefix
 * - Preserve external URLs
 */
function normalizeHtmlContent(html, subpath = EXPECTED_SUBPATH) {
  const cleanSubpath = subpath.endsWith('/') ? subpath.slice(0, -1) : subpath;
  let result = html;

  // 1. Fix backslashes in href, src, and content attributes
  result = result.replace(/(href|src|content)=["']([^"']+)["']/gi, (match, attr, val) => {
    return `${attr}="${val.replace(/\\/g, '/')}"`;
  });

  // 2. Normalize href and src attributes
  result = result.replace(/(href|src)=["']([^"']+)["']/gi, (match, attr, val) => {
    // Don't touch external or special URLs
    if (/^(https?:|\/\/|data:|blob:|javascript:|mailto:|tel:|#)/i.test(val)) {
      return match;
    }
    const normalized = normalizeSubpathUrl(val, subpath);
    return `${attr}="${normalized}"`;
  });

  // 3. Fallback targeted rewrites for root-relative strings
  result = result
    .replace(/(["'])\/static\//g, `$1${cleanSubpath}/static/`)
    .replace(/(["'])\/_expo\//g, `$1${cleanSubpath}/_expo/`)
    .replace(/(["'])\/manifest\.json(["'])/g, `$1${cleanSubpath}/manifest.json$2`)
    .replace(/(["'])\/index\.html(["'])/g, `$1${cleanSubpath}/index.html$2`);

  // 4. Collapse any accidental repeated subpaths
  const doublePrefix = `${cleanSubpath}${cleanSubpath}`;
  while (result.includes(doublePrefix)) {
    result = result.replace(new RegExp(doublePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), cleanSubpath);
  }

  // 5. Ensure UTF-8 title
  if (result.includes('<title>Webpack App</title>') || result.includes('<title>chấm công.app</title>')) {
    result = result.replace(/<title>.*?<\/title>/, '<title>Chấm Công & Bảng Lương</title>');
  }

  return result;
}

/**
 * Normalizes manifest.json object
 */
function normalizeManifest(manifest, subpath = EXPECTED_SUBPATH) {
  const normalized = { ...manifest };

  if (!normalized.start_url || normalized.start_url === '/' || normalized.start_url === '/?utm_source=web_app_manifest') {
    normalized.start_url = `${subpath}?utm_source=web_app_manifest`;
  } else if (normalized.start_url.startsWith('/') && !normalized.start_url.startsWith(subpath)) {
    normalized.start_url = normalizeSubpathUrl(normalized.start_url, subpath);
  }

  if (!normalized.scope || normalized.scope === '/') {
    normalized.scope = subpath;
  } else if (normalized.scope.startsWith('/') && !normalized.scope.startsWith(subpath)) {
    normalized.scope = normalizeSubpathUrl(normalized.scope, subpath);
  }

  if (Array.isArray(normalized.icons)) {
    normalized.icons = normalized.icons.map((icon) => {
      if (icon && typeof icon.src === 'string') {
        return {
          ...icon,
          src: normalizeSubpathUrl(icon.src, subpath),
        };
      }
      return icon;
    });
  }

  return normalized;
}

/**
 * Normalizes asset-manifest.json object
 */
function normalizeAssetManifest(assetManifest, subpath = EXPECTED_SUBPATH) {
  const normalized = { ...assetManifest };

  if (normalized.files && typeof normalized.files === 'object') {
    const files = { ...normalized.files };
    for (const [key, val] of Object.entries(files)) {
      if (typeof val === 'string') {
        files[key] = normalizeSubpathUrl(val, subpath);
      }
    }
    normalized.files = files;
  }

  if (Array.isArray(normalized.entrypoints)) {
    normalized.entrypoints = normalized.entrypoints.map((ep) => {
      if (typeof ep === 'string' && ep.startsWith('/')) {
        return normalizeSubpathUrl(ep, subpath);
      }
      return ep;
    });
  }

  return normalized;
}

/**
 * Normalizes Webpack publicPath in JS bundles
 */
function normalizeJsBundles(jsDir, subpath = EXPECTED_SUBPATH) {
  if (!fs.existsSync(jsDir)) return 0;

  const files = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'));
  let modifiedCount = 0;

  for (const file of files) {
    const filePath = path.join(jsDir, file);
    let jsCode = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Pattern 1: .p="/" (e.g. n.p="/", o.p="/")
    const pRegex = /(\b[a-zA-Z0-9_$]+\.p\s*=\s*)(["'])\/(["'])/g;
    if (pRegex.test(jsCode)) {
      jsCode = jsCode.replace(pRegex, `$1$2${subpath}$3`);
      modified = true;
    }

    // Pattern 2: __webpack_require__.p = "/"
    const webpackPRegex = /(__webpack_require__\.p\s*=\s*)(["'])\/(["'])/g;
    if (webpackPRegex.test(jsCode)) {
      jsCode = jsCode.replace(webpackPRegex, `$1$2${subpath}$3`);
      modified = true;
    }

    // Pattern 3: Clean any repeated subpath inside JS bundles
    const cleanSubpath = subpath.endsWith('/') ? subpath.slice(0, -1) : subpath;
    const doubleSubpath = `${cleanSubpath}${cleanSubpath}`;
    if (jsCode.includes(doubleSubpath)) {
      while (jsCode.includes(doubleSubpath)) {
        jsCode = jsCode.replace(new RegExp(doubleSubpath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), cleanSubpath);
      }
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, jsCode, 'utf8');
      modifiedCount++;
      console.log(`✓ Normalized webpack publicPath in ${file}`);
    }
  }

  return modifiedCount;
}

function runPostbuild() {
  const targetDir = path.join(__dirname, '..', 'web-build');

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

  // 1. Sanitize & normalize index.html
  const indexPath = path.join(targetDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    let indexHtml = fs.readFileSync(indexPath, 'utf8');

    // Run full subpath and backslash normalization
    indexHtml = normalizeHtmlContent(indexHtml, EXPECTED_SUBPATH);

    // Inject build marker meta tags before </head> if not already present
    if (!indexHtml.includes('name="build-commit"')) {
      const markerMeta = `<meta name="build-commit" content="${gitCommit}"/><meta name="build-time" content="${buildTimestamp}"/>`;
      indexHtml = indexHtml.replace('</head>', `${markerMeta}</head>`);
    }

    fs.writeFileSync(indexPath, indexHtml, 'utf8');
    console.log('✓ Successfully sanitized HTML asset paths and injected build marker in index.html');

    // 2. Generate 404.html for GitHub Pages SPA routing fallback (exact copy of normalized index.html)
    const notFoundPath = path.join(targetDir, '404.html');
    fs.writeFileSync(notFoundPath, indexHtml, 'utf8');
    console.log('✓ Successfully created 404.html for GitHub Pages SPA routing');
  }

  // 3. Sanitize manifest.json: ensure start_url and scope use subpath
  const manifestPath = path.join(targetDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const updatedManifest = normalizeManifest(manifest, EXPECTED_SUBPATH);
      fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2), 'utf8');
      console.log('✓ Successfully configured manifest.json for subpath');
    } catch (err) {
      console.warn('Warning: Could not update manifest.json:', err.message);
    }
  }

  // 4. Sanitize asset-manifest.json: ensure all files point to subpath
  const assetManifestPath = path.join(targetDir, 'asset-manifest.json');
  if (fs.existsSync(assetManifestPath)) {
    try {
      const assetManifest = JSON.parse(fs.readFileSync(assetManifestPath, 'utf8'));
      const updatedAssetManifest = normalizeAssetManifest(assetManifest, EXPECTED_SUBPATH);
      fs.writeFileSync(assetManifestPath, JSON.stringify(updatedAssetManifest, null, 2), 'utf8');
      console.log('✓ Successfully normalized asset-manifest.json for subpath');
    } catch (err) {
      console.warn('Warning: Could not update asset-manifest.json:', err.message);
    }
  }

  // 5. Sanitize static/js/*.js Webpack publicPath
  const jsDir = path.join(targetDir, 'static', 'js');
  normalizeJsBundles(jsDir, EXPECTED_SUBPATH);

  // 6. Generate health.json & build-marker.json
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

  // 7. Automated verification: assert all referenced assets are correct
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
}

module.exports = {
  EXPECTED_SUBPATH,
  normalizeSubpathUrl,
  normalizeHtmlContent,
  normalizeManifest,
  normalizeAssetManifest,
  normalizeJsBundles,
  runPostbuild,
};

if (require.main === module) {
  runPostbuild();
}
