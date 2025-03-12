
var fs = require('fs')
var files = fs.readdirSync('./entity')
var models = {},api = {},nickNames = {}
for(var i = 0; i < files.length; i ++) {
    if(/\.js$/.test(files[i]) && files[i] != 'index.js') {
        let entity = require('./' + files[i]),name = files[i].split('.')[0]
        if(entity.models){
            models[name] = entity.models
            if(entity.api) for(let key in entity.api) api[key] = entity.api[key]
            if(entity.nickName) nickNames[name] = entity.nickName
        }else{ 
            models[name] = entity
        }
    }
}
module.exports = { models,api,nickNames }
