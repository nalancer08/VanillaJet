SessionController = BaseController.extend({

	views: {},
	view: null,
	zone: null,
	onInit: function() {

		var obj = this;
		obj.pushAction('home', obj.homeAction);

		obj.views.header = new HeaderView();
		obj.views.footer = new FooterView();
		obj.views.menu =   new MenuView();

		obj.parent();
	},
	onEnter: function(params, callback) {
		var obj = this;
		callback.call(obj);

		obj.views.header.render();
		obj.views.footer.render();
		obj.views.menu.render();
		$('.app-nav-menu').hide();
	},
	onExit: function(callback) {

		var obj = this;
		callback.call(obj);

		// Remove views
		obj.views.header.remove();
	},
	homeAction: function(id) {
		var obj = this;

		if (! obj.views['home'] ) {
			obj.views.home = new HomeView();
		}
		obj.setActiveView(obj.views.home, function() {
			//obj.fetchCategories();
		});
	}
});