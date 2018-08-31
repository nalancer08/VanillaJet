/**
	Version 3.5
	Created by: nalancer08 <https://github.com/nalancer08>
	Revised by: nalancer08 <https://github.com/nalancer08>
**/

var Request  = require('./request.js');
var endpoints = require('../external/functions.js').endpoints;

var _ = require('underscore');
var url = require('url') ;
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var WebSocketRouterRequest = require('../node_modules/websocket/lib/WebSocketRouterRequest.js');

function WebSocketRouter(wsServer, server) {

	EventEmitter.call(this);

	this.routes = [];
	this.wsServer = wsServer;
	this.server = server;
	this._requestHandler = this.handleRequest.bind(this);

	this.attachServer();
}

//util.inherits(WebSocketRouter, EventEmitter);

WebSocketRouter.prototype.attachServer = function() {

    if (this.wsServer) {
        this.wsServer.on('request', this._requestHandler);
    }
    else {
        throw new Error('You must specify a WebSocketServer instance to attach to.');
    }
};

WebSocketRouter.prototype.detachServer = function() {

    if (this.wsServer) {
        this.wsServer.removeListener('request', this._requestHandler);
        this.wsServer = null;
    }
    else {
        throw new Error('Cannot detach from server: not attached.');
    }
};

WebSocketRouter.prototype.addRoute = function(route, handler, protocol) {

	var obj = this,
	insert = insert || false,
	protocol = protocol || 'lws-mirror-protocol',
	protocol = protocol.toLocaleLowerCase(),
	prev = (obj.server.options.base_url && obj.server.options.base_url != '' && obj.server.options.base_url != '/') ? obj.server.options.base_url : '',
	instance = {
		regexp: obj.routeToRegExp(prev + route),
		handler: handler,
		protocol: protocol
	};
	// Add the route, may be at the beginning or at the end
	if (insert) { // Adding the route at the beginning of the route's array
		obj.routes.unshift(instance);
	} else { // Adding the route at the end of the route's array
		obj.routes.push(instance);
	}
};

WebSocketRouter.prototype.routeToRegExp = function(route) {

	var optionalParam = /\((.*?)\)/g,
		namedParam    = /(\(\?)?:\w+/g,
		splatParam    = /\*\w+/g,
		escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;
	// Convert route to regular expression, this was taken from Backbone's router
	route = route.replace(escapeRegExp, '\\$&')
			.replace(optionalParam, '(?:$1)?')
			.replace(namedParam, function(match, optional) {
			return optional ? match : '([^/?]+)';
		})
		.replace(splatParam, '([^?]*?)');
	return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
}

WebSocketRouter.prototype.handleRequest = function(request) {

	var obj = this,
		handled = false,
		isMatch = false,
		httpxReq = request.httpRequest,
		req = new Request(httpxReq);

    // Try with the routes for the current method (get or post)
	_.each(obj.routes, function(route) {
		if (route.regexp.test(request.resourceURL.pathname)) {

			// Printing route access
			/*var hostname = httpxReq.headers.host; // hostname = 'localhost:8080'
	  		var pathname = url.parse(httpxReq.url).pathname; // pathname = '/MyApp'
	  		console.log('ws://' + hostname + pathname);*/

			var parts = route.handler.split('.'),
				clazz = parts[0],
				method = parts[1],
				callback = obj.validateCallback(clazz, method);

			if (callback && callback != undefined && callback != '') {

				isMatch = true;
				var socket = new WebSocketRouterRequest(request, route.protocol),
				handled = callback(req, socket, obj.server);
				return;
			}
		}
	});

	// If we get here we were unable to find a suitable handler.
	if (handled == false && isMatch == false ) {
		// If we get here we were unable to find a suitable handler.
		request.reject(404, 'No handler is available for the given request.');
	}
};

WebSocketRouter.prototype.validateCallback = function(clazz, method) {

	var obj = this,
		endpoints = obj.server.functions.endpoints;

	if (endpoints[clazz] != undefined) {

		clazz = endpoints[clazz];

		if (typeof clazz[method] === 'function') {
			return clazz[method];
		}
	}
	return '';
}

module.exports = WebSocketRouter;