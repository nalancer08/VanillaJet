let Request  = require('./request.js');
let Response = require('./response.js');
let _ = require('underscore');
let path = require('path');
let fs = require('fs');

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
    this.mimes = {
      'png': 'image/png',
      'webp': 'image/webp',
      'jpg': 'image/jpg',
      'css': 'text/css; charset=utf-8',
      'gz': 'application/x-gzip',
      'gif': 'image/gif',
      'js': 'text/javascript; charset=utf-8',
      'svg': 'image/svg+xml',
      'ttf': 'application/x-font-ttf',
      'otf': 'application/x-font-opentype',
      'pdf': 'application/pdf',
      'json': 'application/json'
    };
    this.compressionMimes = [ 'css', 'js' ];
    this.compressionFiles = [ 'vanilla.min.js', 'app.min.css' ];
	}

	routeToRegExp(route) {

		let optionalParam = /\((.*?)\)/g, 
      namedParam = /(\(\?)?:\w+/g, 
      splatParam = /\*\w+/g, 
      escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
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

		var obj = this, 
      insert = insert || false, 
      method = method.toLowerCase(), 
      instance = {
			  regexp: obj.routeToRegExp(route),
			  handler: handler
		  };
		// Add the route, may be at the beginning or at the end
		if (insert) { // Adding the route at the beginning of the route's array
			obj.routes[method].unshift(instance);
		} else { // Adding the route at the end of the route's array
			obj.routes[method].push(instance);
		}
	}

	onRequest(req, res) {

		let obj = this;
		let isMatch = false;
		let response = new Response(res);
		let request = new Request(req, {
			onDataReceived: function () {
				if (request.path == '') { request.path = obj.defaultRoute; }
				// -- Check GET or POST routes
				_.each(obj.routes[request.type], function (route) {
					if (request.path.match(route.regexp)) {
						let parts = route.handler.split('.'), 
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

				// -- Check static files
				if (!handled && !isMatch) {

					let ext = path.extname(req.url).replace('.', ''), 
            extHandled = false, 
            extHeader = {};
					
					if (obj.mimes[ext] != undefined && obj.mimes[ext] != 'undefined') {
						extHandled = true;
						extHeader = { 'Content-Type': obj.mimes[ext] };
					}

					if (extHandled) {

						let rep = obj.cwd.replace('core/framework', ''), 
							route = request.path,
							filename = path.join(rep, route), 
							filePrivate = obj.isProtectedFile(route);

            // -- Check if the file is a gzip file
            if (request.acceptEncoding.includes('gzip') && 
              obj.compressionMimes.includes(ext) &&
              obj.compressionFiles.includes(filename.split('/').pop())
            ) {
              filename = filename + '.gz';
              extHeader['Content-Encoding'] = 'gzip';
            }

            fs.stat(filename, (err, stats) => {

              if (err || !stats.isFile() || filePrivate) {
                return obj.onNotFound(response);
              }
              const fileStream = fs.createReadStream(filename);
              fileStream.on('error', (streamErr) => {
                console.error("Error reading file:", streamErr);
                res.writeHead(500);
                res.end('Server Error');
              });

              extHeader['Content-Length'] = stats.size;
              res.writeHead(200, extHeader);
              fileStream.pipe(res);
              res.on('close', () => {});
            });
					}
				}
			}
		}), handled = false;
		isMatch = false;
	}

	isProtectedFile(route) {
		let protectedDirs = ['framework', 'external', 'node_mudules'];
		let routeParts = route.split('/');
		if (routeParts[1] != undefined && routeParts.length > 2) {
			return protectedDirs.includes(routeParts[1]);
		}
		return true;
	}

	validateCallback(clazz, method) {
		let obj = this, 
      endpoints = obj.server.endpoints;

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
		this.defaultRoute = route;
	}

	getDefaultRoute() {
		return this.defaultRoute;
	}

	onNotFound(response) {
		response.setStatus(404);
		response.respond();
	}
}

module.exports = Router;
