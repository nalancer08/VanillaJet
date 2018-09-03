/**
	Version 3.5
	Created by: nalancer08 <https://github.com/nalancer08>
	Revised by: nalancer08 <https://github.com/nalancer08>
**/

function Functions(server) {

	console.log("Functiones inited");

	// Adding core classes
	this.authentication = require('../framework/authentication.js');
	this.tokenizr = require('../framework/tokenizr.js');
	var dipper = global.dipper;

	// Adding styles
	//dipper.registerStyle('magnific-popup', '//cdnjs.cloudflare.com/ajax/libs/magnific-popup.js/1.1.0/magnific-popup.min.css');
	dipper.enqueueStyle('magnific-popup');

	// Adding scripts

	// Adding endpoints
	EndpointApp = require('./endpoint/app.endpoint.js');

	// Adding meta tags
	// Meta tags
	dipper.addMeta('UTF-8', '', 'charset');
	dipper.addMeta('viewport', 'width=device-width, initial-scale=1');
	dipper.addMeta('og:title', dipper.getPageTitle(), 'property');
	dipper.addMeta('og:site_name', dipper.getSiteTitle(), 'property');
	dipper.addMeta('og:description', dipper.getDescription(), 'property');
	//dipper.addMeta('og:image', dipper.urlTo('/favicon.png'), 'property');
	dipper.addMeta('og:type', 'website', 'property');
	//dipper.addMeta('og:url', $site->urlTo('/'), 'property');

	// Adding models
	// --

	// Creating endpoints array
	this.endpoints = [];
	this.endpoints['EndpointApp'] = new EndpointApp(server);

	this.models = [];

}

module.exports = Functions;