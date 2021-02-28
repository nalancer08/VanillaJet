BaseController = Ladybug.Scarlet.Controller.extend({

	views: {},
	view: null,
	onInit: function() {
		var obj = this;
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

		var obj = this;

		var afterExitView = function() {

			view.render();
			$('.js-section-current').velocity('transition.slideRightIn', {
				
				duration: 350,
				//display: 'flex',
				complete: function() {

					if(typeof callback !== 'undefined') {
						callback.call(obj);
					}
				}
			});
			obj.view = view;
		};

		if ( $('.js-section-current').length > 0 ) {

			var content = $('.js-section-current');
			// content.velocity('transition.slideLeftOut',{
				
			// 	duration: 150,
			// 	complete: function() {
			// 		afterExitView();
			// 	}
			// });
			content.velocity({ scale: 0.95, opacity: 0.5 }, {
				duration: 250,
				easing: 'easeOutQuad',
				complete: function() {
					content.velocity({ translateY: 50, opacity: 0 }, {
						duration: 350,
						delay: 100,
						easing: 'easeOutQuad',
						complete: function() {
							afterExitView();
						}
					});
				}
			});
		} else {
			afterExitView();
		}
	}
});