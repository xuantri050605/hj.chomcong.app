const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  // Ensure publicPath resolves under /hj.chomcong.app/ for GitHub Pages production builds
  const subpath = '/hj.chomcong.app/';
  const publicPath = process.env.PUBLIC_URL || process.env.WEB_PUBLIC_URL || subpath;

  if (env.mode === 'production') {
    env.publicPath = publicPath;
    process.env.WEB_PUBLIC_URL = publicPath;
  }

  const config = await createExpoWebpackConfigAsync(env, argv);

  if (env.mode === 'production') {
    const normalizedPublicPath = publicPath.endsWith('/') ? publicPath : `${publicPath}/`;
    config.output = {
      ...config.output,
      publicPath: normalizedPublicPath,
    };
  }

  // Prevent Watchpack from scanning locked Windows system files in root C:\
  config.watchOptions = {
    ...(config.watchOptions || {}),
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/web-build/**',
      '**/*.sys',
      'C:/*.sys',
      'C:/*.tmp',
    ],
  };

  return config;
};
