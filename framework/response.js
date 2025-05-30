const nunjucks = require('nunjucks');
let _ = require('underscore');

class Response {

	constructor(res) {

		this.res = null;
		this.body = '';
		this.status = 200;
		this.headers = [];
		this.autoRespond = true;
		this.init(res);
	}

	init(res) {
		this.res = res;
	}

	setBody(body) {
		this.body = body;
	}

	setStatus(status) {
		this.status = status;
	}

	setHeader(name, value) {
		let obj = this;
		obj.headers.push({
			name: name,
			value: value
		});
	}

	getBody() {
		return this.body;
	}

	getStatus() {
		return this.status;
	}

	getHeader(name) {

		let obj = this, 
      ret = null;
		ret = _.find(obj.headers, function (header) {
			return header.name == name;
		});
		return ret;
	}

	respond() {

		let obj = this;
		this.setHeader('Access-Control-Allow-Origin', '*');

		_.each(obj.headers, function (header) {
			obj.res.setHeader(header.name, header.value);
		});
		obj.res.writeHead(obj.status);
		obj.res.end(obj.body);
	}

	error404() {
		let obj = this;
		obj.res.writeHead(404, { "Content-Type": "text/plain" });
		obj.res.write("404 Not Found\n");
		obj.res.end();
	}

	render(request, template) {

		let obj = this, 
      path = require("path"), 
      fs = require("fs");
    template = 'pages/' + template;

    const acceptEncoding = request.acceptEncoding || [];
    if (acceptEncoding.includes('gzip')) {
      template = template + '.gz';
      obj.res.setHeader('Content-Encoding', 'gzip');
    } else {
      obj.res.setHeader('Content-Type', 'text/html');
    }

		const filename = path.join(process.cwd(), 'public/' + template);
		const fileStream = fs.createReadStream(filename);
		fileStream.pipe(obj.res);
	}
}

module.exports = Response;
