/**
 * Ladybug Scarlet
 *
 * Supercharge your web apps with the power of an MVC layer built on top of Ladybug
 *
 * @author   biohzrdmx <github.com/biohzrdmx>
 * @version  1.0
 * @license  MIT
 */

if ( typeof Ladybug.Scarlet === 'undefined' ) { Ladybug.Scarlet = {}; }

(function() {
	Ladybug.Utils.camelCase = function(str) {
		return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); })
	};
	Ladybug.Utils.guid = function() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);
		}
		return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();
	}
})();

Ladybug.Scarlet.Application = Ladybug.Class.extend({

	defaultController: 'app',
	defaultAction: 'index',
	controller: null,
	controllers: {},
	router: null,
	slug: null,
	action: null,
	id: null,
	init: function(options) {

		var obj = this;
		jQuery(document).ready(function($) {
			obj.onDomReady.call(obj, $);
		});
		obj.router = new Ladybug.Router({
			onRouteChange: function(params) {
				obj.onRouteChange.call(obj, params);
			}
		});
	},
	pushController: function(slug, controller) {
		var obj = this;
		obj.controllers[slug] = controller;
	},
	popController: function(slug) {
		var obj = this;
		delete obj.controllers[slug];
	},
	onDomReady: function($) {
		// Override in your app
	},
	onRouteChange: function(params) {

		var obj = this,
			prevId = obj.controller ? obj.controller.id : null;
		obj.slug = params[0] || null;
		obj.action = params[1] || obj.defaultAction;
		obj.id = params[2] || null;
		if ( obj.slug ) {
			var controller = obj.controllers[obj.slug];
			if (controller) {
				// Define the callbacks
				var afterEnterController = function() {
					obj.onControllerChange.call(obj);
				};
				var afterExitController = function() {
					obj.controller = controller;
					if (prevId != controller.id) {
						// Continue with the next controller
						obj.controller.onEnter(params, function() {
							afterEnterController.call(obj);
							checkControllerAction();
						});
					} else {
						checkControllerAction();
					}
				};
				var checkControllerAction = function() {
					// Get action callback and execute it
					var actionFn = obj.controller.actions[ obj.action ];
					if (actionFn) {
						actionFn.call(obj.controller, obj.id);
					} else {
						console.log('Error: "' + obj.action + '" action is not available in "' + obj.slug + '" controller.');
					}
				};
				// Check whether there is a controller currently active or not
				if (obj.controller) {
					obj.controller.onExit(function() {
						afterExitController.call(obj);
					});
				} else {
					afterExitController.call(obj);
				}
			}
		} else {
			obj.router.navigate('!/' + obj.defaultController);
		}
	},
	onControllerChange: function() {
		// Override in your app
	}
});

Ladybug.Scarlet.View = Ladybug.Class.extend({

	templates: {},
	target: '',
	element: null,
	init: function(options) {
		var obj = this;
		obj.onInit.call(obj);
	},
	render: function() {
		var obj = this;
		obj.onRender();
	},
	remove: function() {
		var obj = this;
		obj.onRemove();
	},
	onInit: function() {
		// Override in your app
	},
	onRender: function() {
		// Override in your app
	},
	onRemove: function() {
		// Override in your app
	}
});

Ladybug.Scarlet.Controller = Ladybug.Class.extend({
	
	actions: {},
	id: null,
	init: function(options) {
		var obj = this;
		obj.onInit.call(obj);
		obj.id = Ladybug.Utils.guid();
	},
	pushAction: function(slug, action) {
		var obj = this;
		obj.actions[slug] = action;
	},
	popAction: function(slug) {
		var obj = this;
		delete obj.actions[slug];
	},
	onInit: function() {
		// Override in your app
	},
	onEnter: function(params, callback) {
		// Override in your app
	},
	onExit: function(callback) {
		// Override in your app
	}
});

Ladybug.Scarlet.Model = Ladybug.Class.extend({
	//
});