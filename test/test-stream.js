var fs = require('fs');
var stream = fs.createReadStream(__dirname + '/test.js');
'open error data end readable'.split(' ').forEach(function (name) {
  stream.on(name, function (e) {
    console.log(name, e);
  });
});