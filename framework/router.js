let Request  = require('./request.js');
let Response = require('./response.js');
let _ = require('underscore');

class Router {

	constructor(server) {

		this.routes = {
			'*': [],
			'get': [],
			'post': []
		};
		this.defaultRoute = '';
		this.server = server;
		this.cwd = process.cwd();
	}

	routeToRegExp(route) {

		var optionalParam = /\((.*?)\)/g, namedParam = /(\(\?)?:\w+/g, splatParam = /\*\w+/g, escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
		// Convert route to regular expression, this was taken from Backbone's router
		route = route.replace(escapeRegExp, '\\$&')
			.replace(optionalParam, '(?:$1)?')
			.replace(namedParam, function (match, optional) {
				return optional ? match : '([^/?]+)';
			})
			.replace(splatParam, '([^?]*?)');
		return new RegExp(`^${route}(?:\\?([\\s\\S]*))?$`);
	}

	addRoute(method, route, handler, insert) {

		var obj = this, insert = insert || false, method = method.toLowerCase(), prev = (obj.server.options.base_url && obj.server.options.base_url != '' && obj.server.options.base_url != '/') ? obj.server.options.base_url : '', instance = {
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

	removeRoute(method, route) {}

	onRequest(req, res) {

		let obj = this;
		let isMatch = false;
		let zlib = require('zlib');
		let response = new Response(res);
		let request = new Request(req, {
			onDataReceived: function () {

				//console.log(request.path);
				if (request.path == obj.server.options.base_url) {
					request.path = obj.server.options.base_url + obj.defaultRoute;
				}
				//console.log(request.path);
				// Try with the routes for the current method (get or post)
				_.each(obj.routes[request.type], function (route) {
					if (request.path.match(route.regexp)) {

						var parts = route.handler.split('.'), clazz = parts[0], method = parts[1], callback = obj.validateCallback(clazz, method);

						if (callback && callback != undefined && callback != '') {

							isMatch = true;
							handled = callback(request, response, obj.server);
							return;
						}
					}
				});

				// If not handled yet, try with the wildcard ones
				if (!handled) {
					_.each(obj.routes['*'], function (route) {

						if (request.path.match(route.regexp)) {

							var parts = route.handler.split('.'), clazz = parts[0], method = parts[1], callback = obj.validateCallback(clazz, method);

							if (callback && callback != undefined && callback != '') {

								isMatch = true;
								handled = callback(request, response, obj.server);
								return;
							}
						}
					});
				}

				// No route catched, maybe it's a static content
				// or not handled? Well, at this point we call 404
				if (handled == false && isMatch == false) {

					var path = require('path'), ext = path.extname(req.url).replace('.', ''), extHandled = false, extHeader = {};
					var mimes = {
						'png': 'image/png',
						'webp': 'image/webp',
						'jpg': 'image/jpg',
						'css': 'text/css',
						'gz': 'application/x-gzip',
						'gif': 'image/gif',
						'js': 'text/javascript',
						'svg': 'image/svg+xml',
						'ttf': 'application/x-font-ttf',
						'otf': 'application/x-font-opentype',
						'pdf': 'application/pdf',
						'json': 'application/json'
					};

					var compressionMimes = {
						'css': 'text/css',
						'js': 'text/javascript',
						'gz': 'application/x-gzip'
					};

					if (mimes[ext] != undefined && mimes[ext] != 'undefined') {

						extHandled = true;
						extHeader = { 'Content-Type': mimes[ext] };
					}

					if (extHandled) {

						let fs = require('fs'), 
							rep = obj.cwd.replace('core/framework', ''), 
							route = request.path.replace(obj.server.options.base_url, ''), 
							filename = path.join(rep, route), 
							filePrivate = obj.isProtectedFile(route);

						fs.exists(filename, function (exists) {

							if (exists && !filePrivate) {

								var acceptEncoding = (req.headers['accept-encoding'] != undefined) ? req.headers['accept-encoding'] : '';
								var fileStream = fs.createReadStream(filename);

								if (ext === 'js' && !route.match(/vanilla\.min\.js$/)) {
									extHeader['Cache-Control'] = 'public, max-age=15552000'; 
									extHeader['Expires'] = new Date(Date.now() + 15552000000).toUTCString();
								}

								if (acceptEncoding.match(/\bgzip\b/) && compressionMimes[ext] != undefined) {
									extHeader['Content-Encoding'] = 'gzip';
									res.writeHead(200, extHeader);
									fileStream.pipe(zlib.createGzip()).pipe(res);
								} else {
									res.writeHead(200, extHeader);
									fileStream.pipe(res);
								}
								return;

							} else {

								// Return 404
								obj.onNotFound(response);
							}
						});
					}
				}
			}
		}), handled = false;
		isMatch = false;
	}

	isProtectedFile(route) {

		let protectedDirs = ['framework', 'external', 'node_mudules'];
		var routeParts = route.split('/');
		if (routeParts[1] != undefined && routeParts.length > 2) {
			return protectedDirs.includes(routeParts[1]);
		}
		return true;
	}

	validateExtension(route) {}

	validateCallback(clazz, method) {

		var obj = this, endpoints = obj.server.functions.endpoints;

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
	setDefaultRoute(route) {

		var obj = this;
		obj.defaultRoute = route;
	}

	getDefaultRoute() {

		var obj = this, prev = (obj.server.options.base_url && obj.server.options.base_url != '' && obj.server.options.base_url != '/') ? obj.server.options.base_url : '';

		return (prev + obj.defaultRoute);
	}

	onNotFound(response) {

		response.setStatus(404);
		response.respond();
	}
}

module.exports = Router;
