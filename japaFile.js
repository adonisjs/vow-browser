const { configure } = require('japa')
configure({
  files: ['test/**/*.spec.js'],
  timeout: 10000
})
