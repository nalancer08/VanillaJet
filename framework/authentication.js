/**
	Version 3.5
	Created by: nalancer08 <https://github.com/nalancer08>
	Revision 1: 04/08/2017
	Revision 2: 21/11/2017
	Revision 3: 14/12/2017
	Revision 4: 15/03/2018
**/

var _ = require('underscore');
var crypto = require('crypto');

function Authentication() {}

Authentication.generateToken = function(app_id) {

	var obj = this,
		server = global.app,
		app_key = server.options.app_key,
		app_clients = server.options.app_clients;

	// HMAC-hash the token
	var digest = crypto.createHmac('sha256', app_key).update(app_id).digest('hex'),
		token = digest + '.' + app_id,
		ret = (typeof app_clients[app_id] !== 'undefined') ? token : false;

	return ret;
}

Authentication.generateDynamicToken = function(app_id, time) {

	const moment = require('moment');
	const jwt = require('jwt-simple');

	var obj = this,
		server = global.app,
		app_key = server.options.app_key,
		app_clients = server.options.app_clients,
		time = time || 1;

	var payload = {
		    exp: moment().add(time, 'minutes').unix(),
		    iat: moment().unix(),
		    sub: app_id
	  	};

	// HMAC-hash the token
	//var digest = crypto.createHmac('sha512', app_key).update(JSON.stringify(payload)).digest('hex'),
	var digest = jwt.encode(payload, app_key, 'HS512');
		//token = digest + '.' + app_id,
		ret = (typeof app_clients[app_id] !== 'undefined') ? digest : false;

	return ret;
}

Authentication.checkToken = function(app_id, token) {

	var obj = this,
		server = global.app,
		app_clients = server.options.app_clients,
		check = obj.generateToken(app_id),
		ret = ( (check == token) && (typeof app_clients[app_id] !== 'undefined') ) ;

	return ret;
}

Authentication.checkDynamicToken = function(token) {

	const moment = require('moment');
	const jwt = require('jwt-simple');

	var obj = this,
		server = global.app,
		app_key = server.options.app_key,
		app_clients = server.options.app_clients;

	payload = jwt.decode(token, app_key, 'HS512');
  	now = moment().unix();

	// check if the token has expired
	if (now < payload.exp && (typeof app_clients[payload.sub] !== 'undefined')) {
		return true;
	}
	return false;
}

Authentication.requireToken = function(request, response) {

	var obj = this,
		server = global.app,
		app_clients = server.options.app_clients,
		token = request.get('token', ''),
		app_id = token.substr(token.lastIndexOf('.') + 1); // Extract app_id

	if ( (typeof app_id === 'undefined') || app_id == '' || (typeof token === 'undefined') || token == '' || !obj.checkToken(app_id, token) ) {

		//var ret = { status: 403, , result: 'error', message: "A valid App Token is required for accesing this API endpoint." };
		response.setStatus(500);
		response.respond();
		return false;
	
	} else {	
			
		app_clients[app_id].id = app_id;
		return app_clients[app_id];
	}
}

Authentication.requireDynamicToken = function(request, response) {

	const moment = require('moment');
	const jwt = require('jwt-simple');

	var obj = this,
		server = global.app,
		app_key = server.options.app_key,
		app_clients = server.options.app_clients,
		token = request.get('token', '');

	if ( (typeof token === 'undefined') || token == '' || !obj.checkDynamicToken(token) ) {

		var ret = { status: 500, result: 'error', message: "Token expired" };
		response.setStatus(500);
		response.setHeader('Content-Type', 'application/json');
		response.setBody(JSON.stringify(ret));
		response.respond();
		return false;
	
	} else {	
		
		payload = jwt.decode(token, app_key, 'HS512');
		app_clients[payload.sub].id = payload.sub;
		return app_clients[payload.sub];
	}
}

Authentication.requireTokenFrom = function(request, response, client) {

	var obj = this,
		server = global.app,
		app_clients = server.options.app_clients,
		token = request.get('token', ''),
		app_id = token.substr(token.lastIndexOf('.') + 1); // Extract app_id

	if ( (typeof app_id === 'undefined') || app_id == '' || (typeof token === 'undefined') || token == '' || !obj.checkToken(app_id, token) ) {

		//var ret = { status: 403, , result: 'error', message: "A valid App Token is required for accesing this API endpoint." };
		response.setStatus(500);
		response.respond();
		return false;
	
	} else {

		if (app_clients[app_id].key != client) {

			//var ret = { status: 403, , result: 'error', message: "A valid App Toolbelt Token is required for accesing this API endpoint." };
			response.setStatus(500);
			response.respond();
			return false;
		}

		app_clients[app_id].id = app_id;
		return app_clients[app_id];
	}
}

Authentication.requireTokenForToolBeltTransactions = function(request, response) {

	this.requireTokenFrom(request, response, 'toolbelt');
}

Authentication.requireBearer = function(user_id, bearer) {

	var obj = this,
		server = global.app,
		check = server.hashToken(user_id),
		ret = (bearer == check);

	return ret;
}

module.exports = Authentication;