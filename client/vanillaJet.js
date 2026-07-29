/**
 * VanillaJet.js
 *
 * A tiny powerful framework for build SPA applications
 *
 * @author: nalancer08 (https://github.com/nalancer08)[Erick Sanchez]
 * @version: 2.0.1
 * @description: A tiny powerful framework for build SPA applications
 *
 * @license  MIT
 */

if ( typeof VanillaJet === 'undefined' ) { VanillaJet = {}; }

(function(window){ "use strict";

	VanillaJet.Class = function(){};

	var initializing = false;
	var lastClassId = 0;
	var fnTest = /xyz/.test(function(){xyz;}) ? /\bparent\b/ : /.*/;

	var copy = function( object ) {
		if(
			!object || typeof(object) != 'object' ||
			object instanceof HTMLElement ||
			object instanceof VanillaJet.Class
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

	VanillaJet.Class.extend = function(prop) {

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
		Class.extend = VanillaJet.Class.extend;
		Class.inject = inject;
		Class.classId = prototype.classId = ++lastClassId;

		return Class;
	};

})(window);

const VanillaJetRenderType = Object.freeze({
  Underscore: 'underscore',
  Vue: 'vue',
});

VanillaJet.Utils = {
	compileTemplate: function(selector) {
		let markup = $(selector).html() || 'Template '+ selector +' not found';
		return _.template(markup);
	},
	titleCase: function (str) {
		return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	},
	camelCase: function(str) {
		return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); })
	},
	guid: function() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);
		}
		return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();
	}
};

