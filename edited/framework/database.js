class Database {
	
	constructor(settings) {

		this.dbh = undefined;
		this.connection = undefined;

		// -- Database
		if (settings.db_driver != '') {

			switch(settings.db_driver) {

				case 'mysql':

					var mysql = require('mysql');
					this.dbh = mysql.createPool({
						connectionLimit : 2,
						host     : settings.db_host,
						user     : settings.db_user,
						password : settings.db_pass,
						database : settings.db_name
					});
					this.creatMySqlConnection();
 					//this.dbh.connect();

				break;
			}
		}
	}

	creatMySqlConnection() {

		var obj = this;

		obj.dbh.getConnection(function(err, connection) {

			if (err) {
				Error('No connection');
			} else if (connection) {
				obj.connection = connection;
			}
		});
	}
}

module.exports = Database; 

// // -- Outed function
// function exitHandler(options, exitCode) {

// 	console.log("Muriendo");
//     if (global.app.dbh != undefined) global.app.dbh.dbh.end(); console.log("MORIII");
//     if (options.exit) process.exit();
// }

// //do something when app is closing
// process.on('exit', exitHandler.bind(null,{cleanup:true}));

// //catches ctrl+c event
// process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// // catches "kill pid" (for example: nodemon restart)
// process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
// process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

// //catches uncaught exceptions
// process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

// 