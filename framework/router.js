/**
	Version 3.5
	Created by: nalancer08 <https://github.com/nalancer08>
	Revised by: nalancer08 <https://github.com/nalancer08>
**/

var Request  = require('./request.js');
var Response = require('./response.js');
var endpoints = require('../external/functions.js').endpoints;

var _ = require('underscore');
var url = require('url');

function Router(server) {

	this.routes = {
		"*": [],
		"get": [],
		"post": []
	};
	this.defaultRoute = '';
	this.server = server;
}

Router.prototype.routeToRegExp = function(route) {

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

Router.prototype.addRoute = function(method, route, handler, insert) {

	var obj = this,
		insert = insert || false,
		method = method.toLowerCase(),
		prev = (obj.server.options.base_url && obj.server.options.base_url != '' && obj.server.options.base_url != '/') ? obj.server.options.base_url : '',
		instance = {
			regexp: obj.routeToRegExp(prev + route),
			handler: handler
		};
	// Add the route, may be at the beginning or at the end
	if (insert) { // Adding the route at the beginning of the route's array
		obj.routes[method].unshift(instance);
	} else { // Adding the route at the end of the route's array
		obj.routes[method].push(instance);
	}
}

Router.prototype.removeRoute = function(method, route) {
	
	// TBD
}

Router.prototype.onRequest = function(req, res) {

	var obj = this;
	var isMatch = false;
	var response = new Response(res);
	var request = new Request(req, {
		onDataReceived: function() {

			//console.log(request.path);
			if (request.path == obj.server.options.base_url) {
				request.path = obj.server.options.base_url + obj.defaultRoute;
			}

			// Try with the routes for the current method (get or post)
			_.each(obj.routes[request.type], function(route) {
				if ( request.path.match(route.regexp) ) {

					var parts = route.handler.split('.'),
						clazz = parts[0],
						method = parts[1],
						callback = obj.validateCallback(clazz, method);

					if (callback && callback != undefined && callback != '') {

						isMatch = true;
						handled = callback(request, response, obj.server);
						return;
					}
				}
			});

			// If not handled yet, try with the wildcard ones
			if (!handled) {
				_.each(obj.routes["*"], function(route) {

					if ( request.path.match(route.regexp) ) {

						var parts = route.handler.split('.'),
							clazz = parts[0],
							method = parts[1],
							callback = obj.validateCallback(clazz, method);

						if (callback && callback != undefined && callback != '') {

							isMatch = true;
							handled = callback(request, response, obj.server);
							return;
						}
					}
				});
			}

			// Not handled? Well, at this point we call 404
			if (handled == false && isMatch == false ) {

				if(req.url.match("\.png$") || req.url.match("\.ico$")) {

					var path = require('path'),
						fs = require('fs'),
						rep = __dirname.replace('framework', ''),
			       		filename = path.join(rep, request.path);

			       	fs.exists(filename, function(exists) {

			       		if (exists) {

			       			var fileStream = fs.createReadStream(filename);
				       		res.writeHead(200, {"Content-Type": "image/png"});
				        	fileStream.pipe(res);
				        	return;

			       		} else {

			       			// Return 404
			   				obj.onNotFound(request, response);
			       		}
			       	});
			    }

			    
			}
		}
	}),
	handled = false;
	isMatch = false;
}

Router.prototype.validateCallback = function(clazz, method) {

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
/**
* This method allows to set the default route for the api
* @param route: String name for the route
**/
Router.prototype.setDefaultRoute = function(route) {

	var obj = this;
	obj.defaultRoute = route;
}

Router.prototype.getDefaultRoute = function() {

	var obj = this,
		prev = (obj.server.options.base_url && obj.server.options.base_url != '' && obj.server.options.base_url != '/') ? obj.server.options.base_url : '';

	return (prev + obj.defaultRoute);
}

Router.prototype.onNotFound = function(request, response) {

	response.setStatus(404);
	response.respond(); // response.res.end();
	//return true;
}

module.exports = Router;