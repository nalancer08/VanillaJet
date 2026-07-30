const gulp = require('gulp');
const less = require('gulp-less');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const gzip = require('gulp-gzip');
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');
const newer = require('gulp-newer');
const { spawn } = require('child_process');
const livereload = require('gulp-livereload');
const del = require('del');
const gulpif = require('gulp-if');
const minimist = require('minimist');

// Helper functions
function getCwd() {
  return process.cwd()
    .replace('/node_modules', '')
    .replace('/vanilla-jet', '')
    .replace('/.gulp', '');
}

const base = getCwd();
const cssOrigin = `${getCwd()}/assets/styles/less/admin.less`;

// Build environment (passed via `gulp build --env <env>`). Forwarded to the
// HTML/SW generators so they resolve the matching profile (api_url, etc).
const argv = minimist(process.argv.slice(2));
const buildEnv = argv.env || 'development';

// Clean tasks
function cleanBuildJS() {
  return del([`${getCwd()}/public/scripts/vanilla.min.js`], { force: true });
}

function cleanMinified() {
  return del([
    `${getCwd()}/public/scripts/api`,
    `${getCwd()}/public/scripts/controllers`,
    `${getCwd()}/public/scripts/views`,
    `${getCwd()}/public/scripts/app.min.js`
  ], { force: true });
}

// LESS compilation
function buildLess() {
  return gulp.src(cssOrigin)
    .pipe(less({
      //compress: true,
      optimization: 2
    }))
    .pipe(rename('app.min.css'))
    .pipe(cleanCSS())
    .pipe(gulp.dest(`${getCwd()}/public/styles`))
    .pipe(livereload());
}

// JavaScript tasks
const UGLIFY_OPTIONS = {
  compress: {
    drop_console: false,
    sequences: true,
    dead_code: true,
    conditionals: true,
    booleans: true,
    unused: true,
    if_return: true,
    join_vars: true
  },
  output: { ascii_only: true }
};

function uglifyJs() {
  return gulp.src([
    `${getCwd()}/assets/scripts/*.js`,
    `${getCwd()}/assets/scripts/**/*.js`,
    `${getCwd()}/assets/scripts/**/**/*.js`,
    `${getCwd()}/assets/scripts/**/**/**/*.js`
  ])
    .pipe(newer({
      dest: `${getCwd()}/public`,
      ext: '.min.js'
    }))
    .pipe(uglify(UGLIFY_OPTIONS))
    .pipe(rename(function(path) {
      path.basename += '.min';
    }))
    .pipe(gulp.dest(`${getCwd()}/public/scripts`));
}

// Client core: the browser-side framework (Application, controllers/views
// base classes, router glue) ships INSIDE this package so every consumer
// runs the same core and upgrades with the npm dependency — no more drift
// between per-app copies. Same output pipeline as any app script: minified
// to public/scripts/core/vanillaJet.min.js, fingerprinted (?v=), immutable
// and precompressed. An app-local assets/scripts/core/vanillaJet.js still
// wins (legacy override) with a loud warning — delete it to adopt the
// packaged core.
function buildClientCore(done) {
  const fs = require('fs');
  const localCore = `${getCwd()}/assets/scripts/core/vanillaJet.js`;
  if (fs.existsSync(localCore)) {
    console.warn('VanillaJet - legacy local core detected (assets/scripts/core/vanillaJet.js): using it INSTEAD of the packaged client core. Delete the local file to adopt the packaged one.');
    return done();
  }
  return gulp.src(`${__dirname}/client/vanillaJet.js`)
    .pipe(uglify(UGLIFY_OPTIONS))
    .pipe(rename(function(path) {
      path.basename += '.min';
    }))
    .pipe(gulp.dest(`${getCwd()}/public/scripts/core`));
}

// Concatenation task
function concatJs() {
  return gulp.src([
    `${getCwd()}/public/scripts/controllers/**/*.min.js`,
    `${getCwd()}/public/scripts/views/**/*.min.js`,
    `${getCwd()}/public/scripts/api/**/*.min.js`,
    `${getCwd()}/public/scripts/*.min.js`,
    `!${getCwd()}/public/scripts/core/**`,
    `!${getCwd()}/public/scripts/plugins/**`,
    `!${getCwd()}/public/scripts/plugins/ui/**`
  ])
    .pipe(concat('vanilla.min.js'))
    .pipe(gulp.dest(`${getCwd()}/public/scripts`));
}

// Compression tasks
function compressJs() {
  return gulp.src(`${getCwd()}/public/scripts/vanilla.min.js`)
    .pipe(gzip({ gzipOptions: { level: 9 } }))
    .pipe(gulp.dest(`${getCwd()}/public/scripts`));
}

function compressCss() {
  return gulp.src(`${getCwd()}/public/styles/app.min.css`)
    .pipe(gzip({ gzipOptions: { level: 9 } }))
    .pipe(gulp.dest(`${getCwd()}/public/styles`));
}

// Runs a repo script as a child process, streaming its output. Replaces
// gulp-shell (whose lodash.template dependency has no patched release);
// cwd is inherited, matching gulp-shell's default resolution.
function execScript(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, stdio: 'inherit' });
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`)));
    child.on('error', reject);
  });
}

// Template compilation
function compileTemplates() {
  return execScript(`node scripts/compile_html.js ${buildEnv}`);
}

// Kill-switch publication: every build publishes the self-destructing worker
// at public/sw.js so leftover workers from the removed caching feature heal.
function generateServiceWorker() {
  return execScript(`node scripts/generate_sw.js ${buildEnv}`);
}

// Brotli precompression of build outputs (served via Accept-Encoding negotiation)
function compressBr() {
  return execScript('node scripts/compress_br.js');
}

// Watch task — native gulp.watch (chokidar); replaces the unmaintained
// gulp-watch and its vulnerable micromatch 2.x/3.x chain.
function watchFiles(cb) {
  livereload.listen();

  // Watch LESS files
  gulp.watch([`${base}/assets/styles/less/**/*.less`], gulp.series(
    buildLess,
    compressCss,
    compileTemplates,
    generateServiceWorker,
    compressBr
  ));

  // Watch HTML files
  gulp.watch([
    `${base}/assets/pages/*.html`,
    `${base}/assets/templates/**/*.html`
  ], compileTemplates);

  // Watch JS files
  gulp.watch([`${base}/assets/scripts/**/*.js`], gulp.series(
    cleanBuildJS,
    uglifyJs,
    concatJs,
    cleanMinified,
    compressJs,
    compileTemplates,
    generateServiceWorker,
    compressBr
  ));

  cb();
}

// Define complex tasks
const build = gulp.series(
  cleanBuildJS,
  uglifyJs,
  buildClientCore,
  concatJs,
  cleanMinified,
  buildLess,
  compileTemplates,
  gulp.parallel(compressJs, compressCss),
  generateServiceWorker,
  compressBr
);

const dev = gulp.series(
  build,
  watchFiles
);

// Export tasks
exports.cleanBuildJS = cleanBuildJS;
exports.cleanMinified = cleanMinified;
exports.buildLess = buildLess;
exports.uglifyJs = uglifyJs;
exports.concatJs = concatJs;
exports.compressJs = compressJs;
exports.compressCss = compressCss;
exports.compileTemplates = compileTemplates;
exports.generateServiceWorker = generateServiceWorker;
exports.buildClientCore = buildClientCore;
exports.compressBr = compressBr;
exports.build = build;
exports.dev = dev;
exports.default = dev; 