const fs = require('fs')
const { spawn } = require('child_process')
process.env.NODE_ENV = process.argv[2].replace('-','')
let configPath = './config.' + process.env.NODE_ENV + '.js'
let config = require(fs.existsSync(configPath) ? configPath : './config.js');
let templates = config.templates || []
for(let i = 0; i < templates.length; i ++){
    let file = fs.readFileSync(templates[i].path,'utf-8')
    for(let key in templates[i]){
        file = file.replace(new RegExp('#' + key,'gmi'),templates[i][key])
    }
    fs.writeFileSync(templates[i].path.replace('.template',''), file)
    if(templates[i].cmd) {
        // 创建子进程
        const child = spawn(templates[i].cmd, {
            stdio: 'inherit',
            cwd:templates[i].cwd
        })
        
        child.on('error', (error) => {
            console.error(`Error: ${error.message}`);
        })
        
        child.on('close', (code) => {
            console.log(`子进程退出码：${code}`);
        })
    }
}