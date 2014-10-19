var http = require('http');
var Onion = require('../../tiny-onion/');

var App = require('../');

var Btest = Onion.extend({
  name: "Btest",
  handle: function () {
    var self = this;
    return self.super_.handle.call(self);
  }
});

var atest = new Onion().use(function (req, res, next) {
  console.log('atest 1 -init');
  return next();
}).use(function (req, res, next) {
  console.log('atest 2 -next');
  return next();
});

var btest = new Btest().use(function (req, res, next) {
  console.log('btest 1 --init');
  this.pipe('./index.html');
  // return 'BREAK'
  // next();
}).use(function (req, res, next) {
  console.log('btest 2 --failed');
  // this.header('Content-Type', 'text/html');
  // this.header('Content-Encoding', 'gzip');
  var res = this.res;
  // console.log(this.header())
  // res.writeHead(200, this.header());
  // res.write('abc');
  // res.end();
  // console.log(this.header())
  this.pipe('./test/test-stream.js')
  next();
  // this.jsonp({
  //   test:'btest'
  // });
});

var app = new App({
  rootdir: './',
  jsonp: 'acbk'
});
app.use(atest.handle()).use(btest.handle()).listen(8888);
