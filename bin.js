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

  // Environment-specific builds (restored for 1.3.x consumer compatibility).
  case 'build:qa':
    try {
      execSync('npx gulp build --env qa', { stdio: 'inherit', cwd: __dirname });
    } catch (error) {
      console.error('Error executing gulp:', error.message);
    }
    break;

  case 'build:staging':
    try {
      execSync('npx gulp build --env staging', { stdio: 'inherit', cwd: __dirname });
    } catch (error) {
      console.error('Error executing gulp:', error.message);
    }
    break;

  case 'build:prod':
    try {
      execSync('npx gulp build --env production', { stdio: 'inherit', cwd: __dirname });
    } catch (error) {
      console.error('Error executing gulp:', error.message);
    }
    break;
}