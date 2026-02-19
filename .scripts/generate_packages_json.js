// -- Vars
const path = require("path"),
	fs = require("fs");

// -- Main function
async function main() {

    // -- Create the object to be write in the file
    const json = {
        coreDependencies: {
            "modernizr": "//cdnjs.cloudflare.com/ajax/libs/modernizr/2.8.3/modernizr.min.js",
            "respond": "//cdnjs.cloudflare.com/ajax/libs/respond.js/1.4.2/respond.js",
            "jquery": "//cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js",
            "underscore": "//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.13.6/underscore-min.js"
        },
        dependencies: {},
        styles: {},
        fonts: {},
        anims: {}
    };
    //console.log(json);
    console.log("Creating the package.json file...");

    // -- Create the file
    await createFileIfnotExists(JSON.stringify(json, null, 2));
}

// -- Step 0
async function createFileIfnotExists(content) {

    const fileName = 'vanillaJet.package.json';
    const filePath = path.join(processCwd(), '/' + fileName);
    const exists = await fs.promises.access(filePath, fs.constants.F_OK).then(() => true).catch(() => false);
    
    if (!exists) {
        // -- Create the file with the json content
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

// -- Helpers
function processCwd() {
    return process.cwd()
        .replace('/.scripts', '');
}

module.exports = main;