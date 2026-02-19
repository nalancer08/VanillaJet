const nunjucks = require('nunjucks');
let _ = require('underscore');

class Response {

	constructor(res, options) {

		this.res = null;
		this.body = '';
		this.status = 200;
		this.headers = [];
		this.autoRespond = true;
    this.options = {};
		this.init(res, options);
	}

	init(res, options) {
		this.res = res;
    this.options = Object.assign({
      enable_precompressed_negotiation: false
    }, options || {});
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
    let templatePath = 'pages/' + template;
    let acceptEncoding = request.acceptEncoding || [];
    let allowBrotli = Boolean(obj.options.enable_precompressed_negotiation);
    let baseFilename = path.join(process.cwd(), 'public', templatePath);
    let candidates = [];

    if (allowBrotli && obj.supportsEncoding(acceptEncoding, 'br')) {
      candidates.push({ filename: baseFilename + '.br', encoding: 'br' });
    }
    if (obj.supportsEncoding(acceptEncoding, 'gzip')) {
      candidates.push({ filename: baseFilename + '.gz', encoding: 'gzip' });
    }
    candidates.push({ filename: baseFilename, encoding: '' });

    let hasNegotiation = candidates.some((candidate) => candidate.encoding !== '');
    obj.resolveFirstAvailableFile(candidates, (err, selectedFile) => {
      if (err || !selectedFile) {
        return obj.error404();
      }

      obj.res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (hasNegotiation) {
        obj.res.setHeader('Vary', 'Accept-Encoding');
      }
      if (selectedFile.encoding) {
        obj.res.setHeader('Content-Encoding', selectedFile.encoding);
      }

      let fileStream = fs.createReadStream(selectedFile.filename);
      fileStream.on('error', () => {
        obj.error404();
      });
      obj.res.on('close', () => {
        if (!obj.res.writableEnded) {
          fileStream.destroy();
        }
      });
      fileStream.pipe(obj.res);
    });
	}

  resolveFirstAvailableFile(candidates, callback) {
    let fs = require("fs");
    let index = 0;
    function resolveCandidate() {
      let currentCandidate = candidates[index];
      if (!currentCandidate) {
        return callback(new Error('File not found'));
      }

      fs.stat(currentCandidate.filename, (err, stats) => {
        if (!err && stats && stats.isFile()) {
          return callback(null, currentCandidate);
        }
        index = index + 1;
        resolveCandidate();
      });
    }

    resolveCandidate();
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
}

module.exports = Response;
