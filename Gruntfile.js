var grunt = require('grunt');

grunt.loadNpmTasks('grunt-crx');

grunt.initConfig({
  manifest: require('./src/manifest.json'),

  crx: {
    public: {
      src: "src/**/*",
      dest: "dist/mradio-browser-ext-<%= manifest.version %>.zip",
    }
  }
});
