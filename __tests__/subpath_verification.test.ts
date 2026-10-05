import fs from 'fs';
import path from 'path';
import os from 'os';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { verifySubpathAssets } = require('../scripts/verify-subpath-assets');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  normalizeSubpathUrl,
  normalizeHtmlContent,
  normalizeManifest,
  normalizeAssetManifest,
  normalizeJsBundles,
} = require('../scripts/postbuild');

describe('Subpath Asset Verification', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'subpath-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test('passes when all assets properly use the subpath and exist on disk', () => {
    const subpath = '/hj.chomcong.app/';
    const staticJsDir = path.join(tempDir, 'static', 'js');
    fs.mkdirSync(staticJsDir, { recursive: true });

    fs.writeFileSync(path.join(staticJsDir, 'main.js'), 'console.log("main");', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify({
      start_url: '/hj.chomcong.app/?utm_source=web_app_manifest',
      scope: '/hj.chomcong.app/',
    }), 'utf8');

    const htmlContent = `<!doctype html><html><head>
      <link rel="manifest" href="/hj.chomcong.app/manifest.json">
      <script defer="defer" src="/hj.chomcong.app/static/js/main.js"></script>
    </head><body><div id="root"></div></body></html>`;

    fs.writeFileSync(path.join(tempDir, 'index.html'), htmlContent, 'utf8');

    const result = verifySubpathAssets({
      buildDir: tempDir,
      expectedSubpath: subpath,
    });

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.verifiedAssets).toContain('/hj.chomcong.app/static/js/main.js');
    expect(result.verifiedAssets).toContain('/hj.chomcong.app/manifest.json');
  });

  test('fails when asset points to domain root "/" instead of subpath', () => {
    const subpath = '/hj.chomcong.app/';
    const staticJsDir = path.join(tempDir, 'static', 'js');
    fs.mkdirSync(staticJsDir, { recursive: true });
    fs.writeFileSync(path.join(staticJsDir, 'main.js'), 'console.log("main");', 'utf8');

    const htmlContent = `<!doctype html><html><head>
      <script defer="defer" src="/static/js/main.js"></script>
    </head><body><div id="root"></div></body></html>`;

    fs.writeFileSync(path.join(tempDir, 'index.html'), htmlContent, 'utf8');

    const result = verifySubpathAssets({
      buildDir: tempDir,
      expectedSubpath: subpath,
    });

    expect(result.success).toBe(false);
    expect(result.errors.some((e: string) => e.includes("points to domain root '/'"))).toBe(true);
  });

  test('fails when HTML attribute contains invalid Windows backslashes', () => {
    const subpath = '/hj.chomcong.app/';
    const htmlContent = `<!doctype html><html><head>
      <link rel="manifest" href="\\hj.chomcong.app\\manifest.json">
    </head><body><div id="root"></div></body></html>`;

    fs.writeFileSync(path.join(tempDir, 'index.html'), htmlContent, 'utf8');

    const result = verifySubpathAssets({
      buildDir: tempDir,
      expectedSubpath: subpath,
    });

    expect(result.success).toBe(false);
    expect(result.errors.some((e: string) => e.includes('backslashes'))).toBe(true);
  });

  test('fails when referenced asset is missing on disk', () => {
    const subpath = '/hj.chomcong.app/';
    const htmlContent = `<!doctype html><html><head>
      <script defer="defer" src="/hj.chomcong.app/static/js/nonexistent.js"></script>
    </head><body><div id="root"></div></body></html>`;

    fs.writeFileSync(path.join(tempDir, 'index.html'), htmlContent, 'utf8');

    const result = verifySubpathAssets({
      buildDir: tempDir,
      expectedSubpath: subpath,
    });

    expect(result.success).toBe(false);
    expect(result.errors.some((e: string) => e.includes('missing on disk'))).toBe(true);
  });

  test('validates the actual web-build folder if present', () => {
    const actualBuildDir = path.join(__dirname, '..', 'web-build');
    if (!fs.existsSync(actualBuildDir) || !fs.existsSync(path.join(actualBuildDir, 'index.html'))) {
      return;
    }

    const result = verifySubpathAssets({
      buildDir: actualBuildDir,
      expectedSubpath: '/hj.chomcong.app/',
    });

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.verifiedAssets.length).toBeGreaterThan(0);
  });
});

