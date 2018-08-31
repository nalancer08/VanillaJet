/**
	Version 3.0
	Created by: nalancer08 <https://github.com/nalancer08>
	Revised by: nalancer08 <https://github.com/nalancer08>
**/

var url = require('url');
var querystring = require('querystring');

function Request(req, options) {

	this.params = {
		get: {},
		post: {}
	};
	this.format = 'html';
	this.type = 'get';
	this.controller = 'index';
	this.action = 'index';
	this.id = '';
	this.path = '';
	this.parts = [];
	// Call initialization callback
	this.init(req, options);
}

Request.prototype.init = function(req, options) {

	var obj = this,
		body = '',
		options = options || {},
		parsed = url.parse(req.url, true),
		server = require('../index').server;

	// Save callbacks
	obj.onDataReceived = options.onDataReceived || obj.onDataReceived;
	// Save request method (get, post, etc)
	obj.type = req.method.toLowerCase();
	// Parse path parts
	obj.path = parsed.pathname.replace(/\/$/, ''); // This is important
	obj.parts = parsed.pathname.replace(/(^\/|\/$)/, '').split('/');

	// // Try to guess MVC parameters
	// obj.controller = obj.parts[0] || '';
	// obj.action = obj.parts[1] || '';
	// obj.id = obj.parts[2] || '';
	obj.controller = 'app';
	obj.action = obj.parts[0];
	obj.id = obj.parts[1] || null;

	// Patch for hanlde default route
	if (obj.action == '' && obj.path == '') {
		if ( server != null && server.getDefaultRoute() != '') {
			obj.path = server.getDefaultRoute();
		}
	}

	/*console.log("======= Start ========");
	console.log(obj.action);
	console.log(obj.path);
	console.log("======= End ========");*/

	// Patch for catch if not pass second parameter
	if (obj.id == undefined || obj.id === 'undefined' || obj.id == null) {
		obj.id = null;
	}

	/*console.log("======= Start ========");
	console.log(obj.id);
	console.log("======= End ========");*/

	// Get output format (if specified)
	//if (obj.id && obj.id != undefined && obj.id !== 'undefined') {
	var matches = (obj.id == null) ? null : obj.id.match(/\.([a-z0-9]+)$/);
	if (matches) {
			obj.format = matches[1] || 'html';
			obj.id = obj.id.replace(/\.([a-z0-9]+)$/, '');
	}
	//}

	// Stream request body
	req.on('data', function(chunk) {
		body += chunk.toString();
	});
	// Parse GET and POST params
	obj.params.get = parsed.query;
	req.on('end', function(chunk) {
		obj.params.post = querystring.parse(body);
		obj.onDataReceived.call(obj);
	});
}

/**
* This method try to get a parameter from GET OR POST global parameters
* @param name: Name of the parameter
* @param value: Default value if the parameter is missing
**/
Request.prototype.param = function(name, value) {

	var obj = this,
		ret = value || '';
	// Try to retrieve parameter from both, POST and GET objects
	if ( typeof obj.params.post[name] !== 'undefined' ) {
		ret = obj.params.post[name];
	} else if ( typeof obj.params.get[name] !== 'undefined' ) {
		ret = obj.params.get[name];
	}
	return ret;
}

Request.prototype.post = function(name, value) {

	var obj = this,
		ret = value || '';
	// Try to retrieve parameter from POST object
	if ( typeof obj.params.post[name] !== 'undefined' ) {
		ret = obj.params.post[name];
	}
	return ret;
}

Request.prototype.get = function(name, value) {

	var obj = this,
		ret = value || '';
	// Try to retrieve parameter from GET object
	if ( typeof obj.params.get[name] !== 'undefined' ) {
		ret = obj.params.get[name];
	}
	return ret;
}

Request.prototype.onDataReceived = function() {
	
	// Interface
}

module.exports = Request;