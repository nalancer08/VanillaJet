HelloView = Ladybug.Scarlet.View.extend({

	animate: true,
	onInit: function() {
		var obj = this;
		obj.templates.base = Ladybug.Utils.compileTemplate('#hello');
	},
	onRender: function() {
		var obj = this,
			target = $('.app-content');
		target.html( obj.templates.base() );
		target.attr('class', 'app-content ' + app.slug + ' ' + app.action);

		app.runVelocity( target.find('[data-animable=auto]') );
	}
});