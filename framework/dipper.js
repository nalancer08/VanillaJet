function Dipper(options, shared) {

	var path = require('path'),
		obj = this;

	this.options = options;
	this.shared = shared;
	this.metas = [];
	this.site_title = shared.site_name;
	this.page_title = this.site_title;
	this.description = shared.description;
	this.fbAppId = shared.fbAppId;

	this.site_url = ((this.options.site_url == 'localhost')  ? 'http://localhost' : this.options.site_url) + ':' + this.options.port;
	this.base_dir = path.join(process.cwd(), '/');
	this.base_url = this.site_url + this.options.base_url;
	
	// Dirs
	this.dirs = {

		'pages'   : '/assets/pages/',
		'parts'   : '/assets/parts/',
		'images'  : '/assets/images/',
		'scripts' : '/assets/scripts/',
		'styles'  : '/assets/styles/'
	}

	// -- Static content
	this.scripts = [];
	this.styles = [];
	this.enqueued_scripts = [];
	this.enqueued_styles = [];

	// Register base styles
	this.registerStyle('twitter-bootstrap', '//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.2.0/css/bootstrap.min.css');
	this.registerStyle('magnific-popup', '//cdnjs.cloudflare.com/ajax/libs/magnific-popup.js/0.9.9/magnific-popup.css');
	
	// Register base scripts
	this.registerScript('modernizr', '//cdnjs.cloudflare.com/ajax/libs/modernizr/2.8.2/modernizr.min.js');
	this.registerScript('respond', '//cdnjs.cloudflare.com/ajax/libs/respond.js/1.4.2/respond.js');
	this.registerScript('jquery', '//cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js');
	this.registerScript('jquery.form', '//cdnjs.cloudflare.com/ajax/libs/jquery.form/3.50/jquery.form.min.js', ['jquery']);
	this.registerScript('jquery.cycle', '//cdnjs.cloudflare.com/ajax/libs/jquery.cycle/3.03/jquery.cycle.all.min.js', ['jquery']);
	this.registerScript('magnific-popup', '//cdnjs.cloudflare.com/ajax/libs/magnific-popup.js/0.9.9/jquery.magnific-popup.min.js', ['jquery']);
	this.registerScript('twitter-bootstrap', '//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.2.0/js/bootstrap.min.js', ['jquery']);
	this.registerScript('underscore', '//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.6.0/underscore-min.js');
	this.registerScript('backbone', '//cdnjs.cloudflare.com/ajax/libs/backbone.js/1.1.2/backbone-min.js', ['underscore']);
}

Dipper.prototype.getPageTitle = function() {

	var obj = this;
	return obj.site_title;
}

Dipper.prototype.getSiteTitle = function() {

	var obj = this;
	return obj.page_title;
}

Dipper.prototype.getDescription = function() {

	var obj = this;
	return obj.description;
}

Dipper.prototype.getFbAppId = function() {

	var obj = this;
	return obj.fbAppId;
}

Dipper.prototype.addMeta = function(name, content, attribute) {

	var obj = this;
	attribute = attribute || 'name';
	content = content || '';
	var meta = [];
		meta['name'] = name;
		meta['content'] = content;
		meta['attribute'] = attribute;
	obj.metas[name] = meta;
}

Dipper.prototype.metaTags = function() {

	var obj = this;
	var _ = require('underscore');
	var stringMeta = '';

	var keys = Object.keys(obj.metas);
	_.each(keys, function(key) {

		var name = obj.metas[key]['name'],
			content = obj.metas[key]['content'],
			attribute = obj.metas[key]['attribute'];

		stringMeta += obj.metas[key]['content'] != '' ? 
			'<meta ' + attribute + '=\"' + name + '\" content=\"' + content + '\">\n\t' :
			'<meta ' + attribute + '=\"' + name + '\">\n\t';
	});

	return stringMeta;			
}

Dipper.prototype.img = function(filename) {

	var obj = this,
		dir = this.getDir('images', false);
		ret = this.urlTo(dir + filename);
		console.log(ret);
	return ret;
}

Dipper.prototype.script = function(filename) {

	var obj = this,
		dir = this.getDir('scripts', false),
		ret = this.urlTo(dir + filename);
		console.log(ret);
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

Dipper.prototype.registerStyle = function(name, url, requires) {
	
	var obj = this;
	obj.styles[name] = {
		'resource' : url,
		'requires' : requires
	};
}

Dipper.prototype.registerScript = function(name, url, requires) {
	
	var obj = this;
	obj.scripts[name] = {

		'resource' : url,
		'requires' : requires
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
	if (obj.styles[style] != undefined) {

		var item = obj.styles[style];
		//output = site->executeHook('core.includeStyle', $item);
		var output = '<link rel=\"stylesheet\" type=\"text/css\" href=\"' + item['resource'] + '\">';
		return output + "\n";
	}
}

Dipper.prototype.includeScript = function(script) {
	
	var obj = this;
	if (obj.scripts[script]) {
		var item = obj.scripts[script];
		//$output = $site->executeHook('core.includeScript', $item);
		var output = '<script type=\"text/javascript\" src=\"' + item['resource'] + '\"></script>';
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
	//$site->executeHook('core.includeScripts');
	return scriptsString;
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
			        
	  				templateString += '\n';
	  				templateString += file;
	  				templateString += '\n\t';
	  				templateString += '</script>';
	  				templateString += '\n\n';
	  				console.log(templateString);
	  				return templateString;
		  		}
		  	});
    	}
	});
}

module.exports = Dipper;