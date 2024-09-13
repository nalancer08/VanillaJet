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
            execSync('grunt --env=development', { stdio: 'inherit', cwd: __dirname });
        } catch (error) {
            console.error('Error ejecutando grunt:', error.message);
        }
        break;

    case 'build:qa':
        try {
            execSync('grunt build --env=qa', { stdio: 'inherit', cwd: __dirname });
        } catch (error) {
            console.error('Error ejecutando grunt:', error.message);
        }
        break;

    case 'build:prod':
        try {
            execSync('grunt build --env=production', { stdio: 'inherit', cwd: __dirname });
        } catch (error) {
            console.error('Error ejecutando grunt:', error.message);
        }
        break;
}