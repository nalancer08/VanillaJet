/**
	Created by: nalancer08 <https://github.com/nalancer08>
	Revision: 0.1
**/

function EndpointApp(server) {

	var obj = this;
	
	/* Simple routes */
	server.router.addRoute('*', '/', 			'EndpointApp.home');

	/* Set the default route, in case to recive / in URL */
	server.router.setDefaultRoute('/');
}

EndpointApp.prototype.home = function(request, response, server) {

	var obj = this;
	response.renderPage('home.html', { username: 'Erick' });
}

module.exports = EndpointApp;