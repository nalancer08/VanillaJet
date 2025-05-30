function Dipper(options, shared) {

	let path = require('path');

	this.options = options;
	this.shared = shared;
	this.metas = [];
	this.site_title = shared.site_name;
	this.page_title = this.site_title;
	this.description = shared.description;
	this.fbAppId = shared.fbAppId;

	this.site_url = ((this.options.site_url == 'localhost')  ? 
		'http://localhost' : 
		this.options.site_url) + ':' + this.options.port;
	this.base_dir = path.join(process.cwd(), '/');
	this.base_url = this.site_url + this.options.base_url;
	
	// Dirs
	this.dirs = {

		'images'  : '/public/images/',
		'scripts' : '/public/scripts/',
		'styles'  : '/public/styles/',
		'fonts'   : '/public/fonts/',
		'anims'   : '/public/anims/'
	}

	// -- Static content
	this.scripts = [];
	this.styles = [];
	this.anims = [];
	this.enqueued_scripts = [];
	this.enqueued_styles = [];

	// -- Base scripts
	let vanillaJetJson = this.openJsonFile('vanillaJet.package.json');
	if (vanillaJetJson) {
		let coreDependencies = vanillaJetJson.coreDependencies;
		for (let key in coreDependencies) {
			this.registerScript(key, coreDependencies[key]);
		}
	}
}

Dipper.prototype.getPageTitle = function() {

	var obj = this;
	return obj.page_title;
}

Dipper.prototype.getSiteTitle = function() {

	var obj = this;
	return obj.site_title;
}

Dipper.prototype.getDescription = function() {

	var obj = this;
	return obj.description;
}

Dipper.prototype.getFbAppId = function() {

	var obj = this;
	return obj.fbAppId;
}

Dipper.prototype.addMeta = function({name, content, attribute}) {

	let obj = this;
	attribute = attribute || 'name';
	content = content || '';
	let meta = [];
		meta['name'] = name;
		meta['content'] = content;
		meta['attribute'] = attribute;
	obj.metas[name] = meta;
}

Dipper.prototype.metaTags = function() {

	let obj = this;
	let _ = require('underscore');
	let stringMeta = '';

	let keys = Object.keys(obj.metas);
	_.each(keys, function(key) {
		
		let name = obj.metas[key]['name'],
			content = obj.metas[key]['content'],
			attribute = obj.metas[key]['attribute'];

    stringMeta += obj.metas[key]['content'] != '' ? 
			`<meta ${attribute}="${name}" content="${content}">\n\t` :
			`<meta ${name}="${attribute}">\n\t`;
	});
	return stringMeta;			
}

Dipper.prototype.img = function(filename) {

	var obj = this,
		dir = this.getDir('images', false);
		ret = this.urlTo(dir + filename);
	return ret;
}

Dipper.prototype.script = function(filename) {
	let dir = this.getDir('scripts', false);
	return this.urlTo(dir + filename);
}

Dipper.prototype.style = function(filename) {
	let dir = this.getDir('styles', false);
	return this.urlTo(dir + filename);;
}

Dipper.prototype.pdf = function(filename) {

	var obj = this,
		dir = '/assets/pdf/'
		ret = this.urlTo(dir + filename);
		//console.log(ret);
	return ret;
}

Dipper.prototype.getDir = function(dir, full) {
	
	var obj = this,
		full = (full == undefined) ? true : full;

	if ( obj.dirs[dir] != undefined ) {
		return (full == true ? obj.baseDir(obj.dirs[dir]) : obj.dirs[dir]);
	}
	return false;
}

Dipper.prototype.baseDir = function(path) {

	var obj = this,
		path = path || '',
		ret = obj.base_dir + path;
	return ret;
}

Dipper.prototype.isSecureRequest = function() {

	var obj = this;
	// Cheking for http or https
	if (/^((http):\/\/)/.test(obj.options.site_url) || /^((localhost))/.test(obj.options.site_url)) {
		return false;
	} else if (/^((https):\/\/)/.test(obj.options.site_url)) {
		return true;
	}
}

Dipper.prototype.urlTo = function(route, protocol) {

	var obj = this,
		protocol = protocol || undefined,
		url = obj.base_url + route;
		//url = obj.baseUrl(route, protocol);
	return url;
}

Dipper.prototype.registerStyle = function(
	name, url, requires,
	cdn = false, async = false,
	origin = '', integrity = '') {
	
	var obj = this;
	obj.styles[name] = {
		'resource' : url,
		'requires' : requires,
		'cdn' : cdn,
		'async' : async,
		'origin' : origin,
		'integrity' : integrity
	};
}

Dipper.prototype.registerScript = function(
	name, url, requires, 
	cdn = false, async = false, defer = false,
	origin = '', integrity = '') {
	
	var obj = this;
	obj.scripts[name] = {

		'resource' : url,
		'requires' : requires,
		'cdn' : cdn,
		'async' : async,
		'defer': defer,
		'origin' : origin,
		'integrity' : integrity
	};
}

