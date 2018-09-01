/**
	Version 3.5
	Created by: nalancer08 <https://github.com/nalancer08>
	Revised by: nalancer08 <https://github.com/nalancer08>
**/

function Functions(server) {

	// Adding core classes
	this.authentication = require('../framework/authentication.js');
	this.tokenizr = require('../framework/tokenizr.js');

	// Adding endpoints
	EndpointApp = require('./endpoint/app.endpoint.js');

	// Adding models
	// --

	// Creating endpoints array
	this.endpoints = [];
	this.endpoints['EndpointApp'] = new EndpointApp(server);

	this.models = [];

	// Meta tags
	var dipper = global.dipper;

	dipper.addMeta('UTF-8', '', 'charset');
	dipper.addMeta('viewport', 'width=device-width, initial-scale=1');
	dipper.addMeta('og:title', dipper.getPageTitle(), 'property');
	dipper.addMeta('og:site_name', dipper.getSiteTitle(), 'property');
	dipper.addMeta('og:description', dipper.getDescription(), 'property');
	//dipper.addMeta('og:image', dipper.urlTo('/favicon.png'), 'property');
	dipper.addMeta('og:type', 'website', 'property');
	//dipper.addMeta('og:url', $site->urlTo('/'), 'property');
	dipper.metaTags();

}

module.exports = Functions;