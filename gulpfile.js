const gulp = require('gulp');
const less = require('gulp-less');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const gzip = require('gulp-gzip');
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');
const newer = require('gulp-newer');
const shell = require('gulp-shell');
const watch = require('gulp-watch');
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
    .pipe(uglify({
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
    }))
    .pipe(rename(function(path) {
      path.basename += '.min';
    }))
    .pipe(gulp.dest(`${getCwd()}/public/scripts`));
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

// Template compilation
function compileTemplates() {
  return gulp.src('.')
    .pipe(shell([`node .grunt/compile_html.js`]));
}

// Watch task
function watchFiles(cb) {
  livereload.listen();
  
  // Watch LESS files
  watch([`${base}/assets/styles/less/**/*.less`], gulp.series(
    buildLess,
    compressCss
  ));

  // Watch HTML files
  watch([
    `${base}/assets/pages/*.html`,
    `${base}/assets/templates/**/*.html`
  ], compileTemplates);

  // Watch JS files
  watch([`${base}/assets/scripts/**/*.js`], gulp.series(
    cleanBuildJS,
    uglifyJs,
    concatJs,
    cleanMinified,
    compressJs
  ));
  
  cb();
}

// Define complex tasks
const build = gulp.series(
  cleanBuildJS,
  uglifyJs,
  concatJs,
  cleanMinified,
  buildLess,
  compileTemplates,
  gulp.parallel(compressJs, compressCss)
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
exports.build = build;
exports.dev = dev;
exports.default = dev; 