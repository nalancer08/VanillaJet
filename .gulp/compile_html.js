const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');
const beautify = require('js-beautify').html;
const minify = require('html-minifier-terser').minify;
const identifier = 'templates';
const chalk = require('chalk');
const zlib = require('zlib');

// Get environment from command line argument
const env = process.argv[2] || 'development';
if (env === 'dev') { env = 'development'; }
if (env === 'build:qa') { env = 'qa'; }
if (env === 'build:staging') { env = 'staging'; }
if (env === 'build:prod') { env = 'production'; }

function getCwd() {
  return process.cwd()
    .replace('/node_modules', '')
    .replace('/vanilla-jet', '')
    .replace('/.gulp', '');
}

const base = getCwd();
const pagesDir = path.join(base, 'assets/pages');
const templatesDir = path.join(base, 'assets/templates');
const outputDir = path.join(base, 'public');

// Configure nunjucks
nunjucks.configure(templatesDir, {
  autoescape: true,
  watch: false
});

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read all HTML files from pages directory
fs.readdir(pagesDir, (err, files) => {
  if (err) {
    console.error('Error reading pages directory:', err);
    process.exit(1);
  }

  files.forEach(file => {
    if (path.extname(file) === '.html') {
      const templatePath = path.join(pagesDir, file);
      const outputPath = path.join(outputDir, file);

      // Read template file
      fs.readFile(templatePath, 'utf8', (err, content) => {
        if (err) {
          console.error(`Error reading template ${file}:`, err);
          return;
        }

        try {
          // Render template with nunjucks
          const rendered = nunjucks.renderString(content);

          // Process the HTML based on environment
          let processedHtml;
          if (env === 'development') {
            // In development, beautify the HTML
            processedHtml = beautify(rendered, {
              indent_size: 2,
              preserve_newlines: true,
              max_preserve_newlines: 2,
              wrap_line_length: 0
            });
          } else {
            // In other environments, minify the HTML
            processedHtml = minify(rendered, {
              collapseWhitespace: true,
              removeComments: true,
              minifyCSS: true,
              minifyJS: true
            });
          }

          // Write the processed HTML to output file
          fs.writeFile(outputPath, processedHtml, err => {
            if (err) {
              console.error(`Error writing file ${file}:`, err);
            } else {
              console.log(`Successfully compiled ${file}`);
            }
          });
        } catch (err) {
          console.error(`Error processing template ${file}:`, err);
        }
      });
    }
  });
});

let Functions = require('../framework/functions.js');
let Dipper = require('../framework/dipper.js');
let Config = require(processCwd() + '/config.js');

// -- Init Dipper
let settings = Config.settings;
settings['shared']['environment'] = env;

let opts = settings[env] || {},
  shared = settings['shared'] || {};
const dipper = new Dipper(opts, shared);

// -- Hydrate dipper
Functions.hydrate(dipper);

// -- Making nunjucks
let nunjucksPath = path.join(processCwd(), '/assets');
nunjucks.configure(nunjucksPath, {
  autoescape: false,
	throwOnUndefined: true,
	noCache: true
});

// -- Template directory
const templatesDirectoryPath = '/assets/templates/';

// -- Call main function
main();

// -- Define mainfunctions on other functions
function main() {

  // -- Get template files
  const templates = getTemplates(templatesDirectoryPath);
  //console.log(templates);

  // -- Get home.html
  let homePageName = 'home.html';
  getHtmlFromPage(homePageName).then((htmlContent) => {
    if (htmlContent) {
      // -- Divide content line by line
      const htmlContentLines = htmlContent.split('\n');
      let lines = Array.from(htmlContentLines);
      // -- Iterate over each line
      for (let line of htmlContentLines) {
        let originalLine = line;
        // -- Remove spaces and tabs
        line = cleanALine(line);
        // -- Check is not empty and not a tag
        if (line.length != 0 && !line.includes('<')) {

          // -- Get template name
          var templateName = line.replace('include::', '');
          // -- Check if its name "templates" add all templates if not add specific one
          if (templateName === identifier) {

            let allTemplatesCompiled = '';
            for (let templateName in templates) {
              if (templateName.includes('template.html')) {
                let templatePath = templates[templateName];
                let templateCompiled = compileTemplate(templatePath);
                allTemplatesCompiled += templateCompiled;
              }
            }
            lines = replaceInclude(lines, originalLine, allTemplatesCompiled);

          } else {
            let templatePath = templates[templateName];
            let templateCompiled = compileTemplate(templatePath);
            lines = replaceInclude(lines, originalLine, templateCompiled);
          }
        }
      }
      // -- Join lines
      const newHtml = lines.join('\n');
      // -- Create HTML file
      createHTMLFile(newHtml, homePageName);
      // -- Console finish
      console.log(chalk.green("\n\nVanillaJet - Finish build"));
    }
  });
}

