module.exports = {
  rootdir: process.cwd(),
  "jsonp": 'jsonp',
  "filters": {
    '\\?.+': '',
    '(\\w+)[^\\-\\.]min\\.(js|css)$' : '$1.$2',
    "\\/\\d+\\.\\d+\\.\\d+\\/": "/"
  },
  "paths": {
    "^\\/mock\\/(.*)": {
      "type": "local",
      "local": "/mock/json/$1",
      "remote": "http://mock.clamjs.com/$1"
    }
  },
  "hosts": {
    "a.tbcdn.cn": "122.225.67.241",
    "g.tbcdn.cn": "180.149.155.120",
    "g.assets.daily.taobao.net": "10.235.136.37"
  },
  "view": {
    "rootdir": "src",
    "index":"index.html"
    "charset": "utf-8"
  },
  "assets": {
    "rootdir": "src",
    "charset":"utf-8"
  },
  "controller": {
    "rootdir": "controller"
  }
};