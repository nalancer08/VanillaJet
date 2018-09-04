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

		// -- Push controller to global controllers stack
		obj.pushController('app', obj.controllers.appController);

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

/*_    ___
 | |  / (_)__ _      _______
 | | / / / _ \ | /| / / ___/
 | |/ / /  __/ |/ |/ (__  )
 |___/_/\___/|__/|__/____/*/
/* ---------------------------------------------------------------------------------------------- */

HeaderView = Ladybug.Scarlet.View.extend({

	onInit: function() {
		var obj = this;
		obj.templates.base = Ladybug.Utils.compileTemplate('#partial-header');
	},
	onRender: function() {
		var obj = this,
			target = $('.app-header');
		target.html( obj.templates.base() );
	}
});

/* ---------------------------------------------------------------------------------------------- */

FooterView = Ladybug.Scarlet.View.extend({
	onInit: function() {
		var obj = this;
		obj.templates.base = Ladybug.Utils.compileTemplate('#partial-footer');
	},
	onRender: function() {
		var obj = this,
			target = $('.app-footer');
		target.html( obj.templates.base() );
	}
});

/* ---------------------------------------------------------------------------------------------- */

MenuView = Ladybug.Scarlet.View.extend({
	onInit: function() {
		var obj = this;
		obj.templates.base = Ladybug.Utils.compileTemplate('#partial-menu');
	},
	onRender: function() {
		var obj = this,
			target = $('.app-nav-menu');
		target.html( obj.templates.base() );
	}
});

/* ---------------------------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------------------------- */

TestView = Ladybug.Scarlet.View.extend({

	animate: true,
	onInit: function() {
		var obj = this;
		obj.templates.base = Ladybug.Utils.compileTemplate('#test');
	},
	onRender: function() {
		var obj = this,
			target = $('.app-content');
		target.html( obj.templates.base() );
		target.attr('class', 'app-content ' + app.slug + ' ' + app.action);

		app.runVelocity( target.find('[data-animable=auto]') );
	}
});

/* ______            __             ____
  / ____/___  ____  / /__________  / / /__  __________
 / /   / __ \/ __ \/ __/ ___/ __ \/ / / _ \/ ___/ ___/
/ /___/ /_/ / / / / /_/ /  / /_/ / / /  __/ /  (__  )
\____/\____/_/ /_/\__/_/   \____/_/_/\___/_/  /____/*/
/* ---------------------------------------------------------------------------------------------- */

BaseController = Ladybug.Scarlet.Controller.extend({

	views: {},
	view: null,
	onInit: function() {
		var obj = this;
	},
	onEnter: function(params, callback) {

		var obj = this;
		callback.call(obj);
	},
	onExit: function(callback) {

		var obj = this;
		callback.call(obj);
	},
	setActiveView: function(view, callback) {

		var obj = this;

		var afterExitView = function() {

			view.render();
			$('.js-section-current').velocity('transition.slideRightIn', {
				duration: 350,
				display: 'flex',
				complete: function() {

					if(typeof callback !== 'undefined') {

						callback.call(obj);
					}
				}
			});
			obj.view = view;
		};

		if ( $('.js-section-current').length > 0 ) {

			var content = $('.js-section-current');
			content.velocity({ scale: 0.95, opacity: 0.5 }, {
				duration: 250,
				easing: 'easeOutQuad',
				complete: function() {
					content.velocity({ translateY: 50, opacity: 0 }, {
						duration: 350,
						delay: 100,
						easing: 'easeOutQuad',
						complete: function() {
							afterExitView();
						}
					});
				}
			});
		} else {
			afterExitView();
		}
	}
});

/* ---------------------------------------------------------------------------------------------- */

AppController = BaseController.extend({

	views: {},
	view: null,
	onInit: function() {

		var obj = this;
		obj.pushAction('index', obj.indexAction);

		// -- Addign default views
		//obj.views.header = new HeaderView();
		obj.views.footer = new FooterView();
		obj.views.menu =   new MenuView();

		// -- Calling super
		obj.parent();
	},
	onEnter: function(params, callback) {

		var obj = this;
		callback.call(obj);

		//obj.views.header.render();
		obj.views.footer.render();
		obj.views.menu.render();
	},
	indexAction: function(id) {

		var obj = this;
		if(app.checkBearer()) {
			app.router.navigate('#!/session/categories');
			return;
		}
		if (! obj.views['test'] ) {
			obj.views.test = new TestView();
		}
		obj.setActiveView(obj.views.test);
	}
});

/* ---------------------------------------------------------------------------------------------- */

var app = new App();