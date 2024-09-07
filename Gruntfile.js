module.exports = function(grunt) {

  require('jit-grunt')(grunt, {
    concat: 'grunt-contrib-concat',
    //compress: 'grunt-contrib-compress',
    clean: 'grunt-contrib-clean'
  });

  // -- Load modules
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-run');
  require('./.grunt/build_styles_task')(grunt);

  grunt.initConfig({
    clean: {
      build: ['public/scripts/vanilla.min.js'],
      minified: ['public/scripts/api', 'public/scripts/controllers', 'public/scripts/views', 'public/scripts/app.min.js']
      //minified: ['public/scripts/**/*.min.js', 'public/scripts/*', '!public/scripts/vanilla.min.js']
    },
    less: {
      development: {
        options: {
          compress: true,
          yuicompress: true,
          optimization: 2,
          strictImports: true
        },
        files: {
          'public/styles/app.min.css' : 'assets/styles/less/admin_build.less'
        },
      }
    },
    watch: {
      options: {
        livereload: true
      },
      styles: {
        files: [
          'assets/styles/less/*.less', 
          'assets/styles/less/**/*.less', 
          'assets/styles/less/**/**/*.less',
          '!assets/styles/less/admin_build.less'
        ],
        tasks: ['buildLess'],
        options: {
          nospawn: true
        }
      },
      scripts: {
        files: [
          'assets/pages/*.html',
          'assets/templates/**/*.html',
          'assets/templates/**/**/*.html',
          'external/view/*.js',
          'external/*.js',
          'framework/*.js'
        ],
        tasks: ['shell:compileTemplates']
      },
      specificScripts: {
        files: ['assets/scripts/*.js', 'assets/scripts/**/*.js', 'assets/scripts/**/**/*.js'],
        tasks: ['uglify', 'clean:build', 'concat', 'clean:minified']
      }
    },
    uglify: {
			build: {
				options: {
				  sourceMap: false,
          compress: {
            drop_console: false,
            sequences: true,
            dead_code: true,
            conditionals: true,
            booleans: true,
            unused: true,
            if_return: true,
            join_vars: true
          },
          output: {
            ascii_only: true
          }
				},
				files: [{
          expand: true,
          src: [
          	'assets/scripts/*.js',
      			'assets/scripts/**/*.js',
          	'assets/scripts/**/**/*.js',
          	'assets/scripts/**/**/**/*.js'
          ],
    			dest: 'public/',
					cwd: '',
					rename  : function (dest, src) {

						var folder = src.substring(0, src.lastIndexOf('/')),
							  filename  = src.substring(src.lastIndexOf('/'), src.length);
      			filename  = filename.substring(0, filename.lastIndexOf('.'));
      			folder = folder.replaceAll('assets', '');
						return dest + folder + filename + '.min.js';
					}
				}]
			}
		},
    concat: {
      build: {
        src: [
          // Order
          'public/scripts/controllers/**/*.min.js',
          'public/scripts/views/**/*.min.js',
          'public/scripts/api/**/*.min.js',
          'public/scripts/*.min.js',

          // Ignore files
          '!public/scripts/core/**',
          '!public/scripts/plugins/**',
          '!public/scripts/plugins/ui/**'
        ],
        dest: 'public/scripts/vanilla.min.js'
      }
    },
    compress: {
      main: {
        options: {
          mode: 'gzip'
        },
        files: [{
          expand: true,
          src: ['public/scripts/vanilla.min.js'],
          dest: '',
          ext: '.min.js.gz'
        }]
      }
    },
    shell: {
      compileTemplates: {
        command: 'node .grunt/compile_html.js <%= grunt.option("env") %>'
      }
    }
  });
  
  grunt.registerTask('default', ['buildLess', 'uglify', 'clean:build', 'concat', 'clean:minified', 'shell:compileTemplates', 'watch']);
  grunt.registerTask('build', ['buildLess', 'uglify', 'clean:build', 'concat', 'clean:minified', 'shell:compileTemplates']);
  grunt.registerTask('server', ['buildLess']);
};