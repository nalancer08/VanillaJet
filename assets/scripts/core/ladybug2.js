/**
 * ladybug.js
 *
 * A tiny yet powerful (and beautiful) framework for JS applications
 *
 * @author   biohzrdmx <github.com/biohzrdmx>
 * @version  2.0 RC 2
 * @license  MIT
 */

if ( typeof Ladybug === 'undefined' ) { Ladybug = {}; }

(function(window){ "use strict";

	Ladybug.Class = function(){};

	var initializing = false;
	var lastClassId = 0;
	var fnTest = /xyz/.test(function(){xyz;}) ? /\bparent\b/ : /.*/;

	var copy = function( object ) {
		if(
			!object || typeof(object) != 'object' ||
			object instanceof HTMLElement ||
			object instanceof Ladybug.Class
		) {
			return object;
		}
		else if( object instanceof Array ) {
			var c = [];
			for( var i = 0, l = object.length; i < l; i++) {
				c[i] = copy(object[i]);
			}
			return c;
		}
		else {
			var c = {};
			for( var i in object ) {
				c[i] = copy(object[i]);
			}
			return c;
		}
	};

	var inject = function(prop) {
		var proto = this.prototype;
		var parent = {};
		for( var name in prop ) {
			if(
				typeof(prop[name]) == "function" &&
				typeof(proto[name]) == "function" &&
				fnTest.test(prop[name])
			) {
				parent[name] = proto[name]; // save original function
				proto[name] = (function(name, fn){
					return function() {
						var tmp = this.parent;
						this.parent = parent[name];
						var ret = fn.apply(this, arguments);
						this.parent = tmp;
						return ret;
					};
				})( name, prop[name] );
			}
			else {
				proto[name] = prop[name];
			}
		}
	};

	var merge = function(original, extended) {
		var extended = extended || {};
		for( var key in extended ) {
			var ext = extended[key];
			if(
				typeof(ext) != 'object' ||
				ext instanceof HTMLElement ||
				ext instanceof Class ||
				ext === null
			) {
				original[key] = ext;
			}
			else {
				if( !original[key] || typeof(original[key]) != 'object' ) {
					original[key] = (ext instanceof Array) ? [] : {};
				}
				merge( original[key], ext );
			}
		}
		return original;
	};

	Ladybug.Class.extend = function(prop) {
		var parent = this.prototype;

		initializing = true;
		var prototype = new this();
		initializing = false;

		for( var name in prop ) {
			if(
				typeof(prop[name]) == "function" &&
				typeof(parent[name]) == "function" &&
				fnTest.test(prop[name])
			) {
				prototype[name] = (function(name, fn){
					return function() {
						var tmp = this.parent;
						this.parent = parent[name];
						var ret = fn.apply(this, arguments);
						this.parent = tmp;
						return ret;
					};
				})( name, prop[name] );
			}
			else {
				prototype[name] = prop[name];
			}
		}

		function Class() {
			if( !initializing ) {

				// If this class has a staticInstantiate method, invoke it
				// and check if we got something back. If not, the normal
				// constructor (init) is called.
				if( this.staticInstantiate ) {
					var obj = this.staticInstantiate.apply(this, arguments);
					if( obj ) {
						return obj;
					}
				}
				for( var p in this ) {
					if( typeof(this[p]) == 'object' ) {
						this[p] = copy(this[p]); // deep copy!
					}
				}
				this.merge = merge;
				if( this.init ) {
					this.init.apply(this, arguments);
				}
			}
			return this;
		}

		Class.prototype = prototype;
		Class.prototype.constructor = Class;
		Class.extend = Ladybug.Class.extend;
		Class.inject = inject;
		Class.classId = prototype.classId = ++lastClassId;

		return Class;
	};

})(window);

Ladybug.Utils = {
	compileTemplate: function(selector) {
		var markup = $(selector).html() || 'Template '+ selector +' not found';
		return _.template(markup);
	},
	titleCase: function (str) {
		return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}
};

Ladybug.Module = Ladybug.Class.extend({
	name: "",
	templates: null,
	partials: null,
	renderFlags: 1,
	init: function(options) {
		var obj = this,
			opts = $.extend(true, {
				onInit: obj.onInit,
				onRender: obj.onRender,
				onDomReady: obj.onDomReady,
				onTitleRequest: obj.onTitleRequest,
				onPrepareTemplates: obj.onPrepareTemplates,
				templates: {},
				partials: {}
			}, options);
		obj.onInit = opts.onInit;
		obj.onRender = opts.onRender;
		obj.onDomReady = opts.onDomReady;
		obj.onTitleRequest = opts.onTitleRequest;
		obj.onPrepareTemplates = opts.onPrepareTemplates;
		obj.templates = opts.templates;
		obj.partials = opts.partials;
	},
	title: function() {
		var obj = this;
		return obj.onTitleRequest();
	},
	render: function(params) {
		var obj = this;
		obj.onPrepareTemplates(params);
		obj.onRender(params, function() {
			obj.onDomReady(params);
		});
	},
	onInit: function(options) {
		// Placeholder, override in your derived classes
	},
	onRender: function(params, callback) {
		// Placeholder, override in your derived classes
	},
	onDomReady: function(params) {
		// Placeholder, override in your derived classes
	},
	onPrepareTemplates: function() {
		// Placeholder, override in your derived classes
	},
	onTitleRequest: function() {
		return false;
	},
	addEventListener: function(listener, callback) {
		window.addEventListener(listener, callback, false);
	}
});

