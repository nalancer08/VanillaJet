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
		ret = {'status': 200, 'message' : 'success'};

	response.setHeader('Content-Type', 'application/json');
	response.setBody(JSON.stringify(ret));
	response.respond();
}

module.exports = EndpointApp;