VanillaJet.Module = VanillaJet.Class.extend({
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
	onRender: function(params = {}, callback) {
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

VanillaJet.Router = VanillaJet.Class.extend({
	callback: null,
	defaults: {
		onRouteChange: $.noop
	},
	init: function(options) {
		let obj = this,
			opts = $.extend(true, obj.defaults, options);
		let cb = function() {
			let matches = location.hash.match(/([a-z0-9-_]+)/ig) || [],
				  params = [];
			if (matches) {
				params.push(matches);
			}
			opts.onRouteChange.call(obj, matches);
		};
		let nativeSupport = (typeof Moderniz !== 'undefined' && Modernizr.hashchange) ? true : ('onhashchange' in window);
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
			let hash = location.hash;
			let pf = function() {
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
		location.hash = route;
	},
	segue: function(route, obj) {
		location.hash = '#' + route;
		app.currentSegueData = obj;
	}
});

VanillaJet.View = VanillaJet.Class.extend({

	templates: {},
	target: '',
	element: null,
	init: function(options, more) {
		var obj = this;
		obj.onInit.call(obj, options, more);
		if (app != undefined && app.controller != undefined) {
			app.controller.onViewChange();
		}
	},
	render: function() {
		var obj = this;
		obj.onRender();
	},
	remove: function() {
		var obj = this;
		obj.onRemove();
	},
	onInit: function(options) {
		// Override in your app
	},
	onRender: function() {
		// Override in your app
	},
	onAsyncRender: function(data) {

		let obj = this;

		// -- Check typeRender
		switch(obj.typeRender || '') {

			case 'vue':
				obj.async = false;
				obj.onVueRender(data);
				break;

			default:
				let compiled = VanillaJet.Utils.compileTemplate(obj.template);
				obj.templates.base = compiled(data);
				obj.async = false;
				obj.onRender();
				break;
		}
	},
	onRemove: function() {},
	onVueRender: function() {}
});

VanillaJet.Controller = VanillaJet.Class.extend({

	actions: {},
	id: null,
	init: function(options) {

		var obj = this;
		obj.onInit.call(obj);
		obj.id = VanillaJet.Utils.guid();
	},
	pushAction: function(slug, action) {
		var obj = this;
		obj.actions[slug] = action;
	},
	pushSubAction: function(base, sub, action) {
		const fullSlug = `${base}/:id/${sub}/:sub`;
		this.actions[fullSlug] = action;
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
	},
	onControllerChange: function() {
		// Override in your app
	},
  onViewChange: function() {
		// Override in your app
	},
});

VanillaJet.Application = VanillaJet.Class.extend({

	defaultController: 'app',
	defaultAction: 'index',
	controller: null,
	controllers: {},
	router: null,
	slug: null,
	action: null,
	id: null,
	sub: null,
	currentSegueData: null,
	init: function(options) {

		var obj = this;
		jQuery(document).ready(function($) {
			obj.onDomReady.call(obj, $);
		});
		obj.router = new VanillaJet.Router({
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
		obj.paramsList = [];

		if (params.length <= 2) {
			obj.paramsList.push('');
		} else {
			for (let i = 2; i < params.length; i++) {
				obj.paramsList.push(params[i] ?? '');
			}
		}

		if ( obj.slug ) {
			var controller = obj.controllers[obj.slug];
			if (controller) {
				// Define the callbacks
				var afterEnterController = function() {
					obj.onControllerChange.call(obj);
				};
				var afterExitController = function() {

					//controller.onControllerChange.call(obj);
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
					var paramsList = obj.paramsList || [];
					var keys = Object.keys(obj.controller.actions);

					// Ordenar rutas por longitud descendente (más específicas primero)
					keys.sort((a, b) => b.split('/').length - a.split('/').length);

					let matched = false;

					for (const key of keys) {
						const keyParts = key.split('/');
						const actionPart = keyParts[0];
						const paramParts = keyParts.slice(1);

						if (actionPart !== obj.action) continue;
						if (paramParts.length !== paramsList.length) continue;

						const actionFn = obj.controller.actions[key];
						if (typeof actionFn === 'function') {
							actionFn.call(obj.controller, ...paramsList);
							matched = true;
							break;
						}
					}

					// Si no coincidió con ninguna acción con parámetros, intenta acción simple
					if (!matched) {
						const fallbackAction = obj.controller.actions[obj.action];
						if (typeof fallbackAction === 'function') {
							fallbackAction.call(obj.controller, ...paramsList);
						} else {
							app.router.segue('/');
							console.error(`Error: "${obj.action}" action is not available in "${obj.slug}" controller.`);
						}
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
			obj.router.navigate('/' + obj.defaultController);
		}
	},
	onControllerChange: function() {
		// Override in your app
	}
});

// -- Extends
BaseController = VanillaJet.Controller.extend({

	views: {},
	view: null,
	onInit: function() {
		let obj = this;
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

		let obj = this;

		if (view.name) {
			app.logAEvent(`SCREEN_${view.name}`);
		}

		// Views swap instantly. The old velocity exit/enter transitions added
		// ~1s of artificial latency to EVERY navigation and crashed navigation
		// outright whenever the velocity plugin failed to load (the whole
		// "velocity is not a function" family in Sentry).
		view.render();
		obj.view = view;
		if (typeof callback !== 'undefined') {
			callback.call(obj);
		}
	}
});

// -- New VanillaJet magic --
class VanillaJetView {

	constructor({
		template,
		options = {},
		typeRender = VanillaJetRenderType.Underscore,
		async = false,
		showLoaderFunction = null,
		hideLoaderFunction = null
	} = {}) {

    if (template === undefined) {
			throw new Error('VanillaJetView: template parameter is required');
		}

		this.template = template;
		this.options = options;
		this.typeRender = typeRender;
		this.async = async;
		this.showLoaderFunction = null;
		this.hideLoaderFunction = null;
		this.templates = {};
		this.components = {};
    this.rendered = false;

		if (typeof showLoaderFunction === 'object' && hideLoaderFunction === null && Object.keys(options).length === 0) {
			this.options = showLoaderFunction;
			this.showLoaderFunction = null;
			this.hideLoaderFunction = null;
		}
		this.showLoaderFunction = () => {
			if (showLoaderFunction) {
				showLoaderFunction();
			} else if (app && typeof app.showLoader === 'function') {
				app.showLoader();
			} else if (typeof document !== 'undefined') {
				const loader = document.querySelector('.loading-new-container');
				if (loader) loader.style.display = 'flex';
			}
		};
		this.hideLoaderFunction = () => {
			if (hideLoaderFunction) {
				hideLoaderFunction();
			} else if (app && typeof app.hideLoader === 'function') {
				app.hideLoader();
			} else if (typeof document !== 'undefined') {
				const loader = document.querySelector('.loading-new-container');
				if (loader) loader.style.display = 'none';
			}
		};
		this.onInit();
		if (app?.controller) { app.controller.onViewChange(); }
	}

	onInit() {
		let template = (this.async) ? '#async-template' : this.template;
		this.templates.base = VanillaJet.Utils.compileTemplate(template);
		if (!this.async) { this.rendered = true; }
	}

	render() { this.onRender(); }

	onRender() {
		const appContent = document.querySelector('.app-content');
		appContent.innerHTML = this.templates.base();
		appContent.setAttribute('class', `app-content ${app.slug} ${app.action}`);
		app.runVelocity(appContent.querySelectorAll('[data-animable=auto]'));
		window.scrollTo(0, 0);

		if (this.typeRender === VanillaJetRenderType.Vue) {
			this.onCreateVueComponents();
		}

		if (this.async) { this.showLoaderFunction(); }
		this.onPrepare();
	}

	// -- Override in code -- Super at the end
	async onPrepare(data) {
		switch (this.typeRender) {
			case VanillaJetRenderType.Underscore:
				this.onUnderscoreRender(data);
				break;
			case VanillaJetRenderType.Vue:
				this.onVueRender(data);
				break;
		}
		this.onCreated();
	}

	onUnderscoreRender(data) {
		if (this.async) { this.hideLoaderFunction(); }
		if (this.rendered) { return; }
		let compiled = VanillaJet.Utils.compileTemplate(this.template);
		this.templates.base = compiled(data);
		$('.app-content').html(this.templates.base);
	}

	onVueRender(data) {
		this.hideLoaderFunction();
		$('.app-content').attr('class', 'app-content ' + app.slug + ' ' + app.action);
		$('.app-content').html('<div class="content"></div>');
		if (app && !app.ui) {
			app.ui = {};
		}
		if (app?.ui) {
			app.ui.vueApp = new Vue({
				el: '.app-content .content',
				template: document.getElementById(this.template).innerHTML,
				data: data.data || {},
				methods: data.methods || {},
				computed: data.computed || {},
				components: {...this.components}
			});
		}
	}

	// -- Super at begin
	onCreated() {}

	remove() { this.onRemove(); }

	// -- Override in code
	onRemove() {}

	// -- Override in code
	onCreateVueComponents() {}
}

// VueBaseView - Base class for Vue-based views
if (typeof VueBaseView === 'undefined') {
	class VueBaseView extends VanillaJetView {
		constructor(options = {}) {
			super({
				...options,
				typeRender: VanillaJetRenderType.Vue
			});
			this.vueApp = null;
		}

		static getBaseVueComponents() {
			return {
				'm1-back-button': {
					props: {
						title: {
							type: String,
							default: ''
						}
					},
					template: '#tpl-m1-back-button',
					methods: {
						handleBack() {
							globalThis.history.back();
						}
					}
				}
			};
		}

		onCreateVueComponents() {
			const baseComponents = VueBaseView.getBaseVueComponents();
			const specificComponents = this.getVueComponents ? this.getVueComponents() : {};
			this.components = {...baseComponents, ...specificComponents};
		}

		onVueRender(data) {
			const vueData = {
				data: data.data || {},
				methods: data.methods || {},
				computed: data.computed || {}
			};

			this.hideLoaderFunction();
			$('.app-content').attr('class', `app-content ${app.slug} ${app.action}`);

			if (!this.rendered) {
				const compiled = VanillaJet.Utils.compileTemplate(this.template);
				const appContent = document.querySelector('.app-content');
				if (appContent) {
					appContent.innerHTML = compiled({});
					this.rendered = true;
				}
			}

			const templateId = this.template.replace('#', '');
			const vueTemplateId = `${templateId}-vue`;
			const templateElement = document.getElementById(vueTemplateId);
			if (!templateElement) {
				console.error(`Vue template not found: ${vueTemplateId}`);
				return;
			}

			const rootId = `${templateId.replace('template-', '')}-root`;
			const rootElement = document.getElementById(rootId);
			if (!rootElement) {
				console.error(`Root element not found: #${rootId}`);
				return;
			}

			const vueConfig = {
				el: rootElement,
				template: templateElement.innerHTML,
				data: vueData.data,
				methods: vueData.methods,
				computed: vueData.computed,
				components: {...this.components}
			};

			if (data.mounted) vueConfig.mounted = data.mounted;
			if (data.watch) vueConfig.watch = data.watch;
			if (data.beforeDestroy) vueConfig.beforeDestroy = data.beforeDestroy;

			this.vueApp = new Vue(vueConfig);
			if (app?.ui) {
				app.ui.vueApp = this.vueApp;
			}
		}

		onRemove() {
			if (this.vueApp) {
				this.vueApp.$destroy();
				this.vueApp = null;
			}
		}
	}

	globalThis.VueBaseView = VueBaseView;
}

class VanilleJetBasicView {

	constructor({
		template,
		options = {},
	} = {}) {

    this.template = template;
		this.options = options || {};
		this.typeRender = VanillaJetRenderType.Underscore;
		this.templates = {};

		this.onInit();
		if (app?.controller) { app.controller.onViewChange(); }
	}

	onInit() {
    this.templates.base = VanillaJet.Utils.compileTemplate(template);
  }

	render() { this.onRender(); }

  // -- Super at the end
	onRender() {

		this.onCreated();
	}

	// -- Super at begin
	onCreated() {}

	remove() { this.onRemove(); }

	// -- Override in code
	onRemove() {}
}