describe('Postbuild Normalization Functions', () => {
  const subpath = '/hj.chomcong.app/';

  test('normalizeSubpathUrl correctly rewrites URLs and avoids double prefix', () => {
    expect(normalizeSubpathUrl('/static/js/240.63ca977c.js', subpath)).toBe('/hj.chomcong.app/static/js/240.63ca977c.js');
    expect(normalizeSubpathUrl('/static/js/main.3d55c1f2.js', subpath)).toBe('/hj.chomcong.app/static/js/main.3d55c1f2.js');
    expect(normalizeSubpathUrl('/manifest.json', subpath)).toBe('/hj.chomcong.app/manifest.json');
    expect(normalizeSubpathUrl('/index.html', subpath)).toBe('/hj.chomcong.app/index.html');
    expect(normalizeSubpathUrl('/_expo/loading.js', subpath)).toBe('/hj.chomcong.app/_expo/loading.js');
    expect(normalizeSubpathUrl('/hj.chomcong.app/static/js/main.js', subpath)).toBe('/hj.chomcong.app/static/js/main.js');
    expect(normalizeSubpathUrl('/hj.chomcong.app/hj.chomcong.app/static/js/main.js', subpath)).toBe('/hj.chomcong.app/static/js/main.js');
    expect(normalizeSubpathUrl('https://example.com/lib.js', subpath)).toBe('https://example.com/lib.js');
    expect(normalizeSubpathUrl('data:image/png;base64,abc', subpath)).toBe('data:image/png;base64,abc');
    expect(normalizeSubpathUrl('#section', subpath)).toBe('#section');
  });

  test('normalizeHtmlContent converts root paths to subpath deterministically', () => {
    const rawHtml = `<!doctype html><html><head>
      <link rel="manifest" href="/manifest.json">
      <script defer="defer" src="/static/js/240.63ca977c.js"></script>
      <script defer="defer" src="/static/js/main.3d55c1f2.js"></script>
      <link rel="icon" href="/favicon.ico">
      <script src="https://cdn.example.com/external.js"></script>
    </head><body><div id="root"></div></body></html>`;

    const normalized = normalizeHtmlContent(rawHtml, subpath);

    expect(normalized).toContain('href="/hj.chomcong.app/manifest.json"');
    expect(normalized).toContain('src="/hj.chomcong.app/static/js/240.63ca977c.js"');
    expect(normalized).toContain('src="/hj.chomcong.app/static/js/main.3d55c1f2.js"');
    expect(normalized).toContain('href="/hj.chomcong.app/favicon.ico"');
    expect(normalized).toContain('src="https://cdn.example.com/external.js"');
    expect(normalized).not.toContain('src="/static/');
    expect(normalized).not.toContain('href="/manifest.json"');
    expect(normalized).not.toContain('/hj.chomcong.app/hj.chomcong.app/');
  });

  test('normalizeManifest configures start_url and scope properly', () => {
    const rawManifest = {
      name: 'Chấm Công & Bảng Lương',
      start_url: '/',
      scope: '/',
    };

    const normalized = normalizeManifest(rawManifest, subpath);
    expect(normalized.start_url).toBe('/hj.chomcong.app/?utm_source=web_app_manifest');
    expect(normalized.scope).toBe('/hj.chomcong.app/');
  });

  test('normalizeAssetManifest rewrites all root paths in files and entrypoints', () => {
    const rawAssetManifest = {
      files: {
        'main.js': '/static/js/main.3d55c1f2.js',
        'static/js/240.63ca977c.js': '/static/js/240.63ca977c.js',
        'index.html': '/index.html',
        'manifest.json': '/manifest.json',
      },
      entrypoints: [
        '/static/js/240.63ca977c.js',
        '/static/js/main.3d55c1f2.js',
      ],
    };

    const normalized = normalizeAssetManifest(rawAssetManifest, subpath);
    expect(normalized.files['main.js']).toBe('/hj.chomcong.app/static/js/main.3d55c1f2.js');
    expect(normalized.files['index.html']).toBe('/hj.chomcong.app/index.html');
    expect(normalized.files['manifest.json']).toBe('/hj.chomcong.app/manifest.json');
    expect(normalized.entrypoints[0]).toBe('/hj.chomcong.app/static/js/240.63ca977c.js');
  });

  test('normalizeJsBundles rewrites Webpack publicPath from "/" to subpath', () => {
    const tempJsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'js-bundle-test-'));
    try {
      const bundlePath = path.join(tempJsDir, 'main.bundle.js');
      fs.writeFileSync(bundlePath, 'var a=1;n.p="/";function load(){}', 'utf8');

      const count = normalizeJsBundles(tempJsDir, subpath);
      expect(count).toBe(1);

      const modified = fs.readFileSync(bundlePath, 'utf8');
      expect(modified).toBe('var a=1;n.p="/hj.chomcong.app/";function load(){}');
    } finally {
      fs.rmSync(tempJsDir, { recursive: true, force: true });
    }
  });
});
