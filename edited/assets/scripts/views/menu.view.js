MenuView = Ladybug.Scarlet.View.extend({
	
	onInit: function() {

		var obj = this;
		obj.templates.base = Ladybug.Utils.compileTemplate('#partial-menu');
	},
	onRender: function() {

		var obj = this;
		obj.target = $('.app-nav-menu');
		obj.target.html( obj.templates.base() );
	}
});