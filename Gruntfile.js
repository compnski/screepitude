module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-coffee');
    grunt.loadNpmTasks('grunt-screeps');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks("grunt-ts");

    grunt.initConfig({
        "pkg": grunt.file.readJSON('package.json'),
        "secret": grunt.file.readJSON('secret.json'),
        "screeps": {
            "staging":{
                "options": {
                    email: '<%= secret.email %>',
                    password: '<%= secret.password %>',
                    branch: 'sim',
                    ptr: false
                },
                files: {
                    src: ['v3_out/*.js']
                }
            },
            "prod-v2":{
                "options": {
                    email: '<%= secret.email %>',
                    password: '<%= secret.password %>',
                    branch: 'stable',
                    ptr: false
                },
                files: {
                    src: ["v2_out/*.js"]
                }
            },
            "prod-v3": {
                "options": {
                    email: '<%= secret.email %>',
                    password: '<%= secret.password %>',
                    branch: 'stable',
                    ptr: false
                },
                files: {
                    src: ["v3_out/*.js"]
                }
            }
        },
        "ts": {
            v3 : {
                files: [{src:["v3/*.ts"],dest:"v3_out/main.js"}],
                options: {
                    inlineSources: true,
                }
            }
        },
        "coffee": {
            "v2": {
                "options": {
                  bare: true,
                  sourceMap: true
              },
              expand: true,
              flatten: true,
              cwd: "v2",
              src: ["**/*.coffee"],
              dest: 'v2_out',
              ext: ".js"
          },
          "v1": {
            "options": {
              bare: true,
              sourceMap: true
          },
          expand: true,
          flatten: true,
          cwd: "v1",
          src: ["**/*.coffee"],
          dest: 'v0_out',
          ext: ".js"
      }
  },
  uglify: {
      ugly: {
        options: {
          screwIE8: true,
          sourceMap: true,
          sourceMapIncludeSources: true,
              //sourceMapIn: 'dist/*.js.map', // input sourcemap from a previous compilation
          },
          files: {
              'dist/main.js': ['v2_out/*.js'],
          },
      },
  }
});
    //grunt.registerTask('v2', ['coffee:v2', 'screeps']);
    grunt.registerTask('v3', ['ts:v3', 'screeps:staging']);
    grunt.registerTask('v3-prod', ['ts:v3', 'screeps:prod-v3']);
    grunt.registerTask('v2-prod', ['coffee:v2', 'screeps:prod-v2']);
    grunt.registerTask('prod', ['v3-prod']);
    grunt.registerTask('default', ['v3']);

}
