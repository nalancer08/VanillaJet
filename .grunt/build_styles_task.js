module.exports = function(grunt) {
    grunt.registerTask('buildLess', 'Compile admin.less and add .section.less', function() {

        // -- Functions
        function getCleanedCWD() {
            const cwd = process.cwd();
            return cwd
                .replace('/node_modules', '')
                .replace('/vanilla-jet', '')
                .replace('/.grunt', '');
        }
        console.log('cwd 1: ', getCleanedCWD());

        // -- Content
        let adminContent = grunt.file.read(`${getCleanedCWD()}/assets/styles/less/admin.less`);
        let sectionFiles = grunt.file.expand([
            `${getCleanedCWD()}/assets/styles/less/sections/**/*.section.less`,
            `${getCleanedCWD()}/assets/styles/less/sections/*.section.less`
        ]);
        
        let combinedContent = adminContent + '\n';
        sectionFiles.forEach(function(filePath) {
            let sectionContent = grunt.file.read(filePath);
            combinedContent += `\n/* ${filePath} */\n` + sectionContent;
        });
 
       // -- New file
       grunt.file.write(`${getCleanedCWD()}/assets/styles/less/admin_build.less`, combinedContent);
       grunt.task.run(['less']);
    });
 };