Ladybug.Router = Ladybug.Class.extend({
	callback: null,
	defaults: {
		onRouteChange: $.noop
	},
	init: function(options) {
		var obj = this,
			opts = $.extend(true, obj.defaults, options);
		//
		var cb = function() {
			var matches = location.hash.match(/([a-z0-9-_]+)/ig) || [],
				params = [];
			if (matches) {
				params.push(matches);
			}
			opts.onRouteChange.call(obj, matches);
		};
		var nativeSupport = (typeof Moderniz !== 'undefined' && Modernizr.hashchange) ? true : ('onhashchange' in window);
		if (nativeSupport) {
			// Natively supported
			if (window.addEventListener)
				window.addEventListener("hashchange", cb, false);
			else if (window.attachEvent)
				window.attachEvent("onhashchange", cb);
			else
				window.onhashchange = cb;
		} else {
			// Polyfill
			var hash = location.hash;
			var pf = function() {
				if (location.hash != hash) {
					hash = location.hash;
					cb();
				}
				setTimeout(pf, 200);
			};
			pf();
		}
		obj.callback = cb;
	},
	start: function() {
		this.callback.call();
	},
	navigate: function(route) {
		location.hash = '#' + route;
	}
});

Ladybug.Application = Ladybug.Class.extend({
	defaultRoute: null,
	element: null,
	modules: null,
	module: null,
	router: null,
	templates: {},
	partials: {},
	init: function(options) {
		var obj = this,
			opts = $.extend(true, {
				defaultRoute: '/home',
				element: '',
				onDomReady: obj.onDomReady
			}, options);
		obj.defaultRoute = opts.defaultRoute;
		obj.onDomReady = opts.onDomReady;
		obj.element = typeof opts.element === 'string' ? $(opts.element) : opts.element;
		obj.modules = {};
		jQuery(document).ready(function($) {
			obj.onDomReady.call(obj, obj.element);
		});
		obj.router = new Ladybug.Router({
			onRouteChange: function(params) {
				if ( params[0] ) {
					var module = obj.modules[ params[0] ] || null;
					if (module) {
						obj.module = module;
						obj.element.attr('class', 'client cf page-' + params[0]);
						obj.module.onInit();
						obj.module.render(params);
						var title = obj.module.title() || Ladybug.Utils.titleCase(params[0]);
						document.title = title;
					}
				} else {
					this.navigate(obj.defaultRoute);
				}
			}
		});
	},
	onDomReady: function() {
		// Placeholder, override in your derived classes
	},
	registerModule: function(name, module) {
		var obj = this;
		module.name = name;
		obj.modules[name] = module;
	},
	apiCall: function(options) {
		var obj = this,
			opts = $.extend(true, {
				endpoint: '/status',
				method: 'get',
				data: {},
				success: $.noop,
				error: $.noop
			}, options);
		if ( typeof constants === 'undefined' || typeof constants.apiUrl === 'undefined' || typeof constants.apiToken === 'undefined' ) {
			console.error('Please define apiUrl and apiToken in your global constants object');
		} else {
			$.ajax({
				url: constants.apiUrl + opts.endpoint + '/?token=' + constants.apiToken,
				type: opts.method,
				dataType: 'json',
				data: opts.data,
				success: function(response) {
					if (response && response.result == 'success') {
						opts.success.call(obj, response.data || {}, response.extra || {});
					} else {
						opts.error.call(obj, response.message || 'An error has ocurred, please try again later');
					}
				},
				error: function(xhr, status, error) {
					console.error('An error has ocurred: ' + error);
				}
			});
		}
	}
});

Ladybug.FacebookApplication = Ladybug.Application.extend({
	onDomReady: function(options) {
		var obj = this;
		if ( typeof constants === 'undefined' || typeof constants.fbAppId === 'undefined' ) {
			console.error('Please define fbAppId in your global constants object');
		} else {
			// Set Facebook SDK callback
			window.fbAsyncInit = function() {
				FB.init({
					appId: constants.fbAppId,
					xfbml: true,
					version: 'v2.1'
				});
				// Facebook is ready, run callback
				obj.onFacebookReady();
			};
			// Include Facebook SDK
			(function(d, s, id){
				var js, fjs = d.getElementsByTagName(s)[0];
				if (d.getElementById(id)) {return;}
				js = d.createElement(s); js.id = id;
				js.src = "https://connect.facebook.net/en_US/sdk.js";
				fjs.parentNode.insertBefore(js, fjs);
			}(document, 'script', 'facebook-jssdk'));
		}
	},
	onFacebookReady: function() {
		// Placeholder, override in your derived classes
	}
});