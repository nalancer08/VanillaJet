const Norm = require('../libs/orm/norm.js');
const Crood = require('../libs/orm/crood.js');

class User extends Crood {

	init(args) {

		var obj = this,
			args = (args != undefined) ? args : false,
			moment = require('moment'),
			now = moment().format("YYYY-MM-DD HH:mm:ss");

		// -- Set your table fields
		obj.id = 0;
		obj.name = '';
		obj.description = '';
		obj.price = '';
		obj.available = '';
		obj.created = now;
		obj.modified = now;

		// -- Set model fields
		obj.table = 'activitie';
		obj.table_fields = ['id', 'name', 'description', 'price', 'available', 'created', 'modified'];
		obj.update_fields = ['name', 'description', 'price', 'available', 'modified'];
		obj.singular_class_name = 'User';
		obj.plural_class_name = 'Users';

		// Meta model
		obj.meta_table = '';
		obj.meta_id = '';

		if (obj.id > 0) {

			//
		}
	}
}

class Users extends Norm {

	contructor() {}

	static init() {

		Users.user_id = 0;
	}

	static lol() {

		var t = 'pum';
		//console.log(`JAJAJAJAJA ${t} ${Norm.table}`);
		console.log(Norm.parse("JAJAJAJAJA %s %s %s", t, Norm.table, Users.table));
	}
}

Users.user_id = 0;
Users.table = 'user';
Users.table_fields = ['id', 'slug', 'fbid', 'uuid', 'login', 'email', 'password', 'nicename', 'status', 'type', 'created', 'modified'];
Users.singular_class_name = 'User';
Users.plural_class_name = 'Users';

module.exports.User = User;
module.exports.Users = Users;