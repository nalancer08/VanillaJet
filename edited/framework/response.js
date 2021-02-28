/**
	Version 3.5
	Created by: nalancer08 <https://github.com/nalancer08>
	Revised by: nalancer08 <https://github.com/nalancer08>
**/

var _ = require('underscore');

function Response(res) {

	this.res = null;
	this.body = '';
	this.status = 200;
	this.headers = [];
	this.autoRespond = true;
	// Call initialization callback
	this.init(res);
}

Response.prototype.init = function(res) {

	var obj = this;
	obj.res = res;
}

Response.prototype.setBody = function(body) {

	var obj = this;
	obj.body = body;
}

Response.prototype.setStatus = function(status) {

	var obj = this;
	obj.status = status;
}

Response.prototype.setHeader = function(name, value) {

	var obj = this;
	obj.headers.push({
		name: name,
		value: value
	});
}

Response.prototype.getBody = function() {

	var obj = this;
	return obj.body;
}

Response.prototype.getStatus = function() {

	var obj = this;
	return obj.status;
}

Response.prototype.getHeader = function(name) {

	var obj = this,
		ret = null;
	ret = _.find(obj.headers, function(header) {
		return header.name == name;
	});
	return ret;
}

Response.prototype.respond = function() {

	var obj = this;
	this.setHeader('Access-Control-Allow-Origin', '*');

	_.each(obj.headers, function(header) {
		obj.res.setHeader(header.name, header.value);
	});
	obj.res.writeHead(obj.status);
	obj.res.end(obj.body);
}

Response.prototype.renderPage = function(template, data) {

	var obj = this,
		template = 'pages/' + template;
	obj.render(template, data);
}

Response.prototype.render = function(template, data) {

	var obj = this,
		url = require("url"),
    	path = require("path"),
		fs = require("fs")
		nunjucks = require('nunjucks');

	var filename = path.join(process.cwd(), 'assets/');
	fs.exists(filename, function(exists) {
    	
    	if (!exists) {

      		obj.res.writeHead(404, {"Content-Type": "text/plain"});
      		obj.res.write("404 Not Found\n");
      		obj.res.end();
      		return;
    	}

    	if (fs.statSync(filename).isDirectory()) filename += template;
		fs.readFile(filename, "binary", function(err, file) {
	  		
	  		if (err) {        
		        
		        obj.res.writeHead(500, {"Content-Type": "text/plain"});
		        obj.res.write(err + "\n");
		        obj.res.end();
		        return;
	  		}

	  		data['app'] = global.dipper;
	  		global.render.render(template, data, function(err, render) {

	  			if (err) {
	  				
	  				console.log(err);

	  			} else if (render) {

					obj.res.writeHead(200, {

						'Content-Type': 'text/html; charset=utf-8',
						'Content-Length': render.length
					});
	      			obj.res.write(render);
	      			obj.res.end();
			   	}
			});

	  		// var render = global.render.render(template, data);

	    //   	obj.res.writeHead(200);
	    //   	obj.res.write(render, "binary");
	    //   	obj.res.end();
	  	});
	});
}

module.exports = Response;