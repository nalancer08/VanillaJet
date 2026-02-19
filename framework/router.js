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
    this.staticFileWatchers = new Map();
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
              let staticHeaders = obj.buildStaticHeaders(extHeader, staticCandidates, staticFile.contentEncoding, metadata);

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

              res.writeHead(200, staticHeaders);
              fileStream.pipe(res);
              res.on('close', () => {});
            });
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
      obj.watchStaticFile(filename);
      callback(null, metadata);
    });
  }

  getStaticCandidates(request, ext, filename) {
    let obj = this;
    let candidates = [{ filename: filename, contentEncoding: '' }];
    let isCompressible = obj.compressionMimes.includes(ext) && obj.compressionFiles.includes(path.basename(filename));
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

  buildStaticHeaders(extHeader, candidates, contentEncoding, metadata) {
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
    // Force revalidation to keep clients fresh without hard reload.
    staticHeaders['Cache-Control'] = 'no-cache, must-revalidate';
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

  watchStaticFile(filename) {
    let obj = this;
    if (obj.staticFileWatchers.has(filename)) {
      return;
    }

    try {
      let watcher = fs.watch(filename, (eventType) => {
        obj.staticMetadataCache.delete(filename);
        obj.staticResolutionCache.clear();
        if (eventType === 'rename') {
          let renamedWatcher = obj.staticFileWatchers.get(filename);
          if (renamedWatcher) {
            renamedWatcher.close();
          }
          obj.staticFileWatchers.delete(filename);
        }
      });

      watcher.on('error', () => {
        obj.staticMetadataCache.delete(filename);
        obj.staticResolutionCache.clear();
        let activeWatcher = obj.staticFileWatchers.get(filename);
        if (activeWatcher) {
          activeWatcher.close();
        }
        obj.staticFileWatchers.delete(filename);
      });

      obj.staticFileWatchers.set(filename, watcher);
    } catch (err) {
      // If watch cannot be created, keep runtime behavior and continue.
    }
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

	onNotFound(response) {
		response.setStatus(404);
		response.respond();
	}
}

module.exports = Router;
