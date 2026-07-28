const nunjucks = require('nunjucks');
let _ = require('underscore');

// Strong content-hash ETags for rendered pages, keyed by absolute filename.
// render() streams PRE-COMPILED files (no per-request templating), so a
// representation's bytes only change on deploy: hash once per (size, mtime)
// generation and reuse. Hashing the content — instead of a stat signature —
// is what makes the 304 path safe by construction: it can only fire when the
// client's stored bytes are identical to what would be streamed, so
// revalidation can never pin a stale page. Any failure falls back to a full
// 200, which is exactly the pre-ETag behavior.
const renderEtagCache = new Map();

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
    obj.resolveFirstAvailableFile(candidates, (err, selectedFile, stats) => {
      if (err || !selectedFile) {
        return obj.error404();
      }

      obj.renderEtag(selectedFile.filename, stats, (etagErr, etag) => {
        let hasEtag = !etagErr && Boolean(etag);

        // Rendered pages must never be reused without asking the server: with
        // no Cache-Control, browsers and WebViews apply heuristic caching and
        // can keep serving an old page after a deploy — its asset references
        // (`?v=size-mtime`) then resolve to NEWER file contents (the server
        // ignores the query when reading the file) and the app boots with
        // mismatched document/assets. WKWebView is the worst offender.
        // `no-cache` + the ETag turn every boot into a cheap revalidation:
        // 304 while the page is unchanged, a full 200 the moment a deploy
        // lands. 304s carry the headers RFC 9110 asks for and no entity
        // headers (there is no entity).
        if (hasEtag && obj.etagMatches(request.ifNoneMatch, etag)) {
          let notModifiedHeaders = {
            'Cache-Control': 'no-cache, must-revalidate',
            'ETag': etag
          };
          if (hasNegotiation) {
            notModifiedHeaders['Vary'] = 'Accept-Encoding';
          }
          obj.res.writeHead(304, notModifiedHeaders);
          return obj.res.end();
        }

        obj.res.setHeader('Content-Type', 'text/html; charset=utf-8');
        obj.res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        if (hasEtag) {
          obj.res.setHeader('ETag', etag);
        }
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
    });
	}

  // Strong ETag of the exact representation being streamed (the .br/.gz file
  // when negotiated): each encoding hashes to its own tag, so a client that
  // switches encodings can never false-match a different body. sha1 here is a
  // cache validator, not a security boundary. Hash errors fall back to
  // serving without a validator (the pre-1.7.0 behavior).
  renderEtag(filename, stats, callback) {
    let fs = require("fs"),
      crypto = require("crypto");
    let cached = renderEtagCache.get(filename);
    if (cached && stats && cached.size === stats.size && cached.mtimeMs === stats.mtimeMs) {
      return callback(null, cached.etag);
    }
    fs.readFile(filename, (readErr, contents) => {
      if (readErr) {
        return callback(readErr);
      }
      let etag = `"${crypto.createHash('sha1').update(contents).digest('hex')}"`;
      if (stats) {
        renderEtagCache.set(filename, { size: stats.size, mtimeMs: stats.mtimeMs, etag: etag });
      }
      callback(null, etag);
    });
  }

  // If-None-Match per RFC 9110: comma-separated list, weak comparison
  // (`W/` prefixes ignored on both sides), `*` matches any representation.
  etagMatches(ifNoneMatch, etag) {
    if (!ifNoneMatch || !etag) {
      return false;
    }
    if (ifNoneMatch.trim() === '*') {
      return true;
    }
    let normalize = (value) => value.trim().replace(/^W\//, '');
    let target = normalize(etag);
    return ifNoneMatch.split(',').some((candidate) => normalize(candidate) === target);
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
          return callback(null, currentCandidate, stats);
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
