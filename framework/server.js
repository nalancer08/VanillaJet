/**
	Version 3.5
	Created by: biohzrd <https://github.com/biohzrd>
	Revised by: nalancer08 <https://github.com/nalancer08>
	Last revision: 25/07/2017
**/

var _ = require('underscore');
var http = require('http');
var https = require('https');
var url = require('url') ;
var crypto = require('crypto');
var fs = require('fs');
var nunjucks = require('nunjucks');
var path = require('path');

var Request  = require('./request.js');
var Response = require('./response.js');
var Router = require('./router.js');
var Dipper = require('./dipper.js');
var Functions = require('../external/functions.js');

function Server(options) {

	this.http = null;
	this.verbose = true;
	this.router = null;
	this.functions = null;
	this.dipper = null;
	// Call initialization callback
	this.init(options);
}

Server.prototype.init = function(options) {

	var obj = this,
		settings = options.settings,
		opts = settings[options.profile] || {},
		shared = settings['shared'] || {},
		security = settings['security'] || {};

	_.defaults(opts, {
		base_url: '',
		site_url: '',
		wsServer: false,
		onNotFound: obj.onNotFound
	});
	obj.options = opts;

	_.defaults(security, {
		pass_salt: '1234567890',
		token_salt: '0987654321',
		version: '1.0'
	});
	obj.security = security;

	// Render
	global.render = nunjucks.configure(path.join(process.cwd(), 'assets'), { autoescape: false, noCache: true, async : true });

	// Setting Dipper instance
	global.dipper = new Dipper(opts, shared);

	// Cheking for http or https
	if (/^((http):\/\/)/.test(obj.options.site_url) || /^((localhost))/.test(obj.options.site_url)) {

		// Create the base HTTP server and bind the request handler
		obj.httpx = http.createServer(function(req, res) {

			var hostname = req.headers.host; // hostname = 'localhost:8080'
	  		var pathname = url.parse(req.url).pathname; // pathname = '/MyApp'
	  		console.log('http://' + hostname + pathname);
			obj.router.onRequest.call(obj.router, req, res);
		});
	} else if (/^((https):\/\/)/.test(obj.options.site_url)) {

		// Setting options for https server
		certs = {
			key: fs.readFileSync('./external/certs/' + obj.security.key),
			cert: fs.readFileSync('./external/certs/' + obj.security.cert)
		};

		// Creating HTTPS server
		obj.httpx = https.createServer(certs, (req, res) => {
			var hostname = req.headers.host; // hostname = 'localhost:8080'
	  		var pathname = url.parse(req.url).pathname; // pathname = '/MyApp'
	  		console.log('https://' + hostname + pathname);
			obj.router.onRequest.call(obj.router, req, res);
		});
	}

	obj.onNotFound = opts.onNotFound;

	// Initialize router
	obj.router = new Router(obj);

	// Setting endpoints
	obj.functions = new Functions(obj);
}

Server.prototype.start = function() {

	var obj = this;
	var port = (obj.options.port && obj.options.port != '') ? obj.options.port : 8080;

	// Listen on the specified port
	obj.httpx.listen(port);

	// Logging
	obj.log('__________________  Dragonfly server started  ___________________');
	obj.log(' >           Listening on ' + obj.options.site_url + ':' + obj.options.port + obj.options.base_url + '         < ');
	obj.log('-----------------------------------------------------------------');
}

Server.prototype.log = function(value) {

	var obj = this;
	if (obj.verbose) {
		console.log(value);
	}
}

Server.prototype.onNotFound = function(request, response) {

	response.setStatus(404);
	response.respond(); // response.res.end();
	//return true;
}

Server.prototype.hashToken = function(value) {

	var obj = this,
		security = obj.security;

	return crypto.createHash('md5').update(security.token_salt + value).digest('hex');
}

Server.prototype.shaToken = function(value) {

	var obj = this,
		security = obj.security;

	return crypto.createHash('sha512').update(security.token_salt + value).digest('hex');
}

Server.prototype.hashPassword = function(value) {

	var obj = this,
		security = obj.security;

	return crypto.createHash('md5').update(security.pass_salt + value).digest('hex');
}

Server.prototype.shaPassword = function(value) {

	var obj = this,
		security = obj.security;

	return crypto.createHash('sha512').update(security.pass_salt + value).digest('hex');
}

Server.prototype.validateToken = function(token, value) {

	var obj = this,
		security = obj.security,
		check = obj.hashToken(value);
			
	return (token == check);
}

Server.prototype.validateShaToken = function(token, value) {

	var obj = this,
		security = obj.security,
		check = obj.shaToken(value);

	return (token == check);
}

module.exports = Server;