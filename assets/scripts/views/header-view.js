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