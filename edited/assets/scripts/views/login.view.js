LoginView = Ladybug.Scarlet.View.extend({

	animate: true,
	onInit: function() {
		var obj = this;
		obj.templates.base = Ladybug.Utils.compileTemplate('#login');
	},
	onRender: function() {

		var obj = this,
			target = $('.app-content');
		target.html( obj.templates.base() );
		target.attr('class', 'app-content ' + app.slug + ' ' + app.action);

		app.runVelocity( target.find('[data-animable=auto]') );

		// -- View logics
		$('.button-login').on('click', function() {

			app.router.navigate('!/session/home');
		});
	}
});