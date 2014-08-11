var debug = require('debug')('app:response');
var util = require('tiny-onion').Util;
var EventEmitter = require('events').EventEmitter;
var Cookie = require('cookie');
var http = require('http');
var mime = require('mime');
var path = require('path');
var fs = require('fs');
var url = require('url');
var jschardet = require("jschardet");
var isUtf8  = require('is-utf8');

function Response(options) {
    this.options = util.mix({
        charset: 'utf-8',
        encoding: 'gzip',
        language: 'zh-CN',
        jsonp: 'jsonp'
    }, options);
    this.status = 404;
    this.charset = options.charset;
    this.language = options.language;
    this.encoding = options.encoding;
    this.type = 'plain/text';
    this.body = 'Error 404';
    Object.defineProperties(this, {
        '_headers': {
            enumerable: false,
            configurable: false,
            value: {
                'Vary': 'Accept-Encoding',
                'Connection': 'keep-alive',
                'Transfer-Encoding': 'chunked',
                'Server': 'Clam'
            },
            writable: true
        },
        '_cookies': {
            enumerable: false,
            configurable: false,
            value: {},
            writable: true
        }
    });
}

util.Klass(Response, {
    error: function (msg, status) {
        if (util.isNumber(msg)) {
            var tmp = msg;
            msg = status || http.STATUS_CODES[tmp];
            status = tmp;
        }
        var err = msg instanceof Error ? msg : new Error(msg);
        err.status = status || err.status || 500;
        err.expose = err.status < 500;
        this.status = err.status;
        var res = this.res;
        res.writeHeader(err.status, {
            'Content-Type': 'text/html; charset=utf-8'
        });
        res.end('<h3> Error ' + err.status + '</h3><ul><li>' + err.stack.split(/\n\r?/).join('</li><li>') + '</li></ul>');
    },
    redirect: function (address, alt) {
        if (address === 'back') {
            address = this.ctx.field('referer') || alt || '/';
        }
        this.res.writeHeaders(302, {
            'Location': address
        });
    },
    pipe: function (file) {
        var res  = this.res;
        file = url.parse(file).pathname;
        if (fs.existsSync(file)) {
            var MIME = mime.lookup(file),
                STAT = fs.statSync(file);

            this._headers = util.mix(this._headers, {
                'Content-Length': STAT.size,
                'Content-Type': MIME
            });
            if (MIME.match(/javascript|text|json/)) {
                var content = fs.readFileSync(file), charset = "utf-8";
                if (!isUtf8(content)) {
                    charset = jschardet.detect(content).encoding;
                }
                this._headers['Content-Type'] += "; charset="+charset;
            }
            res.writeHead(200, this._headers);

            var stream = fs.createReadStream(file);
            stream.on('error', this.error.bind(this));
            stream.on('data', function (data) {
                res.write(data);
            });
            stream.on('end', function () {
                res.end();
            });
        }
        else {
            this.error(file+" Not Found!", 404);
        }
    },
    html: function(content) {
        var res = this.res;
        var opts = this.options;
        try {
            res.writeHead(200, util.mix(this._headers, {
                'Content-Type': 'text/html; charset=' + (opts.charset || 'utf-8')
            }));
            res.end(content);
        } catch (e) {
            return this.error(e);
        }
    },
    json: function (scope) {
        var res = this.res;
        var opts = this.options;
        try {
            scope = JSON.stringify(scope || {});
            res.writeHead(200, util.mix(this._headers, {
                'Content-Type': 'application/json; charset=' + (opts.charset || 'utf-8')
            }));
            res.end(scope);
        } catch (e) {
            return this.error(e);
        }
    },
    jsonp: function (scope) {
        var res = this.res;
        var opts = this.options;
        var jsonp = this.ctx.query[opts.jsonp];
        if (!jsonp || !/^[a-z\_\$]{1,}[a-z0-9\_\$]+$/i.test(jsonp)) {
            return this.error('JSONP Error: jsonp callback is invalid!');
        }
        res.writeHead(200, util.mix(this._headers, {
            'Content-Type': 'application/json; charset=' + (opts.charset || 'utf-8')
        }));
        res.end(jsonp + '(' + JSON.stringify(scope) + ')');
    },
    header: function (key, value) {
        if (!key && !value) {
            this.serializeHeaders(this.options.maxAge);
            return this._headers;
        }
        if (undefined === value)
            return this._headers[key]
        this._headers[key] = value;
        if (null === value)
            delete this._headers[key];
        return this;
    },
    cookie: function (key, val, opts) {
        // Content-Disposition
        if (!key && !val)
            return this._cookies;
        if (undefined === val)
            return this._cookies[key]
        opts = opts || {};
        opts.value = val;
        this._cookies[key] = opts;
        if (null === val)
            delete this._cookies[key];
        return this;
    },
    serializeHeaders: function (maxAge) {
        // 整理cookies
        this.serializeCookies();
        if (maxAge) {
            this.header('Cache-Control', 'max-age=' + (maxAge || 3600) + ', must-revalidate');
        } else {
            this.header('Cache-Control', 'private, no-cache, no-store, max-age=0');
        }
    },
    serializeCookies: function () {
        var cookies = '';
        util.each(this.cookie(), function (opts, name) {
            cookies += Cookie.serialize(name, opts.value, opts);
        });
        cookies && this.header('Set-Cookie', cookies);
    }
}, EventEmitter);

exports = module.exports = Response;