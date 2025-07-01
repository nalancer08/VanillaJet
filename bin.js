#!/usr/bin/env node

const path = require('path');
const args = process.argv.slice(2);
const { execSync } = require('child_process');
const chalk = require('chalk');

const generatePackagesJson = require(path.join(__dirname, './.scripts/generate_packages_json.js'));

switch (args[0]) {

  case 'setup':
    generatePackagesJson();
    break;

  case 'dev':
    try {
      execSync('npx gulp dev --env development', { stdio: 'inherit', cwd: __dirname });
    } catch (error) {
      console.error('Error executing gulp:', error.message);
    }
    break;

  case 'build':
    try {
      execSync('npx gulp build', { stdio: 'inherit', cwd: __dirname });
    } catch (error) {
      console.error('Error executing gulp:', error.message);
    }
    break;
}