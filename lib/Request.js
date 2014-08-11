var debug = require('debug')('Gala:Request');
var util = require('tiny-onion').Util;
var url = require('url');
var EventEmitter = require('events').EventEmitter;

var Cookies = require('cookie');
var QS = require('querystring');
var Negotiator = require('negotiator');

function Request (options) {
  this.options = options;
}
util.Klass(Request, {
  field: function (field) {
    var headers = this.headers;
    var field = field.toLowerCase();
    if (headers) {
      switch (field) {
        case 'referer':
        case 'referrer':
          return headers.referrer ||headers.referer;
        default:
          return headers[field];
      }
    }
  },
  accept: function () {
    if (this.negotiator)
      this.negotiator.mediaType.apply(this.negotiator, arguments);
  },
  // for checking mediaTypes
  accepts: function () {
    if (this.negotiator)
      this.negotiator.mediaTypes.apply(this.negotiator, arguments);
  },
  charset: function () {
    if (this.negotiator)
      return this.negotiator.charset.apply(this.negotiator, arguments);
  },
  // for checking charsets;
  charsets: function () {
    if (this.negotiator)
      return this.negotiator.charsets.apply(this.negotiator, arguments);
  },
  language: function () {
    if (this.negotiator)
      return this.negotiator.language.apply(this.negotiator, arguments);
  },
  languages: function () {
    if (this.negotiator) 
      return this.negotiator.languages.apply(this.negotiator, arguments);
  },
  encoding: function () {
    if (this.negotiator) 
      return this.negotiator.encoding.apply(this.negotiator, arguments);
  },
  encodings: function () {
    if (this.negotiator) 
      return this.negotiator.encodings.apply(this.negotiator, arguments);
  },
}, EventEmitter);

Object.defineProperties(Request.prototype, util.map({
  negotiator: function () {
    if (this._negotiator)
      return this._negotiator;
    if (this.req)
      return this._negotiator = new Negotiator(this.req)
  },
  socket: function () {
    if (this.req)
      return this.socket
  },
  remoteIp: function () {
    if (this.socket)
      return this.socket.remoteAddress
  },
  localIp: function () {
    if (this.socket)
      return this.socket.localAddress;
  },
  headers: function () {
    if (this.req)
      return this.req.headers;
  },
  cookies: function () {
    if (this._cookies)
      return this._cookies;
    if (this.headers)
      return this._cookies = Cookies.parse(this.headers.cookie);
  },
  method: function () {
    if (this.req)
      return this.req.method
  },
  urlinfo: function () {
    if (this._urlinfo)
      return this._urlinfo
    if (this.req) {
      var urlinfo = url.parse(this.req.url, true);
      var host = (urlinfo.host = urlinfo.host || 
          this.headers.host || 
          '127.0.0.1:80'
        ).split(':');
      // no host info must be in localhost
      urlinfo.hostname = host[0];
      urlinfo.port = +host[1] || 80;
      urlinfo.query = QS.parse(urlinfo.search.slice(1));
      // this.headers.host
      return this._urlinfo = urlinfo;
    }
  },
  path: function () {
    if (this.urlinfo)
      return this.urlinfo.pathname
  },
  query: function () {
    if (this.urlinfo)
      return this.urlinfo.query
  },
  search: function () {
    if (this.urlinfo)
      return this.urlinfo.search
  },
  host: function () {
    if (this.urlinfo)
      return this.urlinfo.host;
  },
  hostname: function () {
    if (this.urlinfo)
      return this.urlinfo.hostname;
  },
  port: function () {
    if (this.urlinfo)
      return this.urlinfo.port;
  },
  protocol: function () {
    if (this.urlinfo)
      return this.urlinfo.protocol;
  }
}, function (val,name) {
  return {
    enumerable: false,
    configurable: false,
    get: val
  };
}));


exports = module.exports = Request;