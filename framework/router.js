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
    this.staticBasePath = this.cwd.replace('core/framework', '');
    this.staticMetadataCache = new Map();
    this.staticResolutionCache = new Map();
    this.staticStreamChunkSize = 128 * 1024;
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
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'eot': 'application/vnd.ms-fontobject',
      'ico': 'image/x-icon',
      'pdf': 'application/pdf',
      'json': 'application/json'
    };
    this.mimeHeaders = Object.keys(this.mimes).reduce((headers, ext) => {
      headers[ext] = { 'Content-Type': this.mimes[ext] };
      return headers;
    }, {});
    this.compressionMimes = [ 'css', 'js' ];
    this.compressionFiles = [ 'vanilla.min.js', 'app.min.css' ];
    this.enablePrecompressedNegotiation = Boolean(server?.options?.enable_precompressed_negotiation);
    this.enableServiceWorker = Boolean(server?.options?.enable_service_worker);
    // Cache-Control max-age (seconds) for NON-versioned static assets (images, fonts,
    // animation JSON…). Lets the browser reuse them across references/reloads instead of
    // revalidating each time. Versioned (?v=) assets stay immutable; 0 keeps no-cache.
    this.staticCacheMaxAge = Number(server?.options?.static_cache_max_age) || 0;
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
		let response = new Response(res, obj.server.options);
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

				// -- Service worker: served from root scope so it can control the whole origin
				if (!handled && !isMatch && obj.enableServiceWorker && request.path === '/sw.js') {
					return obj.serveServiceWorker(res);
				}

				// -- Check static files
				if (!handled && !isMatch) {

					let ext = path.extname(request.path).replace('.', ''),
            extHandled = false, 
            extHeader = {};
					
					if (obj.mimes[ext] != undefined && obj.mimes[ext] != 'undefined') {
						extHandled = true;
						extHeader = obj.mimeHeaders[ext];
					}

					if (extHandled) {

						let route = request.path,
							filename = path.join(obj.staticBasePath, route), 
							filePrivate = obj.isProtectedFile(route);

            if (filePrivate) {
              return obj.onNotFound(response);
            }

            let staticCandidates = obj.getStaticCandidates(request, ext, filename);
            let hasConditionalHeaders = Boolean(req.headers['if-none-match'] || req.headers['if-modified-since']);
            obj.resolveFirstAvailableStaticFile(route, request.acceptEncoding, staticCandidates, hasConditionalHeaders, (err, staticFile) => {
              if (err || !staticFile) {
                return obj.onNotFound(response);
              }

              let metadata = staticFile.metadata;
              // Fingerprinted assets (requested with ?v=size-mtime) are safe to cache forever:
              // any content change produces a new URL. Everything else keeps revalidation.
              let isImmutable = Boolean(request.get('v'));
              let staticHeaders = obj.buildStaticHeaders(extHeader, staticCandidates, staticFile.contentEncoding, metadata, isImmutable);

              if (obj.isNotModified(req, metadata)) {
                let notModifiedHeaders = Object.assign({}, staticHeaders);
                delete notModifiedHeaders['Content-Length'];
                res.writeHead(304, notModifiedHeaders);
                return res.end();
              }

              const fileStream = fs.createReadStream(staticFile.filename, {
                highWaterMark: obj.staticStreamChunkSize
              });
              fileStream.on('error', (streamErr) => {
                obj.staticMetadataCache.delete(staticFile.filename);
                obj.staticResolutionCache.clear();
                console.error("Error reading file:", streamErr);
                res.writeHead(500);
                res.end('Server Error');
              });
              res.on('close', () => {
                if (!res.writableEnded) {
                  fileStream.destroy();
                }
              });

              res.writeHead(200, staticHeaders);
              fileStream.pipe(res);
            });
					} else {
            return obj.onNotFound(response);
          }
				}
			}
		}), handled = false;
		isMatch = false;
	}

  getStaticFileMetadata(filename, forceRefresh, callback) {
    let obj = this;
    forceRefresh = forceRefresh || false;
    let cachedMetadata = obj.staticMetadataCache.get(filename);
    if (cachedMetadata && !forceRefresh) {
      return callback(null, cachedMetadata);
    }

    fs.stat(filename, (err, stats) => {
      if (err || !stats.isFile()) {
        return callback(err || new Error('File not found'));
      }

      let metadata = {
        size: stats.size,
        lastModified: stats.mtime.toUTCString(),
        etag: `W/"${stats.size}-${Math.floor(stats.mtimeMs)}"`
      };

      obj.staticMetadataCache.set(filename, metadata);
      callback(null, metadata);
    });
  }

  getStaticCandidates(request, ext, filename) {
    let obj = this;
    let candidates = [{ filename: filename, contentEncoding: '' }];
    // Any compressible type can be served precompressed; resolveFirstAvailableStaticFile
    // falls back to the original when a .br/.gz sibling doesn't exist. This lets ALL
    // self-hosted assets (vendor libs, plugins, …) be served gzip/brotli, not just the
    // app bundle — otherwise self-hosting a large lib would ship it uncompressed.
    let isCompressible = obj.compressionMimes.includes(ext);
    if (!isCompressible) {
      return candidates;
    }

    let compressedCandidates = [];
    if (obj.enablePrecompressedNegotiation && obj.supportsEncoding(request.acceptEncoding, 'br')) {
      compressedCandidates.push({
        filename: filename + '.br',
        contentEncoding: 'br'
      });
    }

    if (obj.supportsEncoding(request.acceptEncoding, 'gzip')) {
      compressedCandidates.push({
        filename: filename + '.gz',
        contentEncoding: 'gzip'
      });
    }

    return compressedCandidates.concat(candidates);
  }

  resolveFirstAvailableStaticFile(route, acceptEncoding, candidates, forceRefresh, callback) {
    let obj = this;
    let resolutionKey = obj.getStaticResolutionKey(route, acceptEncoding);
    let cachedResolution = obj.staticResolutionCache.get(resolutionKey);
    if (cachedResolution) {
      return obj.getStaticFileMetadata(cachedResolution.filename, forceRefresh, (cachedErr, cachedMetadata) => {
        if (!cachedErr && cachedMetadata) {
          return callback(null, {
            filename: cachedResolution.filename,
            contentEncoding: cachedResolution.contentEncoding,
            metadata: cachedMetadata
          });
        }
        obj.staticResolutionCache.delete(resolutionKey);
        obj.resolveFirstAvailableStaticFile(route, acceptEncoding, candidates, forceRefresh, callback);
      });
    }

    let index = 0;
    function resolveCandidate() {
      let currentCandidate = candidates[index];
      if (!currentCandidate) {
        return callback(new Error('No static file found'));
      }

      obj.getStaticFileMetadata(currentCandidate.filename, forceRefresh, (err, metadata) => {
        if (!err && metadata) {
          obj.staticResolutionCache.set(resolutionKey, {
            filename: currentCandidate.filename,
            contentEncoding: currentCandidate.contentEncoding
          });
          return callback(null, {
            filename: currentCandidate.filename,
            contentEncoding: currentCandidate.contentEncoding,
            metadata: metadata
          });
        }
        index = index + 1;
        resolveCandidate();
      });
    }

    resolveCandidate();
  }

  getStaticResolutionKey(route, acceptEncoding) {
    let normalizedEncodings = Array.isArray(acceptEncoding) ? acceptEncoding.join(',') : '';
    return `${route}|${normalizedEncodings}`;
  }

  buildStaticHeaders(extHeader, candidates, contentEncoding, metadata, isImmutable) {
    let obj = this;
    let staticHeaders = Object.assign({}, extHeader);
    if (contentEncoding) {
      staticHeaders['Content-Encoding'] = contentEncoding;
    }
    if (candidates.some((candidate) => candidate.contentEncoding)) {
      staticHeaders['Vary'] = 'Accept-Encoding';
    }

    staticHeaders['Content-Length'] = metadata.size;
    staticHeaders['ETag'] = metadata.etag;
    staticHeaders['Last-Modified'] = metadata.lastModified;
    if (isImmutable) {
      // Fingerprinted URL (?v=): cache for a year and skip revalidation entirely.
      // This is the big win for clients without the service worker (e.g. native WebViews),
      // which otherwise revalidate every asset on every load.
      staticHeaders['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else if (obj.staticCacheMaxAge > 0) {
      // Non-versioned assets (images, fonts, animation JSON…): cache for a while so they
      // aren't re-fetched on every reference/reload. ETag/Last-Modified still allow a cheap
      // 304 after expiry. Pick this when assets change rarely (e.g. a few days/weeks).
      staticHeaders['Cache-Control'] = `public, max-age=${obj.staticCacheMaxAge}`;
    } else {
      // Default: force revalidation to keep clients fresh without a hard reload.
      staticHeaders['Cache-Control'] = 'no-cache, must-revalidate';
    }
    return staticHeaders;
  }

  supportsEncoding(acceptEncoding, encoding) {
    if (!Array.isArray(acceptEncoding)) {
      return false;
    }

    let normalizedEncoding = String(encoding).toLowerCase();
    return acceptEncoding.some((entry) => {
      if (entry == null) {
        return false;
      }
      let token = String(entry).toLowerCase();
      let parts = token.split(';');
      if (parts[0] !== normalizedEncoding) {
        return false;
      }

      let qValue = 1;
      for (let idx = 1; idx < parts.length; idx = idx + 1) {
        let part = parts[idx];
        if (part.startsWith('q=')) {
          let parsedQValue = parseFloat(part.slice(2));
          if (!Number.isNaN(parsedQValue)) {
            qValue = parsedQValue;
          }
        }
      }

      return qValue > 0;
    });
  }

  isNotModified(req, metadata) {
    let ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch) {
      let etags = ifNoneMatch.split(',').map((etag) => etag.trim());
      if (etags.includes(metadata.etag)) {
        return true;
      }
    }

    let ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince) {
      let requestModifiedSince = new Date(ifModifiedSince).getTime();
      let fileModifiedAt = new Date(metadata.lastModified).getTime();
      if (!Number.isNaN(requestModifiedSince) && requestModifiedSince >= fileModifiedAt) {
        return true;
      }
    }

    return false;
  }

	isProtectedFile(route) {
		let protectedDirs = ['framework', 'external', 'node_modules'];
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

	serveServiceWorker(res) {
		let obj = this;
		let filename = path.join(obj.staticBasePath, 'public', 'sw.js');
		fs.stat(filename, (err, stats) => {
			if (err || !stats.isFile()) {
				res.writeHead(404);
				return res.end();
			}
			res.writeHead(200, {
				'Content-Type': 'text/javascript; charset=utf-8',
				// Allow the SW (served at /sw.js) to control the entire origin.
				'Service-Worker-Allowed': '/',
				// Keep the SW script itself fresh so updates roll out promptly.
				'Cache-Control': 'no-cache'
			});
			let stream = fs.createReadStream(filename);
			stream.on('error', () => {
				res.writeHead(500);
				res.end('Server Error');
			});
			res.on('close', () => {
				if (!res.writableEnded) {
					stream.destroy();
				}
			});
			stream.pipe(res);
		});
	}

	onNotFound(response) {
		response.setStatus(404);
		response.respond();
	}
}

module.exports = Router;
