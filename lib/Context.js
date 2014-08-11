var debug = require('debug')('Gala:Context');
var EventEmitter = require('events').EventEmitter;
var http = require('http');
var util = require('tiny-onion').Util;
var path = require('path');

var Request = require('./Request.js');
var Response = require('./Response.js');

function Context (req, res, app) {
  var context = this;
  var options = context.options = app.options;
  var request = context.request = new Request(options);
  var response = context.response = new Response(options);
  context.app = request.app = response.app = app;
  context.req = request.req = response.req = req;
  context.res = request.res = response.res = res;
  request.ctx = response.ctx = context;
  request.response = response;
  response.request = request;

  context.originalUrl = request.originalUrl = req.url;
  return context;
}
util.inherits(Context, EventEmitter);

var props = Context.prototype;
props.module = function (file) {
  var options = this.options;
  var rootdir = options.rootdir;
  var filepath = path.join(rootdir, file);
  return util.arequire(filepath);
};

'header error cookie redirect pipe html json jsonp'.split(' ').forEach(function (name) {
  Object.defineProperty(props, name, {
    enumerable: true,
    configurable: false,
    writable: false,
    value: function () {
      return this.response[name].apply(this.response, arguments);
    }
  });
});
// mostly attributes of the request object can be getted;
'remoteIp localIp cookies headers method path query search host hostname port protocol'.split(' ').forEach(function (name) {
  Object.defineProperty(props, name, {
    enumerable: true,
    configurable: false,
    get: function () {
      return this.request[name];
    }
  });
});
// also some method can be used directly;
'accepts field charsets languages encodings'.split(' ').forEach(function (name) {
  Object.defineProperty(props, name, {
    enumerable: true,
    configurable: false,
    writable: false,
    value: function () {
      this.request[name].apply(this.request, arguments);
    }
  });
});

//
exports = module.exports = Context;
exports.Request = Request;
exports.Response = Response;
