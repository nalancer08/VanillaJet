/*  ___
   /   |  ____  ____
  / /| | / __ \/ __ \
 / ___ |/ /_/ / /_/ /
/_/  |_/ .___/ .___/
      /_/   /_/ */
/* ---------------------------------------------------------------------------------------------- */

App = Ladybug.Scarlet.Application.extend({

	controllers: {},
	user: null,
	bearer: null,
	constants: {
		siteUrl: ''
	},
	apiCredentials: {
		AppUid:'',
		AppToken:''
	},
	init: function(options) {

		var obj = this;
		obj.parent(options);
		obj.defaultController = 'app';

		// -- Addign the controllers
		obj.controllers.appController = new AppController();
		obj.controllers.sessionController = new SessionController();

		// -- Push controller to global controllers stack
		obj.pushController('app', obj.controllers.appController);
		obj.pushController('session', obj.controllers.sessionController);

		// -- Initing the app [ONLY fro mobile hybrid apps]
		// document.addEventListener("deviceReady", function() { obj.onDeviceReady() }, false);
	},
	checkBearer: function() {

		return !! app.bearer;
	},
	errorString: function(err) {

		console.log(err);
		var strings = {
			ERR_INVALID_CREDENTIALS: '¡Ups! El nombre de usuario o contraseña es incorrecto',
			ERR_NON_EXISTENT_USER: 'El correo electronico que ingresaste es incorrecto'
		},
		ret = err;
		if ( typeof strings[err] !== 'undefined' ) {
			ret = strings[err];
		}
		return ret;
	},
	ajaxCall: function(options) {

		var opts = _.defaults(options, {
				data: {},
				success: false,
				error: false,
				complete: false,
				errorMsg: 'Ha ocurrido un error, por favor intenta nuevamente más tarde'
			});
		if (! opts.data.bearer ) {
			opts.data.bearer = app.bearer || '';
		}
	},
	onDomReady: function() {

		var obj = this;
		obj.router.start();
	},
	runVelocity: function(elements, complete) {

		var obj = this,
			complete = complete || $.noop,
			elements = elements || $('[data-animate=auto]'),
			pending = elements.length;
		elements.each(function() {
			var el = $(this),
				selector = el.data('selector') || '',
				delay = el.data('delay') || 0,
				duration = el.data('duration') || 700,
				stagger = el.data('stagger') || 0,
				transition = el.data('transition') || 'transition.fadeIn';
			if ( transition.indexOf('transition.') != 0 ) {
				transition = 'transition.' + transition;
			}
			if (selector) {
				el.css({ opacity: 1 });
				el = el.find(selector);
				el.css({ opacity: 0 });
			}
			el.velocity(transition, {
				delay: delay,
				stagger: stagger,
				duration: duration,
				complete: function() {
					pending--;
					if (pending <= 0) {
						complete.call(obj);
					}
				}
			});
		});
	}
});

/* ---------------------------------------------------------------------------------------------- */

var app = new App();