function Dipper(options, shared) {

	var path = require('path');

	this.options = options;
	this.shared = shared;
	this.metas = [];
	this.site_title = shared.site_name;
	this.page_title = this.site_title;
	this.description = shared.description;
	this.fbAppId = shared.fbAppId;

	this.base_dir = path.join(process.cwd(), '/');
	this.base_url = (this.options.site_url == 'localhost')  ? 'http://localhost' : this.options.site_url + 
					':' + this.options.port + this.options.base_url;
	console.log("Dipper instance");
	console.log(this.base_dir);

	// Dirs
	this.dirs = {

		'pages'   : '/aasets/pages',
		'parts'   : '/aasets/parts',
		'images'  : '/aasets/images',
		'scripts' : '/aasets/scripts',
		'styles'  : '/aasets/css'
	}
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

	//console.log(obj.metas);
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
	return ret;
}

Dipper.prototype.getDir = function(dir, full) {
	
	var obj = this,
		full = full || true;

	if ( obj.dirs[dir] != undefined ) {
		return (full ? obj.baseDir(obj.dirs[dir]) : obj.dirs[dir]);
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

Dipper.prototype.baseUrl = function(path, protocol) {
	
	var obj = this,
		path = path || '',
		protocol = protocol || undefined,
		base_url = obj.base_url.replace(new RegExp("[" + '\\/' + "]*$"), '');

	if (protocol == undefined && obj.isSecureRequest() ) {

		base_url = base_url.replace('http://', 'https://');

	} else if (protocol) {

		protocol += protocol.lastIndexOf(':') > 0 ? '' : ':';
		base_url = base_url.replace('http:', protocol);
	}

	if ( path != '' && path[0] != '/' ) {
		path = '/' + path;
	}

	var ret = base_url + path;
	return ret;
}

Dipper.prototype.urlTo = function(route, protocol) {

	var obj = this,
		protocol = protocol || undefined,
		url = obj.baseUrl(route, protocol);
	return url;
}

module.exports = Dipper;