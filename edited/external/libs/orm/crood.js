"use strict"

const Model = require('../orm/model.js');

let _table = '';
let _table_fields = '';
let _update_fields = '';
let _search_fields = '';
let _singular_class_name = '';
let _plural_class_name = '';

class Crood extends Model {

	constructor() {

		super();
		this.id;
		this.meta_id = "";
		this.meta_table = "";
	}

	get table() { return _table; }
	set table(table) { _table = table }

	get table_fields() { return _table_fields; }
	set table_fields(fields) { _table_fields = fields }

	get update_fields() { return _update_fields; }
	set update_fields(fields) { _update_fields = fields }

	get search_fields() { return _search_fields; }
	set search_fields(fields) { _search_fields = fields }

	get singular_class_name() { return _singular_class_name; }
	set singular_class_name(name) { _singular_class_name = name }

	get plural_class_name() { return _plural_class_name; }
	set plural_class_name(name) { _plural_class_name = name }

	init(args) {

		args = (args != undefined) ? args : false;
	}

	save() {

		var obj = this,
			_ = require('underscore'),
			ret = false,
			dbh = global.app.getPoolDbh();

		var table_fields = obj.querify(obj.table_fields);
		var bind_fields = obj.querify(obj.table_fields, 'bind');
		var param_fields = obj.querify(obj.update_fields, 'param');

		console.log(bind_fields);

		if (obj.table_fields.includes('fts') && obj.search_fields.length > 0) {

			var fts_fields = [];
			_.each(obj.search_fields, function(search_field) {
				fts_fields.push(search_field);
			});
			obj.fts = '[' + fts_fields.split('][') + ']';
		}

		// Getting conention
		//var sql = "INSERT INTO ?? (??) VALUES (?) ON DUPLICATE KEY UPDATE ?",
			//inserts = [obj.table, table_fields, bind_fields, param_fields];

		var sql = Crood.parse("INSERT INTO %s (%s) VALUES (%s) ON DUPLICATE KEY UPDATE %s", 
					obj.table, table_fields, bind_fields, param_fields);

		return new Promise(function(resolve, reject) {

			var query = dbh.query(sql, function (error, results, fields) {

				dbh.release();

				if (error) {

					//reject(Error(Crood.parse('Error in query : %s', error)));
					reject(ret);

				} else if (results) {

					if (!obj.id && results.insertId) {
						obj.id = results.insertId;
					}

					// Updating metas
					if (obj.metas != undefined && obj.metas instanceof Object) {
						obj.updateMetas(obj.metas);
					}
					ret = obj.id;
					resolve(ret);
				}
			});
			console.log("QUERY ::" + query.sql);
		});
	}

	/**
	 * Delete model
	 * @return boolean True on success, False otherwise
	 */
	delete() {

		var obj = this,
			ret = false,
			dbh = global.app.getPoolDbh();

		return new Promise(function(resolve, reject) {

			var sql = '';
			if (obj.table_fields.includes('deleted')) {
				sql = "UPDATE ?? SET deleted = 1 WHERE id = ?";
			} else {
				sql = "DELETE FROM ?? WHERE id = ?";
			}

			var inserts = [obj.meta_table, obj.id];
			dbh.query(sql, inserts, function (error, results, fields) {

				dbh.release();
				if (error) {
					reject(Error(Crood.parse('Error in query : %s', error)));
				} else if (results) {
					resolve(true);
				}
			});
		});
	}

	__toString() {

		return JSON.stringify(this);
	}

	/**
	 * Querify the fields passed (implodes)
	 * @param  array $fields  Array with field list
	 * @return string         String with all the fields imploded for querying
	 */
	querify(fields, action) {

		var obj = this,
			ret = [],
			_ = require('underscore'),
			action = (action != undefined) ? action : false;

		if (action == 'bind') {

			_.each(fields, function(field) {
				ret.push(Crood.parseQuery("%s", obj[field]));
			});

		} else if (action == 'param') {

			_.each(fields, function(field) {

				if (field == 'modified') {
					ret.push(Crood.parse("%s = NOW()", field));
				} else {

					ret.push(
						Crood.parse("%s = ", field) + Crood.parseQuery("%s", obj[field])
					);
				}
			});

		} else {
			ret = fields;
		}

		return ret.join(', ');
	}

