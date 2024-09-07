module.exports = function(grunt) {
    grunt.registerTask('buildLess', 'Compile admin.less and add .section.less', function() {
        let adminContent = grunt.file.read('assets/styles/less/admin.less');
        let sectionFiles = grunt.file.expand([
            'assets/styles/less/sections/**/*.section.less',
            'assets/styles/less/sections/*.section.less'
        ]);
        
        let combinedContent = adminContent + '\n';
        sectionFiles.forEach(function(filePath) {
            let sectionContent = grunt.file.read(filePath);
            combinedContent += `\n/* ${filePath} */\n` + sectionContent;
        });
 
       // -- New file
       grunt.file.write('assets/styles/less/admin_build.less', combinedContent);
       grunt.task.run(['less']);
    });
 };