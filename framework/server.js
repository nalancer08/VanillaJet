const _ = require('underscore');
const http = require('http');
const http2 = require('http2');
const fs = require('fs');
const nunjucks = require('nunjucks');
const path = require('path');

let Router = require('./router.js');
let Dipper = require('./dipper.js');

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
			opts = settings['profile'] || {}, 
			shared = settings['shared'] || {}, 
			security = settings['security'] || {};

		_.defaults(opts, {
			https_server: false,
			wsServer: false
		});
		obj.options = opts;

		_.defaults(security, {
			pass_salt: '1234567890',
			token_salt: '0987654321',
			version: '1.0',
      self_managed_certs: false
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

		// Initialize router
		obj.router = new Router(obj);

		// -- Initialize endoints
		let endpoints_built = {};
		for (let endpoint of endpoints) {
			endpoints_built[endpoint.name] = new endpoint(obj.router);
		}
    this.endpoints = endpoints_built;
	}

	start() {
		this.log('__________________  VanillaJet Server started  ___________________');
		this.log(` >           Running on 0.0.0.0:${this.options.port}/           < `);
		this.log('------------------------------------------------------------------');
	}

  createServer() {

    let obj = this;

    // -- Https server (self managed certs)
    if (obj.security.self_managed_certs) {
      console.log('HTTPs server created - Self managed certs');
      let certs = obj.getCertificates();
      obj.httpx = http2.createSecureServer(certs, (req, res) => {
        obj.router.onRequest.call(obj.router, req, res);
      });
    } else {
      console.log('HTTP server created - Without self managed certs');
      obj.httpx = http.createServer((req, res) => {
        obj.router.onRequest.call(obj.router, req, res);
      });
    }

    // -- Set the port
    obj.httpx.listen(obj.options.port || 8080);
  }

	log(value) {

		let obj = this;
		if (obj.verbose) {
			console.log(value);
		}
	}

  getCertificates() {

    let obj = this;
    return {
      key: fs.readFileSync(obj.security.key, 'utf8'),
      cert: fs.readFileSync(obj.security.cert, 'utf8'),
      allowHTTP1: true
    }
  }
}

module.exports = Server;
