var J = module.exports = require('juicer');
J.register('json_stringify', JSON.stringify);
J.register('timestamp', Date.now);
J.register('format_date', function (date, format) {
  date = new Date(+date);
  if (!date) {
    return '';
  }
  formatStr = formatStr || 'hh:mm:ss';
  var y = date.getFullYear();
  var M = date.getMonth() + 1;
  var d = date.getDate();
  var h = date.getHours();
  var m = date.getMinutes();
  var s = date.getSeconds();
  var u = date.getMilliseconds();
  formatStr = formatStr.replace('yy', y).replace('y', util.pad(y, 2, '0', 0));
  util.each({
    M: M,
    d: d,
    h: h,
    m: m,
    s: s,
    u: u
  }, function (v,k) {
    formatStr = formatStr.replace(k + k, util.pad(v, 2, '0', 0));
    formatStr = formatStr.replace(k, v);
  });
  return formatStr;
});