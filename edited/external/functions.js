/**
	Version 3.5
	Created by: nalancer08 <https://github.com/nalancer08>
	Revised by: nalancer08 <https://github.com/nalancer08>
**/

function Functions(server) {

	// Adding core classes
	this.authentication = require('../framework/authentication.js');
	this.tokenizr = require('../framework/tokenizr.js');

	// Dipper
	dipper = global.dipper;

	// Include Google Fonts
	fonts = {
		'Open Sans' : [400, '400italic', 700, '700italic'],
		'Open Sans Condensed' : [700, '700italic'],
		'Lato' : [900, 700, 400, 300, 100],
		'Raleway' : [900, 700, 400, 300, 100],
		'Montserrat' : [900, 700, 600, 400, 300, 100]
	};
	dipper.registerStyle('google-fonts', dipper.get_google_fonts(fonts) );

	// Adding styles
	//dipper.registerStyle('magnific-popup', '//cdnjs.cloudflare.com/ajax/libs/magnific-popup.js/1.1.0/magnific-popup.min.css');
	dipper.registerStyle('reset', dipper.style('reset.css') );
	dipper.registerStyle('sticky-footer', dipper.style('sticky-footer.css') );
	//dipper.registerStyle('font-awesome', '//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css' );
	dipper.registerStyle('font-awesome', 'https://use.fontawesome.com/releases/v5.3.1/css/all.css' );
	dipper.registerStyle('admin', dipper.style('admin.css'), [

		// Fonts
		'font-awesome',
		'google-fonts',

		// Our Plugins
		'plugins',

		// Other Plugins
		'magnific-popup',

		// Genral Style
		'reset',
		'sticky-footer'
	]);
	dipper.enqueueStyle('admin');

	// Adding scripts
	dipper.registerScript('ladybug2', dipper.script('core/ladybug2.js'), ['jquery', 'underscore'] );
	dipper.registerScript('chart', '//cdnjs.cloudflare.com/ajax/libs/Chart.js/2.6.0/Chart.min.js' );
	dipper.registerScript('aes', dipper.script('plugins/aes.js'), ['jquery'] );
	dipper.registerScript('velocity', 'https://cdnjs.cloudflare.com/ajax/libs/velocity/1.2.3/velocity.min.js', ['jquery'] );
	dipper.registerScript('clipboard', 'https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/1.5.12/clipboard.min.js', ['jquery'] );
	dipper.registerScript('velocity.ui', 'https://cdnjs.cloudflare.com/ajax/libs/velocity/1.2.3/velocity.ui.min.js', ['velocity'] );
	dipper.registerScript('magnific-popup', '//cdnjs.cloudflare.com/ajax/libs/magnific-popup.js/1.1.0/jquery.magnific-popup.min.js', ['jquery'] );
	dipper.registerScript('velocity', dipper.script('plugins/velocity.min.js'), ['jquery']);
    dipper.registerScript('velocity.ui', dipper.script('plugins/velocity.ui.min.js'), ['jquery']);
	dipper.registerScript('scarlet', dipper.script('core/ladybug2.scarlet.js'), [
		
		'jquery',
		'velocity',
		'velocity.ui',
		'ladybug2', 
		'velocity.ui', 
		'aes', 
		'chart', 
		'magnific-popup', 
		'clipboard', 
		'jquery.form'
	]);
	dipper.enqueueScript('scarlet');

	// Adding endpoints
	EndpointApp = require('./endpoint/app.endpoint.js');

	// Adding meta tags
	dipper.addMeta('UTF-8', '', 'charset');
	dipper.addMeta('viewport', 'width=device-width, initial-scale=1');
	dipper.addMeta('og:title', dipper.getPageTitle(), 'property');
	dipper.addMeta('og:site_name', dipper.getSiteTitle(), 'property');
	dipper.addMeta('og:description', dipper.getDescription(), 'property');
	dipper.addMeta('og:image', dipper.img('logo.png'), 'property');
	dipper.addMeta('og:type', 'website', 'property');
	dipper.addMeta('og:url', dipper.urlTo(''), 'property');

	// Adding models
	// --

	// -- Adding views
	this.ViewApp = require('./view/app.view.js');

	// Creating endpoints array
	this.endpoints = [];
	this.endpoints['EndpointApp'] = new EndpointApp(server);

	this.models = [];
}

module.exports = Functions;