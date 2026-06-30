// -- Add dependencies
const path = require("path"),
	fs = require("fs"),
	nunjucks = require('nunjucks'),
  chalk = require('chalk'),
  zlib = require('zlib');

let Functions = require('../framework/functions.js');
let Dipper = require('../framework/dipper.js');
let Config = require(processCwd() + '/config.js');

// -- Resolve build environment (passed as argv by gulp). Supports env-keyed configs
// (settings[env], e.g. 'qa'/'production') and the nested 'profile' shape. This is what
// injects the correct api_url/environment into the page via the Dipper.
let env = process.argv[2] || Config.profile || 'development';
const ENV_ALIASES = { dev: 'development', prod: 'production', 'build:qa': 'qa', 'build:staging': 'staging', 'build:prod': 'production' };
env = ENV_ALIASES[env] || env;

// -- Init Dipper
let settings = Config.settings;
if (settings['shared']) { settings['shared']['environment'] = env; }
let opts = settings[env] || settings['profile'] || {},
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
      // -- Divide the page content line by line. The page itself is NOT rendered through
      // Nunjucks (it only holds `include::` directives); each included template IS rendered.
      // Rendering the raw page content as a template name breaks with "template not found".
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
          if (templateName === 'templates') {

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
  let minified = await minify(content, {
    collapseWhitespace: true,
    collapseInlineTagWhitespace: true,
    removeComments: true,
    collapseBooleanAttributes: true,
    useShortDoctype: true,
    removeEmptyAttributes: true,
    removeOptionalTags: true,
    minifyJS: true
  });

  // -- Externalize <script type="text/template"> blocks into public/scripts/templates.js
  // (opt-in via settings.profile.externalize_templates). The page shrinks to ~the shell;
  // templates load from a separate cacheable file (brotli + SW + immutable) BEFORE the app
  // bundle (defer + document order), so views still find their templates in the DOM at boot.
  if (opts.externalize_templates) {
    minified = externalizeTemplates(minified);
  } else {
    // Feature off: remove any previously generated templates.js so a stale 749KB file
    // isn't left behind (and isn't precached by the service worker).
    removeStaleTemplatesFile();
  }

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

// -- Remove a previously generated public/scripts/templates.js (+ compressed siblings)
// when externalization is disabled, so toggling the flag never leaves a stale file behind.
function removeStaleTemplatesFile() {
  const base = path.join(processCwd(), 'public', 'scripts', 'templates.js');
  ['', '.gz', '.br'].forEach((ext) => {
    try {
      if (fs.existsSync(base + ext)) {
        fs.unlinkSync(base + ext);
        console.log(chalk.green(`VanillaJet - removed stale public/scripts/templates.js${ext}`));
      }
    } catch (err) {
      // Non-fatal: never fail the build over cleanup.
    }
  });
}

// -- Move all <script type="text/template"> blocks out of the page into
// public/scripts/templates.js (a tiny injector that adds them to the DOM). Returns the
// page HTML with those blocks replaced by a single deferred <script> tag (placed where the
// first block was — before the app bundle, so it runs first by document order).
function externalizeTemplates(html) {
  const templateRegex = /<script\b[^>]*\btype\s*=\s*["']text\/template["'][^>]*>[\s\S]*?<\/script>/gi;
  const blocks = html.match(templateRegex) || [];
  if (!blocks.length) {
    return html;
  }

  const scriptsDir = path.join(processCwd(), 'public', 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });

  const payload = blocks.join('\n');
  // External file → a literal </script> inside the payload is harmless (no inline HTML parser).
  const injector =
    '(function(){var c=document.createElement("div");c.style.display="none";' +
    'c.setAttribute("data-vj-templates","");c.innerHTML=' + JSON.stringify(payload) + ';' +
    'document.body.insertBefore(c,document.body.firstChild);})();';

  const templatesPath = path.join(scriptsDir, 'templates.js');
  fs.writeFileSync(templatesPath, injector, 'utf8');
  fs.writeFileSync(templatesPath + '.gz', zlib.gzipSync(injector, { level: 9 }));

  const stats = fs.statSync(templatesPath);
  const version = `${stats.size}-${Math.floor(stats.mtimeMs)}`;
  const tag = `<script defer src="/public/scripts/templates.js?v=${version}"></script>`;

  let inserted = false;
  const result = html.replace(templateRegex, () => {
    if (!inserted) { inserted = true; return tag; }
    return '';
  });

  console.log(chalk.green(`VanillaJet - externalized ${blocks.length} templates to public/scripts/templates.js`));
  return result;
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
    .replace('/scripts', '')
    .replace('/gulp', '')
    .replace('/node_modules/vanilla-jet', '');
}
