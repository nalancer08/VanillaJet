//         __                             ______
//    ____/ /________ _____ _____  ____  / __/ /_  __
//   / __  / ___/ __ `/ __ `/ __ \/ __ \/ /_/ / / / /
//  / /_/ / /  / /_/ / /_/ / /_/ / / / / __/ / /_/ /
//  \__,_/_/   \__,_/\__, /\____/_/ /_/_/ /_/\__, /
//                  /____/                  /____/
//
// Starred by: nalancer08 <https://github.com/nalancer08>
// Refactor by: nalancer08 <https://github.com/nalancer08> <erick.sanchez@appbuilders.com.mx>
// Review by: nalancer08 <https://github.com/nalancer08> <erick.sanchez@appbuilders.com.mx>
// Version 3.5
// Dragonfly Node
//
//

// Framework
Server = require('./framework/server.js');
Config = require('./framework/config.js');

// Creating server
global.app = new Server(Config);
global.app.start();