Dipper.prototype.registerAnimation = function(name, url) {
	
	let obj = this;
	obj.anims[name] = {
		'resource' : url,
		'requires' : []
	};
}

Dipper.prototype.enqueueStyle = function(name) {

	var obj = this,
		_ = require('underscore');

	if (obj.styles[name] != undefined) {
		if (obj.enqueued_styles[name] == undefined) {
			
			var item = obj.styles[name];
			_.each(item.requires, function(dep) {
				obj.enqueueStyle(dep);
			});
			obj.enqueued_styles[name] = name;
		}
	}
}

Dipper.prototype.enqueueScript = function(name) {

	var obj = this,
		_ = require('underscore');

	if (obj.scripts[name] != undefined) {
		if (obj.enqueued_scripts[name] == undefined) {

			var item = obj.scripts[name];
			_.each(item.requires, function(dep) {
				obj.enqueueScript(dep);
			});
			obj.enqueued_scripts[name] = name;
		}
	}
}

Dipper.prototype.dequeueStyle = function(name, dependencies) {

	var obj = this,
		_ = require('underscore')
		dependencies = (dependencies == undefined) ? false : dependencies;

	if (obj.styles[name] != undefined) {
		if (obj.enqueued_styles[name] != undefined) {
			var item = obj.styles[name];
			if (dependencies != undefined) {
				_.each(item.require, function(dep) {
					obj.dequeueStyle(dep);
				});
			}
			delete obj.enqueued_styles[name];
		}
	}
}

Dipper.prototype.dequeueScript = function(name, dependencies) {

	var obj = this,
		_ = require('underscore')
		dependencies = (dependencies == undefined) ? false : dependencies;

	if (obj.scripts[name] != undefined) {
		if (obj.enqueued_scripts[name] != undefined) {
			var item = obj.scripts[name];
			if (dependencies != undefined) {
				_.each(item.require, function(dep) {
					obj.dequeueScript(dep);
				});
			}
			delete obj.enqueued_scripts[name];
		}
	}
}

Dipper.prototype.includeStyle = function(style) {
			
	var obj = this;
	if (obj.styles[style]) {

		var item = obj.styles[style],
			output = '',
			//type = item['cdn'] ? "" : 'type=\"text/javascript\"',
			resource = item['resource'],
			isAsync = item['async'] ? 'preload' : 'stylesheet',
			origin = item['origin'] != '' ? ' crossorigin=\"' + item['origin'] + '\"' : '',
			integrity = item['integrity'] != '' ? ' integrity=\"' + item['integrity'] + '\"' : '';
		
		if (item['async']) {

			var a = " as=\"style\" onload=\"this.onload=null; this.rel='stylesheet'\"";
			output = '<link rel=\"' + isAsync + '\" type=\"text/css\" href=\"' + resource + '\"' + a + integrity + origin + ">";
		} else {
			output = '<link rel=\"' + isAsync + '\" type=\"text/css\" href=\"' + resource + '\"' + integrity + origin + ">";
		}
		return output + "\n";
	}
}

Dipper.prototype.includeScript = function(script) {
	
	var obj = this;
	if (obj.scripts[script]) {

		var item = obj.scripts[script],
			output = '',
			//type = item['cdn'] ? "" : 'type=\"text/javascript\"',
			resource = item['resource'],
			isAsync = item['async'] ? ' async' : '',
			defer = item['defer'] ? ' defer' : '',
			origin = item['origin'] != '' ? ' crossorigin=\"' + item['origin'] + '\"' : '',
			integrity = item['integrity'] != '' ? ' integrity=\"' + item['integrity'] + '\"' : '';
		
		output = '<script src=\"' + resource + '\"' + defer + isAsync + integrity + origin + '></script>';
		//console.log(output);
		return output + "\n";
	}
}

Dipper.prototype.includeAnimation = function(anim) {

	let obj = this;
	if (obj.anims[anim]) {

		let item = obj.anims[anim],
			output = '',
			resource = item['resource'];

		if (!/^(https?:\/\/|\/\/)/.test(resource)) {
			let jsonAnim = obj.openJsonFile(resource);
			output = `var ${item['name']} = ${JSON.stringify(jsonAnim)};`;
		}
		return output + "\n";
	}
}

Dipper.prototype.includeStyles = function() {
	
	var obj = this,
		_ = require('underscore')
		stylesString = '',
		keys = Object.keys(obj.enqueued_styles);

	_.each(keys, function(style) {
		stylesString += obj.includeStyle(style);
	});

	//console.log(stylesString);
	//$site->executeHook('core.includeStyles');
	return stylesString;
}

Dipper.prototype.includeScripts = function () {
			
	var obj = this,
		_ = require('underscore')
		scriptsString = '',
		keys = Object.keys(obj.enqueued_scripts);

	_.each(keys, function(script) {
		scriptsString += obj.includeScript(script);
	});
	return scriptsString;
}

Dipper.prototype.includeAnimations = function() {

	let obj = this,
		_ = require('underscore'),
		animsString = '',
		keys = Object.keys(obj.anims);

	_.each(keys, function(anim) {
		animsString += obj.includeAnim(anim);
	});
	let baseAnimsString = `<script>'${animsString}'</script>`;
	return baseAnimsString;
}

