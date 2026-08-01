#!/usr/bin/env node

const path = require('path');
const args = process.argv.slice(2);
const { execSync } = require('child_process');
const chalk = require('chalk');

const generatePackagesJson = require(path.join(__dirname, './.scripts/generate_packages_json.js'));

// A failed gulp run must fail the calling pipeline too (Docker/CI): swallowing
// the exit code lets a broken build ship as if it had succeeded.
function runGulp(command) {
  try {
    execSync(command, { stdio: 'inherit', cwd: __dirname });
  } catch (error) {
    console.error('Error executing gulp:', error.message);
    process.exit(error.status || 1);
  }
}

switch (args[0]) {

  case 'setup':
    generatePackagesJson();
    break;

  case 'dev':
    runGulp('npx gulp dev --env development');
    break;

  case 'build':
    runGulp('npx gulp build');
    break;

  // Environment-specific builds (restored for 1.3.x consumer compatibility).
  case 'build:qa':
    runGulp('npx gulp build --env qa');
    break;

  case 'build:staging':
    runGulp('npx gulp build --env staging');
    break;

  case 'build:prod':
    runGulp('npx gulp build --env production');
    break;

  // An unknown/empty command (e.g. `build:` from an unset NODE_ENV) used to
  // fall through as a silent no-op that pipelines read as success.
  default:
    console.error(chalk.red(`VanillaJet - unknown command "${args[0] || ''}". Use: setup | dev | build | build:qa | build:staging | build:prod`));
    process.exit(1);
}
