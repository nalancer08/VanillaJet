/**
	Created by: nalancer08 <https://github.com/nalancer08>
	Revision: 0.1
**/

function EndpointApp(server) {

	var obj = this;
	
	/* Simple routes */
	server.router.addRoute('*', '/', 			'EndpointApp.home');
	server.router.addRoute('*', '/status', 		'EndpointApp.status');

	/* Set the default route, in case to recive / in URL */
	server.router.setDefaultRoute('/');
}

EndpointApp.prototype.home = function(request, response, server) {

	var obj = this,
		view = new server.functions.ViewApp();
	response.renderPage('home.html', { username: 'Erick' });
}

EndpointApp.prototype.status = function(request, response, server) {

	var obj = this,
		UserModel = require('../model/user.model.js'),
		ret = {'status': 200, 'message' : 'success'},
		User = UserModel.User;

	var ac = new User();
	ac.name = 'Test';
	ac.description = 'Test activitie';
	ac.price = 10;
	ac.available = 1;
	ac.save();

	console.log(ac.__toString());

	response.setHeader('Content-Type', 'application/json');
	response.setBody(JSON.stringify(ret));
	response.respond();


	// var params = {'sort' : 'asc', 'debug' : true, 'show' : 2, 'conditions' : "id = 1 AND email = 'nukk.les@hotmail.com'"};
	// Users._("all", 0, params).then(function(rows) {

	// 	ret['data'] = rows;

	// 	Users.count(params['conditions']).then(function(data) {

	// 		ret['count'] = data;
	// 		response.setHeader('Content-Type', 'application/json');
	// 		response.setBody(JSON.stringify(ret));
	// 		response.respond();

	// 	}, function(error) {});
	// }, function(err) {});
}

module.exports = EndpointApp;