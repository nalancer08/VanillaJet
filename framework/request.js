let url = require('url');
let querystring = require('querystring');

class Request {

	constructor(req, options) {

		this.params = {
			get: {},
			post: {},
			body: ''
		};
		this.format = 'html';
		this.type = 'get';
		this.controller = 'index';
		this.action = 'index';
		this.id = '';
		this.path = '';
		this.parts = [];
		this.init(req, options);
	}

	init(req, options) {

		var obj = this, body = '', options = options || {}, parsed = url.parse(req.url, true);

		// Save callbacks
		obj.onDataReceived = options.onDataReceived || obj.onDataReceived;
		// Save request method (get, post, etc)
		obj.type = req.method.toLowerCase();
		// Parse path parts
		obj.path = parsed.pathname.replace(/\/$/, '');
		obj.parts = parsed.pathname.replace(/(^\/|\/$)/, '').split('/');

		// -- Defaults
		obj.controller = 'app';
		obj.action = obj.parts[0];
		obj.id = obj.parts[1] || null;

		// Patch for catch if not pass second parameter
		if (obj.id == undefined || obj.id === 'undefined' || obj.id == null) {
			obj.id = null;
		}

		// Matches
		var matches = (obj.id == null) ? null : obj.id.match(/\.([a-z0-9]+)$/);
		if (matches) {
			obj.format = matches[1] || 'html';
			obj.id = obj.id.replace(/\.([a-z0-9]+)$/, '');
		}

		// Stream request body
		req.on('data', function (chunk) {
			body += chunk.toString();
		});
		// Parse GET and POST params
		obj.params.get = parsed.query;
		req.on('end', function (chunk) {
			obj.params.body = body;
			obj.params.post = querystring.parse(body);
			obj.onDataReceived.call(obj);
		});
	}

	/**
	* This method try to get a parameter from GET OR POST global parameters
	* @param name: Name of the parameter
	* @param value: Default value if the parameter is missing
	**/
	param(name, value) {

		var obj = this, ret = value || '';
		// Try to retrieve parameter from both, POST and GET objects
		if (typeof obj.params.post[name] !== 'undefined') {
			ret = obj.params.post[name];
		} else if (typeof obj.params.get[name] !== 'undefined') {
			ret = obj.params.get[name];
		}
		return ret;
	}

	post(name, value) {

		var obj = this, ret = value || '';
		// Try to retrieve parameter from POST object
		if (typeof obj.params.post[name] !== 'undefined') {
			ret = obj.params.post[name];
		}
		return ret;
	}

	get(name, value) {

		var obj = this, ret = value || '';
		// Try to retrieve parameter from GET object
		if (typeof obj.params.get[name] !== 'undefined') {
			ret = obj.params.get[name];
		}
		return ret;
	}

	body() {

		var obj = this;
		return obj.params.body;
	}
}

Request.prototype.onDataReceived = function() {}

module.exports = Request;