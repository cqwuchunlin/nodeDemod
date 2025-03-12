var fs = require('fs');
var files = fs.readdirSync('./router');
module.exports = function(nm){
    if(Config.authRouter) nm.app.use(Config.authRouter,nm.loginRouter);
    for(var i = 0; i < files.length; i ++) if(files[i] != 'index.js' && /\.js$/.test(files[i])) require('./' + files[i])(nm.app,nm.models(),nm.$,nm.db,nm)
}
