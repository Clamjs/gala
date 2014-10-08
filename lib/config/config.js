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
    "charset": 'UTF-8',
    "supports": {
      ".html": 'juicer',
      ".htm": 'juicer',
      ".do": 'juicer',
      ".json": 'mock'
    }
  },
  "assets": {
    "rootdir": "src",
    "combo": {

    },
    "charset": 'UTF-8',
    "supports": {
      ".less.css": "less",
      ".sass.css": "sass",
      ".tpl.js": "juicer"
    },
    "package": {
      "define": "KISSY.add",
      "anonymous": true
    }
  },
  "model":{
    "rootdir":"model"
  },
  "controller": {
    "rootdir": "controller"
  }
};