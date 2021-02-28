module.exports = function(grunt) {

  require('jit-grunt')(grunt);

  grunt.initConfig({
    less: {
      development: {
        options: {
          compress: true,
          yuicompress: true,
          optimization: 2,
          strictImports: true
        },
        files: {
          'assets/styles/admin.css' : 'assets/styles/less/admin.less' // destination filne and source file
        }
      }
    },
    watch: {
      styles: {
        files: ['assets/styles/less/*.less', 'assets/styles/less/**/*.less', 'assets/styles/less/**/**/*.less'], // which files to watch
        tasks: ['less'],
        options: {
          nospawn: true
        }
      }
    }
  });

  grunt.registerTask('default', ['less', 'watch']);
};