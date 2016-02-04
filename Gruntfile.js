module.exports = function(grunt) {
 
    grunt.loadNpmTasks('grunt-contrib-coffee');
    grunt.loadNpmTasks('grunt-screeps');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.initConfig({
        "pkg": grunt.file.readJSON('package.json'),
        "secret": grunt.file.readJSON('secret.json'),
        "screeps": {
            "options": {
                email: '<%= secret.email %>',
                password: '<%= secret.password %>',
                branch: 'default',
                ptr: false
            },
            dist: {
                src: ['v2_out/*.js']
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
            "v0": {
                "options": {
                  bare: true,
                  sourceMap: true
                },
                expand: true,
                flatten: true,
                cwd: "src",
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
    grunt.registerTask('default', ['coffee:v2', 'screeps']);
}
