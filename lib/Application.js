var Onion = require('tiny-onion').Onion;
var util = require('tiny-onion').Util;
var http = require('http');
var debug = require('debug')('Gala');
var Context = require('./Context.js');
var Request = Context.Request;
var Response = Context.Response;
var Gala = Onion.extend({
  name: "Gala",
  eventable: true,
  handle: function () {
    var self = this;
    var fn = self.super_.handle.apply(self, arguments);
    var standard = self.options.standard;
    return function (req, res) {
      var app = new Context(req, res, self);
      var args = standard === 'connect' ? [req, res] : [];
      try {
        if (fn.apply(app, args) === Onion.OUT_OF_RANGE) {
          app.error('File ' + app.path + ' not found',404);
        }
      } catch ( e ) {
        e.status = 500;
        app.error(e);
      }
    };
  },
  listen: function () {
    var self = this;
    var options = self.options;
    var server = self.server = options.server || http.createServer();
    server.on('request', self.handle());
    server.on('error', function (e) {
      console.log(e);
    });
    if (!process.connected) {
      try {
        server.listen.apply(server, arguments);
      } catch(e) {
        if (/EADDRINUSE/.test(e.message)) {
          console.log('\x1B[31mError: \n\r\tPort has been used for another local server.\n\r\tPlease stop it and try again.\x1B[39m');
          process.exit(0);
        } else {
          throw e;
        }
      }
    } else {
      debug('%s is under cluster.', this.options.name);
    }
    return self;
  }
}, {
  Context: Context,
  Request: Request,
  Response: Response
});

exports = module.exports = Gala;