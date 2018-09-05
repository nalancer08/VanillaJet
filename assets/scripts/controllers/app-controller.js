AppController = BaseController.extend({

	views: {},
	view: null,
	onInit: function() {

		var obj = this;
		obj.pushAction('index', obj.indexAction);
		obj.pushAction('hello', obj.helloAction);

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
	},
	helloAction: function(id) {

		var obj = this;
		obj.views.hello = new HelloView();
		//obj.setActiveView(obj.views.hello);
		obj.setActiveView(obj.views.hello, function() {

			console.log("AYUDA");
			console.log(obj.views.menu);
			console.log(obj.views.menu.target);
		});
	}
});