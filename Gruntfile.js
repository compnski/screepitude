module.exports = function(grunt) {
 
    grunt.loadNpmTasks('grunt-contrib-coffee');
    grunt.loadNpmTasks('grunt-screeps');

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
                src: ['dist/*.js']
            }
        },
        "coffee": {
            "coffee_to_js": {
                "options": {
                  bare: true,
                  sourceMap: true
                },
                expand: true,
                flatten: true,
                cwd: "src",
                src: ["**/*.coffee"],
                dest: 'dist',
                ext: ".js"
            }
        }
    });
    grunt.registerTask('default', ['coffee']);
}
