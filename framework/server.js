const _ = require('underscore');
const http = require('http');
const http2 = require('http2');
const fs = require('fs');
const nunjucks = require('nunjucks');
const path = require('path');

let Router = require('./router.js');
let Dipper = require('./dipper.js');
let Functions = require('./functions.js');

class Server {

	constructor(options, endpoints) {

		this.httpx = null;
		this.verbose = true;
		this.router = null;
		this.functions = null;
		this.dipper = null;
    this.endpoints = {};
		this.init(options, endpoints);
	}

	init(options, endpoints) {

		let obj = this, 
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
		global.render = nunjucks.configure(path.join(process.cwd(), 'assets'), {
			autoescape: false,
			throwOnUndefined: true,
			noCache: true,
		});
		global.dipper = new Dipper(opts, shared);

    // -- Create the server
    obj.createServer();

    // -- Not found callback
		obj.onNotFound = opts.onNotFound;

		// Initialize router
		obj.router = new Router(obj);

		// -- Initialize endoints
		let endpoints_built = {};
		for (let endpoint of endpoints) {
			endpoints_built[endpoint.name] = new endpoint(obj.router);
		}
    this.endpoints = endpoints_built;

		// Setting endpoints
		obj.functions = new Functions();
	}

	start() {

		let obj = this;
		let port = (obj.options.port && obj.options.port != '') ? obj.options.port : 8080;

		// Listen on the specified port
		obj.httpx.listen(port);

		// Logging
		obj.log('__________________  VanillaJet server started  ___________________');
		obj.log(` >           Listening on ${obj.options.site_url}:${obj.options.port}${obj.options.base_url}         < `);
		obj.log('-----------------------------------------------------------------');
	}

  createServer() {

    let obj = this;
    // -- Http server
    let isLocalhost = /^((http):\/\/)/.test(obj.options.site_url) || /^((localhost))/.test(obj.options.site_url);
    if (isLocalhost) {
      obj.httpx = http.createServer((req, res) => {
        obj.router.onRequest.call(obj.router, req, res);
      });
      return;
    }

    // -- Https server (self managed certs)
    if (obj.security.self_managed_certs) {
      let certs = {
        key: fs.readFileSync(obj.security.key, 'utf8'),
        cert: fs.readFileSync(obj.security.cert, 'utf8'),
        allowHTTP1: true
      };
      obj.httpx = http2.createSecureServer(certs, (req, res) => {
        obj.router.onRequest.call(obj.router, req, res);
      });
      return;
    }
    
    // -- Certs managed by NGINX, Google Cloud Run, etc.
    obj.httpx = http2.createServer({ allowHTTP1: true }, (req, res) => {
      obj.router.onRequest.call(obj.router, req, res);
    });
  }

	log(value) {

		let obj = this;
		if (obj.verbose) {
			console.log(value);
		}
	}

	onNotFound(request, response) {
		
		response.setStatus(404);
		response.respond();
	}
}

module.exports = Server;