	/*  	__  ___     __        __  ___          __     __
		   /  |/  /__  / /_____ _/  |/  /___  ____/ /__  / /
		  / /|_/ / _ \/ __/ __ `/ /|_/ / __ \/ __  / _ \/ /
		 / /  / /  __/ /_/ /_/ / /  / / /_/ / /_/ /  __/ /
		/_/  /_/\___/\__/\__,_/_/  /_/\____/\__,_/\___/_/
		                                                 */

	getMeta(name, def) {

		var obj = this,
			ret = def,
			dbh = global.app.getPoolDbh();

		return new Promise(function(resolve, reject) {

			var sql = "SELECT value FROM ?? WHERE ?? = ? AND name = ?",
				inserts = [obj.meta_table, obj.meta_id, obj.id, name];
			dbh.query(sql, inserts, function (error, results, fields) {

				dbh.release();
				if (error) {
					reject(Error(Crood.parse('Error in query : %s', error)));
				} else if (results) {

					if (results[0] != undefined) {

						var row = results[0];
						ret = JSON.parse(row['value']);
						if (ret === false) {
							ret = row['value'];
						}
					}
					resolve(JSON.parse(ret));
				}
			});
		});
	}

	getMetas() {

		var obj = this,
			ret = {},
			dbh = global.app.getPoolDbh();

		return new Promise(function(resolve, reject) {

			var sql = "SELECT name, value FROM ?? WHERE ?? = ?",
				inserts = [obj.meta_table, obj.meta_id, obj.id];
			dbh.query(sql, inserts, function (error, results, fields) {

				dbh.release();
				if (error) {
					reject(Error(Crood.parse('Error in query : %s', error)));
				} else if (results) {

					_.each(results, function(meta){

						ret[meta['name']] = JSON.parse(meta['value']);
						if (ret[meta['name']] == false) {
							ret[meta['name']] = meta['value'];
						}
					});
					resolve(JSON.parse(ret));
				}
			});
		});
	}

	updateMeta(name, value) {

		var obj = this,
			ret = false,
			dbh = gloabl.app.getPoolDbh();

		return new Promise(function(resolve, reject) {

			if (value instanceof Array || value instanceof Object) {
				value = JSON.stringify(value);
			}

			var sql = "INSERT INTO ?? (id, ??, value, name) VALUES (0, ?, ?, ?) ON DUPLICATE KEY UPDATE value = ?",
				inserts = [obj.meta_table, obj.meta_id, obj.id, value, name, value];
			dbh.query(sql, inserts, function (error, results, fields) {

				dbh.release();
				if (error) {
					reject(Error(Crood.parse('Error in query : %s', error)));
				} else if (results) {

					if (results.insertId) {
						resolve(true);
					}
				}
			});
		});
	}

	updateMetas(metas) {

		var obj = this,
			ret = false;

		Object.keys(metas).each(function(k, i) {
			updateMeta(k, metas[k]);
		});

		ret = true;
		return ret;
	}

	static parseQuery(str) {

   		var args = [].slice.call(arguments, 1),
        	i = 0;

    	return str.replace(/%s/g, function() {
    		var t = args[i++];
        	return Crood.isNumeric(t) ? Number(t) : "'" + t + "'";
    	});
	}

	static parse(str) {

   		var args = [].slice.call(arguments, 1),
        	i = 0;

    	return str.replace(/%s/g, function() {
        	return args[i++];
    	});
	}

	static isNumeric(value) {

	    return /^-{0,1}\d+$/.test(value);
	}
}

module.exports = Crood;