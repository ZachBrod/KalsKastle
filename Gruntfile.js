module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-concat');


  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      build: {
        src: [
        'resources/scripts/globals.js',
        'resources/scripts/tiles.js',
        'resources/scripts/actors.js'],
        dest: 'build/scripts.js',
      },
    },
    uglify: {
      build: {
        src: 'build/scripts.js',
        dest: 'build/scripts.min.js'
      }
    }
  });

  // Load the plugins for tasks.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');


  // Default task(s).
  grunt.registerTask('default', ['concat', 'uglify', 'watch']);

};