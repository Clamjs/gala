var util = require('mace');
var Path = require('path');
var Onion = require('tiny-onion');
var HTTP = require('http');

var debug = util.debug('Gala');
var Context = require('./Context.js');
var UnderPath = require('under-path');
var Gala = Onion.extend({
  name: "Gala",
  eventable: true,
  options: require('./config.js'),
  use: function (method, path, handle) {
    var args = arguments;
    var argl = args.length;
    if (argl === 2) {
      handle = path;
      path = method;
      method = '*';
      if (!!~Gala.supports.indexOf(path)) {
        method = path;
        path = '*';
      }
      return this.use(method, path, handle);
    }
    if (argl === 1) {
      handle = method;
      method = path = '*';
      return this.use(method, path, handle);
    }
    if (!util.isFunction(handle)) {
      util.error('Handle must be an function !');
      process.emit('exit', 0);
      return false;
    }
    var self = this;
    method = method.toUpperCase();
    path = path === '*' ? /.*/ : new RegExp(path);

    this.super_.use.call(this, function (req, res, next) {
      var context = this;
      if (
        method === '*' || 
        method === context.method
      ) {
        if (path.test(context.url)) {
          return handle.apply(context, arguments);
        }
      }
      next();
    });
    return this;
  },
  handle: function () {
    var self = this;
    var fn = this.super_.handle.apply(this, arguments);
    return function (req, res) {
      var context = new Context(req, res, self);
      try {
        fn.call(context, req, res);
      } catch(e) {
        context.status = 500;
        context.error(e);
      }
    };
  },
  listen: function (port, hostname, backlog, callback) {
    var self = this;
    var server = self.server = HTTP.createServer();
    server.on('request', this.handle());
    server.on('clientError', function (e) {
      util.error(e);
    });
    if (!process.connected) {
      try {
        debug('Server run at http://%s:%s', hostname || '127.0.0.1', port || 80);
        server.listen.call(server, port, hostname, backlog, callback);
      } catch(e) {
        if (/EADDRINUSE/.test(e.message)) {
          util.error('\x1B[31mError: \n\r\tPort has been used for another local server.\n\r\tPlease stop it and try again.\x1B[39m');
          process.exit(0);
        } else {
          throw e;
        }
      }
    } else {
      debug('Server is under cluster.');
      process.on('message', function (msg, socket) {
        process.nextTick(function tickHandle () {
          if ('SOCKET' === msg) {
            socket.readable = socket.writable = true;
            socket.resume();
            server.connections++;
            socket.server = server;
            server.emit("connection", socket);
            socket.emit("connect");
            return;
          } else {
            self.emit('message', msg);
          }
        });
      });
    }
    return self;
  },
  close: function () {
    try{
      this.server.close();
      debug('Server close succeed');
    } catch(e) {
      debug(e);
    }
  }
}, {
  Context: Context
});
module.exports = Gala;