function Dipper(options) {

	this.options = options;
	this.metas = [];
	this.site_title = options.site_name;
	this.page_title = this.site_title;
	this.description = options.description;

	console.log(this.site_title);
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

module.exports = Dipper;