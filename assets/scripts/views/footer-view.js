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