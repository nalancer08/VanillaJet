/**
	Created by: nalancer08 <https://github.com/nalancer08>
	Revision: 0.1
**/

function ViewApp() {

	var obj = this;

	global.dipper.registerScript('base.controller', dipper.script('controllers/base.controller.js'), ['scarlet']);
	global.dipper.registerScript('app.controller', dipper.script('controllers/app.controller.js'), ['scarlet']);
	global.dipper.registerScript('session.controller', dipper.script('controllers/session.controller.js'), ['scarlet']);
	
	global.dipper.registerScript('footer.view', dipper.script('views/footer.view.js'), ['scarlet']);
	global.dipper.registerScript('header.view', dipper.script('views/header.view.js'), ['scarlet']);
	global.dipper.registerScript('menu.view', dipper.script('views/menu.view.js'), ['scarlet']);

	global.dipper.registerScript('login.view', dipper.script('views/login.view.js'), ['scarlet']);
	global.dipper.registerScript('recover.view', dipper.script('views/recover.view.js'), ['scarlet']);
	
	global.dipper.registerScript('home.view', dipper.script('views/home.view.js'));

	global.dipper.registerScript('script', dipper.script('app.js'), [
		
		'base.controller',
		'app.controller',
		'session.controller',

		'footer.view',
		'header.view',
		'menu.view',
		'login.view',
		'recover.view',

		'home.view'
	]);
	global.dipper.enqueueScript('script');
}

module.exports = ViewApp;