Dipper.prototype.includeManifest = function() {

	var obj = this,
		url = obj.urlTo('/public/manifest.json'),
		tagString = '<link rel=\"manifest\" href=\"' + url + '\">';
	return tagString;
}

/**
 * Setup Sentry for error reporting on production and qa environments.
 */
Dipper.prototype.includeSentry = function() {

	const obj = this;

	// Falllback report error function on development
	if (obj.shared.environment === 'development') {
		return `
			<script>
				function reportError(message, data = {}) {
					console.log(message, data);
				}
			</script>`;
	}

	const releaseString = (typeof process.env.SENTRY_RELEASE === 'undefined')
		? ''
		: `<script> var SENTRY_RELEASE = '${ process.env.SENTRY_RELEASE }'; </script>`;

	const tagString = `
		<script
			src="https://browser.sentry-cdn.com/${ obj.shared.sentry.bundleVersion }/bundle.tracing.replay.min.js"
			integrity="${ obj.shared.sentry.bundleSha }"
			crossorigin="anonymous"
		></script>`;

	const loadString = `
		<script>
			if (window.Sentry) {
				Sentry.init({
					dsn: '${ obj.shared.sentry.dsn_js }',
					environment: '${ obj.shared.environment }',
					integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
					sampleRate: ${ obj.shared.sentry.sampleRate },
					tracesSampleRate: ${ obj.shared.sentry.tracesSampleRate }
				});

				function reportError(message, data = {} ) {
					Sentry.captureException(new Error(message), { extra: data });
				}
			} else {
				function reportError(message, data = {}) {
					console.log(message, data);
				}
			}
		</script>`;

	return releaseString + tagString + loadString;
}

Dipper.prototype.getStyles = function() {

	var obj = this;
	return obj.styles;
}

Dipper.prototype.getScripts = function() {
	
	var obj = this;
	return obj.scripts;
}

Dipper.prototype.template = function(template, id, templates_dir, params) {

	var obj = this,
		fs = require('fs'),
		path = require('path'),
		templates_dir = (templates_dir == undefined) ? 'assets/templates/' : templates_dir,
		params = params || [],
		dir = path.join(process.cwd(), templates_dir),
		templateString = '<script type=\"text/template\" id=\"' + id + '\">';

	fs.exists(dir, function(exists) {

    	if (exists) {

    		var tempTemplate = template + '.html';
    		if (fs.statSync(dir).isDirectory()) dir += tempTemplate;
			
			fs.readFile(dir, "binary", function(err, file) {

		  		if (err) {
		  			
		  			templateString = '<script type=\"text/template\" id=\"' + id + '\"><pre>Template ' + id + ' not found</pre></script>';
		  			return templateString;
		  		}

		  		if (file) {        
			        
			        //console.log(global.render);
			        var t = '/templates/' + tempTemplate;
			       	var data = {};
			        data['app'] = global.dipper;
			       	global.render.renderString(file, data, function(err, res) {

			       		//console.log(templateStr);

		  				templateString += '\n';
		  				templateString += '\t' + res;
		  				templateString += '\n';
		  				templateString += '</script>';
		  				templateString += '\n';
		  				//console.log(templateString);
		  				return templateString;
			       	});
		  		}
		  	});
    	}
	});
}

// -- Method to get a varable from Shared array
Dipper.prototype.getSharedVar = function(name) {

	var obj = this,
		ret = obj.shared[name] || '';
	if (ret != '') { ret = "'" + ret + "'"; }
	return ret;
}

Dipper.prototype.get_google_fonts = function(fonts) {

	let _ = require('underscore');

	if (fonts != undefined) {

		let parts = [],
			keys = Object.keys(fonts);
		_.each(keys, function(font) {

			let font_name = encodeURI(font),
				font_weight = fonts[font].join(',');
			parts.push(font_name + ':' + font_weight);
		});

		let params = parts.join('|'),
			ret = '//fonts.googleapis.com/css?family=' + params;

		return ret;
	} 
}

Dipper.prototype.includeEnvironment = function() {

	const obj = this;

	return `
		<script>
			var ENVIRONMENT = '${obj.shared.environment}';
			var API_URL = '${obj.options.api_url}';
			var VERSION = '${obj.shared.version}';
		</script>`;
}

// -- Helpers
Dipper.prototype.processCwd = function() {

	let cwd = process.cwd()
		.replace('/.grunt', '')
		.replace('/.scripts', '')
		.replace('/node_modules', '')
		.replace('/vanilla-jet', '');
	return cwd;
}

Dipper.prototype.openJsonFile = function(fileName) {

	let data = null;
	const fs = require('fs'),
		path = require('path'),
		filePath = path.join(this.processCwd(), '/' + fileName),
		exists = fs.existsSync(filePath);
	
	if (exists) {
		data = fs.readFileSync(filePath, 'utf8');
	}
	return JSON.parse(data);
}

module.exports = Dipper;
