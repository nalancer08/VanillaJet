// -- Add dependencies
const path = require("path"),
	fs = require("fs"),
	nunjucks = require('nunjucks'),
  identifier = 'templates',
  chalk = require('chalk'),
  zlib = require('zlib');

let Functions = require('../framework/functions.js');
let Dipper = require('../framework/dipper.js');
let Config = require(processCwd() + '/config.js');

// -- Init Dipper
let settings = Config.settings;
let opts = settings['profile'] || {},
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
    .replace('/gulp', '')
    .replace('/node_modules/vanilla-jet', '');
}