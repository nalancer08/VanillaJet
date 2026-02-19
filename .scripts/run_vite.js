const path = require('path');
const { spawnSync } = require('child_process');

function resolveConsumerRoot() {
  return process.cwd()
    .replace('/node_modules/vanilla-jet', '')
    .replace('/.scripts', '')
    .replace('/.grunt', '');
}

function main() {
  const action = process.argv[2] || 'dev';
  const viteCommand = action === 'build' ? 'build' : 'serve';
  const packageRoot = path.resolve(__dirname, '..');
  const consumerRoot = resolveConsumerRoot();
  const vitePackageJson = require.resolve('vite/package.json', { paths: [packageRoot] });
  const viteBin = path.join(path.dirname(vitePackageJson), 'bin/vite.js');
  const configFile = path.join(packageRoot, 'vite.config.js');

  const args = [viteBin, viteCommand, '--config', configFile];
  if (viteCommand === 'serve') {
    args.push('--host');
  }

  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    cwd: consumerRoot,
    env: Object.assign({}, process.env, {
      VANILLAJET_PACKAGE_ROOT: packageRoot
    })
  });

  process.exit(typeof result.status === 'number' ? result.status : 1);
}

main();
