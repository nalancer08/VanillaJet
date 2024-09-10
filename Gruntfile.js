module.exports = function(grunt) {

  require('jit-grunt')(grunt, {
    concat: 'grunt-contrib-concat',
    //compress: 'grunt-contrib-compress',
    clean: 'grunt-contrib-clean'
  });
  grunt.option('force', true);

  // -- Load modules
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-run');
  require('./.grunt/build_styles_task')(grunt);

  // -- Functions
  function getCwd() {
    const cwd = process.cwd();
    let newCwd = cwd
      .replace('/node_modules', '')
      .replace('/vanilla-jet', '')
      .replace('/.grunt', '');
    //console.log('cwd: ', newCwd);
    return newCwd;
  }
  

  // -- Vars
  const cssDestination = `${getCwd()}/public/styles/app.min.css`;
  const cssOrigin = `${getCwd()}/assets/styles/less/admin_build.less`;
  const jsDestination = `${getCwd()}/public/`;

  // -- Init
  grunt.initConfig({
    clean: {
      build: [`${getCwd()}/public/scripts/vanilla.min.js`],
      minified: [
        `${getCwd()}/public/scripts/api`, 
        `${getCwd()}/public/scripts/controllers`, 
        `${getCwd()}/public/scripts/views`, 
        `${getCwd()}/public/scripts/app.min.js`
      ],
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
          [cssDestination] : cssOrigin
        },
      }
    },
    watch: {
      options: {
        livereload: true
      },
      styles: {
        files: [
          `${getCwd()}/assets/styles/less/*.less`, 
          `${getCwd()}/assets/styles/less/**/*.less`, 
          `${getCwd()}/assets/styles/less/**/**/*.less`,
          `${getCwd()}/!assets/styles/less/admin_build.less`
        ],
        tasks: ['buildLess'],
        options: {
          nospawn: true
        }
      },
      scripts: {
        files: [
          `${getCwd()}/assets/pages/*.html`,
          `${getCwd()}/assets/templates/**/*.html`,
          `${getCwd()}/assets/templates/**/**/*.html`,
          `${getCwd()}/external/view/*.js`,
          `${getCwd()}/external/*.js`,
          `${getCwd()}/framework/*.js`
        ],
        tasks: ['shell:compileTemplates']
      },
      specificScripts: {
        files: [
          `${getCwd()}/assets/scripts/*.js`, 
          `${getCwd()}/assets/scripts/**/*.js`, 
          `${getCwd()}/assets/scripts/**/**/*.js`
        ],
        tasks: ['uglify', 'cleanForce:build', 'concat', 'cleanForce:minified']
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
          	`${getCwd()}/assets/scripts/*.js`,
      			`${getCwd()}/assets/scripts/**/*.js`,
          	`${getCwd()}/assets/scripts/**/**/*.js`,
          	`${getCwd()}/assets/scripts/**/**/**/*.js`
          ],
    			dest: getCwd() + '/public',
					rename  : function (dest, src) {

						var folder = src.substring(0, src.lastIndexOf('/')),
							  filename  = src.substring(src.lastIndexOf('/'), src.length);
      			filename  = filename.substring(0, filename.lastIndexOf('.'));
      			folder = folder.replaceAll('assets/', 'public/');
            let file = folder + filename + '.min.js';
            //console.log('file: ', file);
						return file;
					}
				}]
			}
		},
    concat: {
      build: {
        src: [
          // Order
          `${getCwd()}/public/scripts/controllers/**/*.min.js`,
          `${getCwd()}/public/scripts/views/**/*.min.js`,
          `${getCwd()}/public/scripts/api/**/*.min.js`,
          `${getCwd()}/public/scripts/*.min.js`,

          // Ignore files
          `!${getCwd()}/public/scripts/core/**`,
          `!${getCwd()}/public/scripts/plugins/**`,
          `!${getCwd()}/public/scripts/plugins/ui/**`
        ],
        dest: `${getCwd()}/public/scripts/vanilla.min.js`
      }
    },
    compress: {
      main: {
        options: {
          mode: 'gzip'
        },
        files: [{
          expand: true,
          src: [`${getCwd()}/public/scripts/vanilla.min.js`],
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
  
  grunt.registerTask('cleanForce', function(target) {
    grunt.option('force', true);
    grunt.task.run('clean:' + target);
  });
  grunt.registerTask('default', ['buildLess', 'uglify', 'cleanForce:build', 'concat', 'cleanForce:minified', 'shell:compileTemplates', 'watch']);
  grunt.registerTask('build', ['buildLess', 'uglify', 'cleanForce:build', 'concat', 'cleanForce:minified', 'shell:compileTemplates']);
  grunt.registerTask('server', ['buildLess']);
};