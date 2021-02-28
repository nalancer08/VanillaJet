"use strict"

let _table = '';
let _table_fields = '';
let _singular_class_name = '';
let _plural_class_name = '';

class Norm {

	constructor() {}

	static get table() { return _table; }
	static set table(table) { _table = table }

	static get table_fields() { return _table_fields; }
	static set table_fields(fields) { _table_fields = fields }

	static get singular_class_name() { return _singular_class_name; }
	static set singular_class_name(name) { _singular_class_name = name }

	static get plural_class_name() { return _plural_class_name; }
	static set plural_class_name(name) { _plural_class_name = name }

	/**
	 * Simulating __callstatic form PHP
	 * @param  string method   Name of the method called
	 * @param  array  key   Non asociative array with the key from called method
	 * @return mixed           Return values depending on the method called
	 */
	static _(method, key, params) {

		var ret = false,
			params = (params != undefined) ? params : {},
			matches = [];

		// Run regular expresion
		matches = method.match(/^((get|all)((?:not)?(?:by|like|in|between|exists|regexp)?))([A-Za-z]+)$/i);
		if (matches || method === 'all') {

			// Get the matched parameters
			method = (matches == null) ? 'all' : Norm.get_item(matches, 2, 'get');
			var type = (matches == null) ? '' :  Norm.get_item(matches, 3, 'By'),
				field = (matches == null) ? '' :  Norm.get_item(matches, 4, 'Id');

			// Snake.ize them
			method = Norm.camel_to_snake(method);
			type = Norm.camel_to_snake(type);
			field = Norm.camel_to_snake(field);

			// Check the type
			type = type.toUpperCase();
			type = type.replace('_', ' ');

			// Prepare varuables
			var conditions = undefined,
				params_index = 0;

			switch(type) {

				case 'BY':
					conditions = Norm.parse('%s = %s', field, key);
				break;

				case 'LIKE':
				case 'NOT LIKE':
					conditions = Norm.parse("%s %s '%s'", field, type, key); 
				break;

				case 'IN':
				case 'NOT IN':

					var values = values.join(',');
					conditions = Norm.parse('%s %s (%s)', field, type, values);

				break;

				case 'BETWEEN':
				case 'NOT BETWEEN':

					conditions = Noomr.parse("%s %s ('%s' AND '%s')", field, type, key, params[0]);
					params_index = 1; // Shift the index up

				break;

				case 'REGEXP':
				case 'NOT REGEXP':
					conditions = Norm.parse("%s %s '%s'", field, type, key);
				break;

				default:
					conditions = '';
				break;
			}

			// Execute method
			if (conditions != undefined) {

				var options = {};
					options['conditions'] = conditions;

				// Now for the actual parameters
				var norm_params = params;
				if (norm_params instanceof Object && norm_params['conditions'] != undefined) {
					options['conditions'] += norm_params['conditions'];
					//delete norm_params['conditions'];
				}
				options = Object.assign(options, norm_params);
				
				// And call the function
				var methods = ['get', 'all'];
				method  = methods.includes(method) ? method : 'get';

				// Retuirn throw promise
				return new Promise(function(resolve, reject) {

					Norm[method](options).then(function(result) {
						resolve(result);
					}, function(error) {
						reject(Error('Error in NORM : ${error}'));
					});	
				});
			}
		}
	}

	static querify(fields, action) {

		var ret = [],
			_ = require('underscore'),
			action = (action != undefined) ? action : false;

		if (action == 'bind') {

			_.each(fields, function(field) {
				ret.push(Norm.parse(":%s", field));
			});

		} else if (action == 'param') {

			_.each(fields, function(field) {
				ret.push(Norm.parse("%s = :%s", field, field));
			});

		} else {
			ret = fields;
		}

		return ret.join(', ');
	}

	static count(conditions) {

		var ret = 0,
			conditions = (conditions != undefined) ? conditions : 1;

		return new Promise(function(resolve, reject) {

			global.app.getDbh().then(function(dbh) {
				
				if (conditions instanceof Object) {

					conditions = Norm.objFilter(conditions);
					// implode to AND
				}

				var table = Norm.table,
					class_name = Norm.plural_class_name;

				dbh.query(Norm.parse('SELECT COUNT(*) AS total FROM %s WHERE %s', table, conditions), function (error, results, fields) {

					if (error) {
						reject(Error('Error in query : ${error}'));
					} else if (results) {
						resolve(results[0]['total']);
					}
				});

			}, function(error) {
				reject(Error('Error getting connection : ${error}'));
			});
		});
	}

	static get(options) {

		var ret = false,
			options = (options != undefined) ? options : {},
			rows = '';

		options['show'] = 1;

		return new Promise(function(resolve, reject) {

			Norm.all(options).then(function(rows) {

				if (rows) {
					//ret = rows.shift();
				}
				resolve(rows);

			}, function(error) {
				reject(Error('Error :: ${error}'));
			});
		});	
	}

