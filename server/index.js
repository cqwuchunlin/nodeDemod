var fs = require('fs');
var files = fs.readdirSync('./server');
let nm = require('../source');
let utils = {};
for(var i = 0; i < files.length; i ++) {
    let name = files[i].split('.')[0];
    if(name != 'index' && /\.js$/.test(files[i])) utils[name] = require('./' + files[i])(nm.app,nm.models(),nm.$,nm.db,nm);
}
module.exports = utils