// -- Step 0
function getTemplates(directory) {
    
  const results = {};

  // -- Sub functions
  function exploreDirectory(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(function (file) {
      //console.log(file);
      if (!checkExcludes(file)) {
        const filePath = path.join(dir, file);
        //console.log(filePath);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          const extension = path.extname(file).toLowerCase();
          if (extension === '.html') {
            results[file] = filePath;
          }
        } else if (stats.isDirectory()) {
          exploreDirectory(filePath);
        }
      }
    });
  }

  function checkExcludes(file) {

    const excludes = ['.DS_Store'];
    for (const esclude of excludes) {
      if (file.includes(esclude)) {
        return true;
      }
    }
    return false;
  }

  // -- Main code
  const templatesPath = path.join(processCwd(), directory);
  exploreDirectory(templatesPath);
  return results;
}

// -- Step 1
async function getHtmlFromPage(page) {

    const filename = path.join(processCwd(), '/assets/');
    const exists = await fs.promises.access(filename, fs.constants.F_OK).then(() => true).catch(() => false);
    if (!exists) {
      console.log("Assets folder doesnt exists");
      return null;
    }
  
    let fileContent;
    if (await fs.promises.stat(filename).then((stats) => stats.isDirectory())) {
      const filePath = path.join(filename, 'pages/' + page);
      try {
        fileContent = await fs.promises.readFile(filePath, { encoding: 'utf8' });
      } catch (err) {
        console.log("Error in Home");
        return null;
      }
    }
    return fileContent;
}

// -- Step 2
function compileTemplate(path) {

  // -- Data
  let data = { 'app': dipper }
  
  // -- Render
  return nunjucks.render(path, data);
}

// -- Step 3
function replaceInclude(lines, originalLine, templateCompiled) {
  const index = lines.indexOf(originalLine);
  if (index !== -1) {
    lines.splice(index, 1, templateCompiled);
  }
  return lines;
}

// -- Step 4
async function createHTMLFile(content, filePath) {
  const { minify } = require('html-minifier-terser');
  const minified = await minify(content, {
    collapseWhitespace: true,
    collapseInlineTagWhitespace: true,
    removeComments: true,
    collapseBooleanAttributes: true,
    useShortDoctype: true,
    removeEmptyAttributes: true,
    removeOptionalTags: true,
    minifyJS: true
  });

  const publicPath = path.join(processCwd(), '/public/pages');
  fs.mkdirSync(publicPath, { recursive: true });
  const absolutePath = path.join(publicPath, filePath);
  
  // Write the minified HTML file
  fs.writeFileSync(absolutePath, minified, 'utf8');

  // Create gzipped version
  const gzipped = zlib.gzipSync(minified, { level: 9 }); // Maximum compression level
  fs.writeFileSync(`${absolutePath}.gz`, gzipped);
  
  console.log(chalk.green(`Created HTML file at: ${absolutePath}`));
  console.log(chalk.green(`Created gzipped version at: ${absolutePath}.gz`));
}

// -- Helpers
function cleanALine(line) {
  line = line.replaceAll(' ', '');
  line = line.replaceAll('\t', '');
  line = line.replaceAll('\n', '');
  return line;
}

function processCwd() {
  return process.cwd()
    .replace('/.grunt', '')
    .replace('/node_modules/vanilla-jet', '');
} 