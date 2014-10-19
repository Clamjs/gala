var util = require('mace');
var Path = require('path');
var Onion = require('tiny-onion');
var EventEmitter = require('events').EventEmitter;
var Fs = require('fs');
var Url = require('url');
var Cookies = require('cookie');
var QS = require('querystring');
var Negotiator = require('negotiator');
var Multiparty = require('multiparty');
var Mime = require('mime');
var debug = util.debug('Gala:Context');


function Context (req, res, app) {
  this.req = req;
  this.res = res;
  this.app = app;
  this.status = 404;

  var options = this.options = app.options;
  this.DEBUG = !!options.debug;
  this.local = req.socket.localAddress;
  this.remote = req.socket.remoteAddress;

  this.rootdir = options.rootdir;
  this.url = req.url;
  this._resScope = {
    cookies: {},
    headers: {
      'Server': 'Gala',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Transfer-Encoding':'chunked',
      'Vary':'Accept-Encoding'
    },
    data: {}
  };
  this.cookies = Cookies.parse(req.headers.cookie || '');
  this.headers = req.headers;
  this.form = new Multiparty.Form(options.form).parse(req);
  this.method = req.method;
  this.negotiator = new Negotiator(req);

  var urlinfo = Url.parse(req.url, true);
  var host = urlinfo.host || req.headers.host;
  host = host.split(':');
  urlinfo.hostname = host[0];
  urlinfo.port = +host[1] || 80;
  urlinfo.params = QS.parse(urlinfo.search.slice(1));
  urlinfo.pathname = urlinfo.pathname;
  urlinfo.search = urlinfo.search;
  urlinfo.protocol = urlinfo.protocol;

  this.urlinfo = urlinfo;
  this.params = urlinfo.params;
  var jsonp = urlinfo.params[options.jsonp];
  if (!jsonp || !/^[a-z\_\$][a-z0-9\_\$]+$/i.test(jsonp)) {
    this.isJSONP = false;
  } else {
    this.isJSONP = jsonp;
  }
}

util.inherits(Context, {
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
  assign: function (k, v) {
    var scope = this._resScope.data;
    if (null == v) {
      if (null == k) {
        return scope;
      }
      if (util.isObject(k)) {
        util.merge(scope, k);
        return this;
      }
      return scope[k];
    }
    scope[k] = v;
    return this;
  },
  cookie: function (key, val, opts) {
    var cookies = this._resScope.cookies;
    // Content-Disposition
    if (!key && !val)
      return cookies;
    if (undefined === val)
      return cookies[key]
    opts = opts || {};
    opts.value = val;
    cookies[key] = opts;
    if (null === val)
      delete cookies[key];
    return this;
  },
  header: function (key, value) {
    var headers = this._resScope.headers;
    if (null == value) {
      if (null == key) {
        return headers;
      }
      if (util.isObject(key)) {
        util.merge(headers, key);
        return this;
      }
      return headers[key];
    }
    headers[key] = value;
    return this;
  },
  setHeaders: function (maxAge) {
    var options = this.options;
    maxAge = maxAge || options.maxAge;
    if (maxAge && +maxAge) {
      maxAge = 3600;
      this.header('Cache-Control', 'max-age=' + maxAge + ', must-revalidate');
    } else {
      this.header('Cache-Control', 'private, no-cache, no-store, max-age=0');
    }
    var cookies = '';
    util.each(this.cookie(), function (opts, name) {
        cookies += Cookie.serialize(name, opts.value, opts);
    });
    cookies && this.header('Set-Cookie', cookies);
    this.res.writeHead(this.status, this.header());
  },
  error: function (msg) {
    var err = msg instanceof Error ? msg : new Error(msg);
    var status = this.status || err.status || 500;
    var res = this.res;
    var options = this.options;
    res.writeHeader(status, {
        'Content-Type': 'text/html; charset=utf-8'
    });
    var content = Fs.readFileSync(Path.join(__dirname, './www/error.html')).toString();
    res.write(this.engine('juicer').render(content, {
      __STATUS: status,
      __DEBUG: this.DEBUG,
      message: err.message,
      stack: err.stack.split(/\n\r?/)
    }));
    res.end();
  },
  redirect: function (address) {
    if (address === 'back') {
      address = this.field('referer') || '/';
    }
    this.res.writeHeaders(302, {
      'Location': address
    });
  },
  pipe: function (file, charset, type) {
    if ((charset || '')[0] === '.') {
      var _tmp = type;
      type = charset;
      charset = _tmp;
    }
    this.status = 200;
    var assetsRoot = util.underPath(this.rootdir, this.options.assets.rootdir);
    file = util.underPath(assetsRoot, file || Url.parse(this.url).pathname);
    try {
      var options = this.options;
      debug('Get file path %s ', file);
      var STAT = Fs.statSync(file);
      this.header('Content-Length', STAT.size);
      this.header('Content-Type', Mime.lookup(type || file) + charset);
      this.setHeaders();
      this.res.end(Fs.readFileSync(file));
    } catch(e) {
      this.status = 404;
      this.error(e);
    }
  },
  // for default render 
  render: function (file, charset) {
    this.status = 200;
    var res = this.res;
    var options = this.options;
    var viewRoot = util.underPath(this.rootdir, options.view.rootdir);
    var tplFile = util.underPath(viewRoot, file || this.urlinfo.pathname);
    charset = charset || this.options.view.charset;
    try {
      var scope = util.merge({
        __STATUS: this.status,
        __PARAMS: this.params,
        __URI: this.urlinfo,
        __DEBUG: this.DEBUG
      }, this.assign());
      var options = this.options;
      var content = this.engine('juicer').render(Fs.readFileSync(tplFile).toString(), scope);
      this.header('Content-Type', Mime.lookup(file) + '; charset=' + (charset || options.view.charset || 'UTF-8'));
      this.setHeaders();
      this.res.end(content);
    } catch(e) {
      this.status = 500;
      this.error(e);
    }
  },
  send: function (charset) {
    this.status = 200;
    try {
      var data = JSON.stringify(this.assign());
      var jsonp = this.isJSONP;
      var charset = charset || this.options.assets.charset;
      if (jsonp) {
        data = jsonp + '('+data+')';
        this.header('Content-Type', Mime.lookup('.js') + '; charset=' + charset);
      } else {   
        this.header('Content-Type', Mime.lookup('.json') + '; charset=' + charset);
      }
      this.setHeaders();
      this.res.end(data);
    } catch (e) {
      this.status = 500;
      this.error(e);
    }
  },
  engine: function (name, val) {
    return Context.engine.call(Context, name, val);
  }
}, EventEmitter);
Context.engine = function (name, val) {
  if (!val) {
    if (!name) {
      return Context.engine;
    }
    if (util.isObject(name)) {
      util.merge(Context.engine, name);
      return Context;
    }
    return Context.engine[name];
  }
  Context.engine[name] = val();
  return Context;
};
Context.engine('juicer', function () {
  return {
    render: require('./engine/juicer.js')
  };
});
module.exports = Context;