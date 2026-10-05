/**
 * Automated verification of asset paths for GitHub Pages sub-path deployment.
 * Detects broken absolute root paths (e.g. /static/...) and verifies that
 * all assets resolve under the expected subpath (e.g. /hj.chomcong.app/).
 */
const fs = require('fs');
const path = require('path');

function verifySubpathAssets(options = {}) {
  const buildDir = options.buildDir || path.join(__dirname, '..', 'web-build');
  const expectedSubpath = options.expectedSubpath || '/hj.chomcong.app/';
  const errors = [];
  const verifiedAssets = [];

  if (!fs.existsSync(buildDir)) {
    return {
      success: false,
      errors: [`Target directory does not exist: ${buildDir}`],
      verifiedAssets,
    };
  }

  const indexPath = path.join(buildDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return {
      success: false,
      errors: [`index.html not found in ${buildDir}`],
      verifiedAssets,
    };
  }

  const html = fs.readFileSync(indexPath, 'utf8');

  // 1. Check for backslashes in href or src attributes
  const backslashMatches = html.match(/(?:src|href)=["'][^"']*\\[^"']*["']/g);
  if (backslashMatches && backslashMatches.length > 0) {
    for (const match of backslashMatches) {
      errors.push(`HTML attribute contains invalid URL backslashes: ${match}`);
    }
  }

  // 2. Validate all <script src="...">
  const scriptSrcRegex = /<script\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = scriptSrcRegex.exec(html)) !== null) {
    const src = match[1];
    if (src.startsWith('http://') || src.startsWith('https://')) {
      continue; // External CDN/script is allowed
    }

    if (src.startsWith('/')) {
      if (!src.startsWith(expectedSubpath)) {
        errors.push(`Broken script path: "${src}" points to domain root '/' instead of subpath '${expectedSubpath}'`);
      } else {
        const relPath = src.slice(expectedSubpath.length);
        const diskPath = path.join(buildDir, relPath);
        if (!fs.existsSync(diskPath)) {
          errors.push(`Referenced script missing on disk: ${src} (checked ${diskPath})`);
        } else {
          verifiedAssets.push(src);
        }
      }
    } else {
      // Relative path: check if file exists
      const diskPath = path.join(buildDir, src);
      if (!fs.existsSync(diskPath)) {
        errors.push(`Referenced relative script missing on disk: ${src}`);
      } else {
        verifiedAssets.push(src);
      }
    }
  }

  // 3. Validate relevant <link href="..."> (manifest, stylesheets, icons)
  const linkRegex = /<link\b[^>]*?\bhref=["']([^"']+)["'][^>]*>/gi;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('data:')) {
      continue;
    }

    if (href.startsWith('\\')) {
      errors.push(`Broken link href: "${href}" starts with backslash`);
      continue;
    }

    if (href.startsWith('/')) {
      if (!href.startsWith(expectedSubpath)) {
        errors.push(`Broken link href: "${href}" points to domain root '/' instead of subpath '${expectedSubpath}'`);
      } else {
        const relPath = href.slice(expectedSubpath.length);
        const diskPath = path.join(buildDir, relPath);
        if (!fs.existsSync(diskPath)) {
          errors.push(`Referenced link target missing on disk: ${href}`);
        } else {
          verifiedAssets.push(href);
        }
      }
    }
  }

  // 4. Validate manifest.json start_url and scope
  const manifestPath = path.join(buildDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.start_url && manifest.start_url.startsWith('/') && !manifest.start_url.startsWith(expectedSubpath)) {
        errors.push(`manifest.json start_url "${manifest.start_url}" points to domain root instead of '${expectedSubpath}'`);
      }
      if (manifest.scope && manifest.scope.startsWith('/') && !manifest.scope.startsWith(expectedSubpath)) {
        errors.push(`manifest.json scope "${manifest.scope}" points to domain root instead of '${expectedSubpath}'`);
      }
    } catch (err) {
      errors.push(`Failed to parse manifest.json: ${err.message}`);
    }
  }

  // 5. Validate asset-manifest.json
  const assetManifestPath = path.join(buildDir, 'asset-manifest.json');
  if (fs.existsSync(assetManifestPath)) {
    try {
      const assetManifest = JSON.parse(fs.readFileSync(assetManifestPath, 'utf8'));
      if (assetManifest.files && typeof assetManifest.files === 'object') {
        for (const [key, assetUrl] of Object.entries(assetManifest.files)) {
          if (typeof assetUrl === 'string' && assetUrl.startsWith('/')) {
            if (!assetUrl.startsWith(expectedSubpath)) {
              errors.push(`asset-manifest.json file "${key}" -> "${assetUrl}" points to domain root instead of '${expectedSubpath}'`);
            }
          }
        }
      }
    } catch (err) {
      errors.push(`Failed to parse asset-manifest.json: ${err.message}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
    verifiedAssets,
  };
}

module.exports = {
  verifySubpathAssets,
};

if (require.main === module) {
  const result = verifySubpathAssets();
  if (!result.success) {
    console.error('❌ Subpath asset verification FAILED:');
    result.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  } else {
    console.log(`✓ All ${result.verifiedAssets.length} referenced production assets correctly use subpath.`);
  }
}