	static all(options) {

		console.log(options);

		return new Promise(function(resolve, reject) {

			var ret = [];

			// Generals
			var table = Norm.table,
				table_fields = Norm.table_fields,
				class_name = Norm.plural_class_name,
				query_fields = Norm.querify(Norm.get_item(options, 'query_fields', table_fields));

			// Default variables
			var show = Norm.get_item(options, 'show', 1000),
				page = Norm.get_item(options, 'page', 1),
				sort = Norm.get_item(options, 'sort', 'asc'),
				by = Norm.get_item(options, 'by', 'id'),
				group = Norm.get_item(options, 'group', '');

			var conditions = Norm.get_item(options, 'conditions', ''),
				pdoargs = Norm.get_item(options, 'pdoargs', {});

			var debug = Norm.get_item(options, 'debug', false),
				code = Norm.get_item(options, 'code', false),
				query = Norm.get_item(options, 'query', false);

			var offset = Number(show * (page - 1));

			// Sanity checks
			by = table_fields.includes(by) ? by : false;
			sort = ['asc', 'desc'].includes(sort) ? sort : false;
			sort = sort ? sort.toUpperCase() : sort;
			//offset = (offset instanceof Number) ? show : false;
			//show = (show instanceof Number) ? show : false;
			group = table_fields.includes(group) ? group : false;

			if (by === false || sort === false || offset === false || show === false) {

				console.log("NORM _ Error _ : Parameter Error: sort, offset or show not well defined");
				resolve(ret);
				return;
			}

			if (group) {
				if (!table_fields.includes(group)) {

					console.log("NORM _ Error _ : Parameter Error: group not well defined");
					resolve(ret);
					return;
				}
			}
			group = group ? Norm.parse('GROUP BY %s', group) : '';

			if (conditions instanceof Array) {
				conditions = conditions.join(' AND ');
			}
			conditions = conditions ? Norm.parse('WHERE %s', conditions) : '';

			// Soft delete
			if (table_fields.includes('deleted')) {
				conditions += (conditions ? ' AND deleted != 1' : 'WHERE deleted != 1');
			}

			global.app.getDbh().then(function(dbh) {

				var sql = query ? query : Norm.parse('SELECT %s FROM %s %s %s ORDER BY %s %s LIMIT %s, %s', query_fields, table, conditions, group, by, sort, offset, show);				
				if (debug) console.log(sql);
				if (code) resolve(sql);

				//dbh.query('SELECT * FROM user', function (error, results, fields) {
				dbh.query(sql, function (error, results, fields) {

					dbh.release();
					if (error) {
						reject(Error(Norm.parse('Error in query : %s', error)));
					} else if (results) {
						resolve(results);
					}
				});

			}, function(error) {
				reject(Error('Error getting connection : ${error}'));
			});
		});

		// global.app.getDbh().then(function(dbh) {

		// 	return new Promise(function(resolve, reject) {
		// 		dbh.query('SELECT * FROM user', function (error, results, fields) {

		// 			if (error) {
		// 				reject(Error('Error in query : ${error}'));
		// 			} else if (connection) {
		// 				resolve(results);
		// 			}
		// 		});
		// 	});
		// }, function(error) {});
	}

	static camel_to_snake(string) {

		return string.split(/(?<=[a-z0-9])(?=[A-Z0-9])/g)
  				.map((piece) => piece.toLowerCase())
  				.join('_');
	}

	static get_item(object, index, def) {

		return (object != undefined && object[index] != undefined) ? object[index] : def;
	}

	static parse(str) {

   		var args = [].slice.call(arguments, 1),
        	i = 0;

    	return str.replace(/%s/g, function() {
        	return args[i++];
    	});
	}

	static objFilter(obj) {

		var _ = require('underscore'),
			keys = Object.keys(obj),
			newObj = {};

		_.each(keys, function(key) {

			var temp = keys[key];
			if (temp != undefined || temp != '' || temp != null) {
				newObj[key] = temp;
			}
		});
		return newObj;
	}

	static objImplode(obj) {

		var _ = require('underscore'),
			keys = Object.keys(obj),
			implodeString = '';

		_.each(keys, function(key) {

			var temp = keys[key];
			if (temp != undefined || temp != '' || temp != null) {
				newObj[key] = temp;
			}
		});
		return newObj;
	}
}

// function Ninja() {

// 	var myObj = {};
// 	var myProxy = new Proxy(myObj, {
// 	  get: function get(target, name) {
// 	    return function wrapper() {
// 	      var args = Array.prototype.slice.call(arguments);
// 	      //console.log(target);
// 	      console.log(name);
// 	      console.log(args[0]);
// 	      return "SI SI SI";
// 	    }
// 	  }
// 	});
// 	console.log(myProxy.foo('bar'));  // prints 'bar'
// }

module.exports = Norm;