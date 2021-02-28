AppController = BaseController.extend({

	views: {},
	view: null,
	onInit: function() {

		var obj = this;
		obj.pushAction('index', obj.indexAction);
		obj.pushAction('recover', obj.recoverAction);

		// -- Addign default views
		//obj.views.header = new HeaderView();
		//obj.views.footer = new FooterView();
		//obj.views.menu =   new MenuView();

		// -- Calling super
		obj.parent();
	},
	onEnter: function(params, callback) {

		var obj = this;
		callback.call(obj);

		//obj.views.header.render();
		//obj.views.footer.render();
		//obj.views.menu.render();
	},
	indexAction: function(id) {

		var obj = this;
		if(app.checkBearer()) {
			app.router.navigate('#!/session/categories');
			return;
		}
		if (! obj.views['login'] ) {
			obj.views.login = new LoginView();
		}
		obj.setActiveView(obj.views.login, function() {

		});
	},
	recoverAction: function(id) {

		var obj = this;
		obj.views.recover = new RecoverView();
		obj.setActiveView(obj.views.recover, function() {

			
			
		});
	}
});