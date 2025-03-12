let cp = require('child_process')
let schedule = require('node-schedule')
let fs = require('fs')
module.exports = async function (app, models, $, db, nm) {
    let DB = {
        dbs:{},
        async get(id){
            if(!this.dbs[id]) {
                let datasource = await models.datasource.findSync({ id,status:1 })
                if(datasource.errorMsg) return
                datasource.database = datasource.dbn
                this.dbs[id] = nm.DB(datasource)
            }
            return this.dbs[id]
        },
        async eval(id,sql,args){
            let _db = await this.get(id)
            args = args || {}
            let cacheKey = typeof args.cache == 'string' ? args.cache : $.MD5(sql)
            if(args.cache && nm.redis && nm.redis.cache){
                try{
                    return JSON.parse(await nm.redis.cache.get(cacheKey))
                }catch(e){}
            }
            let ret = _db ? await _db._evalSync(sql,args) : { errorMsg:`datasource err` }
            if(!ret.errorMsg && args.cache && nm.redis && nm.redis.cache){
                await nm.redis.cache.set(cacheKey,JSON.stringify(ret));
                await nm.redis.cache.expire(cacheKey,(args.cacheTime || 60 * 60 * 24 * 30));
            }
            return ret
        }
    }
    //测试数据源
    app.post('/v1/datasource/test',async function(req,res){
        //超级管理员才能访问
        if(req.session.userName != 'admin'){
            res.send({errorMsg:'无权限'})
            return
        }
        res.send(req.body.id ? await DB.eval(req.body.id,req.body.content || `SHOW TABLES;`) : { errorMsg:'参数错误' })
    })
    //调用数据集
    app.get('/v1/dataset',async function(req,res){
        let query = req.query
        if(!query.id){
            res.send({ errorMsg:'参数错误' })
            return
        }
        let dataset = await models.dataset.findSync({ id:query.id,status:1 })
        if(dataset.errorMsg){
            res.send(dataset)
            return
        }
        for(let key in query) {
            dataset.content = dataset.content.replace('${' + key + '}',query[key])
            dataset.content = dataset.content.replace(new RegExp('#' + key,'g'),query[key])
        }
        dataset.content = await EvalString(dataset.content)
        if(query.pageNum || query.pageSize){
            pageing = true
            let pageNum = query.pageNum || 1,pageSize = query.pageSize || 10
            let content = dataset.content.replace(/;$/,'')
            let total = content.replace(/\n/g,' ').replace(/^select [^from]+ from/im,'select count(*) as total from')
            total = await DB.eval(dataset.datasourceId,total)
            let rows = `${ content } LIMIT ${ pageSize } OFFSET ${ pageSize * (pageNum - 1) }`
            rows = await DB.eval(dataset.datasourceId,rows)
            res.send({
                total:total[0].total,
                rows
            })
        }else{
            res.send(await DB.eval(dataset.datasourceId,dataset.content))
        }
    })

    //解析字符串 自带参数:${currentday}(当前日)、${yesterday}(昨日)、${currentmonth}(当前月)、${lastmonth}(前月)、${currentyear}(当年)、${lastyear}(去年)
    async function EvalString(string,pFunction){
        // if(!pFunction) return string
        try{
            string = string.replace(/`([a-z,A-Z,0-9]+)`/g,'$1')
            let now = new Date()
            let currentday,yesterday = new Date(now),currentmonth,lastmonth = new Date(now),currentyear = now.getFullYear(),lastyear = now.getFullYear() - 1
            currentday = $.date().Format('yyyy-MM-dd')
            yesterday.setDate(now.getDate() - 1)
            yesterday = $.date(yesterday).Format('yyyy-MM-dd')
            currentmonth = $.date(now).Format('yyyy-MM')
            lastmonth.setDate(0)
            lastmonth.setMonth(lastmonth.getMonth() - 1)
            lastmonth = $.date(lastmonth).Format('yyyy-MM')
            // string = string.replace(/`/g,'\`')
            pFunction = `
                ${pFunction || ''}
                string = \`${string}\`
            `
            eval(pFunction)
            return string
        }catch(e){
            console.log(pFunction,string)
            throw (e)
        }
    }


    async function evalJob(id){
        let job = await models.job.findSync({ id },{
            join:{
                pjectId:{
                    type: 'LEFT',
                    name: 'pject',
                    key: 'id',//默认
                    projection: {
                        name: 'pjectName'
                    }
                }
            }
        })
        if(job.errorMsg) return job
        return new Promise(async next => {
            async function _next(msg){
                await models.log.insertSync({
                    level:msg.errorMsg ? 2 : 1,
                    type:`${job.pjectName}`,
                    desoptions: `${job.name}[${job.id}]-${job.type}-job`,
                    content:msg.errorMsg || msg.msg || ''
                })
                next(msg)
            }
            let cmd = job.content,filePath = ''
            let fileScript = job.file ? await EvalString(decodeURI(job.file),job.pFunction) : ''
            if(job.file && !fileScript){
                _next({ errorMsg:'执行失败,脚本构建出错' })
                return
            }
            if(job.type == 'datax') {
                try{
                    filePath = __dirname.replace('router','uploads/') + job.name + '_' + id + '.json'
                    fs.writeFileSync(filePath, fileScript)
                    cmd = Config.dataxCMD + filePath
                }catch(e){
                    _next({ errorMsg:'执行失败,配置解析出错',msg: e.message})
                    return
                }
            }else if(job.type == 'datay'){
                try{
                    console.log($.date().Format('yyyy-MM-dd hh:mm:ss'),'DataY任务:',fileScript)
                    let json = JSON.parse(fileScript)
                    let readers = await DB.eval(json.reader.sourceId,json.reader.querySql)
                    if(json.writer.preSql) await DB.eval(json.writer.sourceId,json.writer.preSql)
                    let errors = []
                    for(let i = 0; i < readers.length; i ++){
                        let cols = []
                        if(json.writer.column[0] == '*'){
                            for(let key in readers[i]) {
                                let value = readers[i][key]
                                let quotation = value && value.indexOf && value.indexOf('"') > -1 ? "'" : '"'
                                if(value != null) cols.push(`${ key }=${ quotation }${ value }${ quotation }`)
                            }
                        }else{
                            for(let j = 0; j < json.writer.column.length; j ++) {
                                let key = json.writer.column[j],value = readers[i][key]
                                let quotation = value && value.indexOf && value.indexOf('"') > -1 ? "'" : '"'
                                if(value != null) cols.push(`${ key }=${ quotation }${ value }${ quotation }`)
                            }
                        }
                        let ret = await DB.eval(json.writer.sourceId,`INSERT INTO ${ json.writer.table } SET ${ cols.join(',') };`)
                        if(ret.errorMsg) errors.push(ret.errorMsg)
                    }
                    _next({ msg:`执行完成,共:${ readers.length },失败:${ errors.length }` })
                    return
                }catch(e){
                    console.log(e)
                    _next({ errorMsg:'执行失败',msg: e.message})
                    return
                }
            }

            //执行代码
            if(job.type == 'code'){
                try{
                    eval(`async function evalFn(){
                        ${fileScript}
                    }`)
                    _next(await evalFn() || { msg:'执行成功' })
                }catch(e){
                    console.log(e)
                    _next({ errorMsg:'执行失败,脚本运行出错',msg: e.message})
                }
                return
            }
            if(job.type == 'command' && fileScript){
                filePath = './.cache.command.sh'
                cmd = `${ filePath } ${ process.pid }`
                fs.writeFileSync(filePath, fileScript)
                filePath = ''
            }
            //执行
            cp.exec(cmd,async (error, stdout, stderr)=>{
                console.log(stdout, stderr)
                if(filePath) fs.unlinkSync(filePath)
                _next(error ? { errorMsg:'执行失败',msg:stdout } : { msg:stdout })
            })
        })
    }
    //任务调用
    app.get('/v1/job/:id',async (req,res)=>{
        let id = req.params.id
        if(!id){
            res.send({ errorMsg:'参数错误' })
            return
        }
        res.send(await evalJob(id))
    })

    //任务管理
    let Task = {
        ids:{},
        async start(job){
            let rc = {}
            try{
                if(this.ids[job.id]) this.ids[job.id].cancel()
                this.ids[job.id] = schedule.scheduleJob(job.cron, async function(){
                    await evalJob(job.id)
                })
                console.log(`任务${job.name}-${job.id}启动完成`)
                return { msg:`任务${job.name}-${job.id}启动完成` }
            }catch(e){
                console.log(`任务${job.name}-${job.id}启动失败`, e)
                return { errorMsg:`任务${job.name}-${job.id}启动失败` }
            }
        },
        async stop(job){
            try{
                if(this.ids[job.id]) this.ids[job.id].cancel()
                console.log(`任务${job.name}-${job.id}停止完成`)
                return { msg:`任务${job.name}-${job.id}停止完成` }
            }catch(e){
                console.log(`任务${job.name}-${job.id}停止失败`, e)
                return { errorMsg:`任务${job.name}-${job.id}停止失败` }
            }
        }
    }
    async function getDataViewRouter(req,res,next){
        let query = req.query
        if(!query.id){
            res.send(`参数错误`)
            return
        }
        let dataview = await models.dataview.findSync({ id:query.id,status:1 })
        if(dataview.errorMsg) {
            res.send(dataview)
            return
        }
        let dataset
        if(dataview.datasourceId && dataview.content && !dataview.datasetId){
            dataset = {
                datasourceId:dataview.datasourceId,
                content:dataview.content
            }
        }else{
            dataset = await models.dataset.findSync({ id:dataview.datasetId,status:1 })
            if(dataset.errorMsg){
                res.send(dataset)
                return
            }
        }
        for(let key in query) {
            dataset.content = dataset.content.replace('${' + key + '}',query[key])
            dataset.content = dataset.content.replace(new RegExp('#' + key,'g'),query[key])
        }
        // dataset.content = await EvalString(dataset.content)
        req.dataview = {
            name:dataview.name,
            option:dataview.deploy,
            dataset:await DB.eval(dataset.datasourceId,dataset.content)
        }
        next()
    }
    //option配置
    app.get('/v1/dataview',getDataViewRouter,async (req,res) => {
        let option
        let data = req.dataview.dataset
        function getData(valueKey,nameKey){
            let rc = []
            for(let i = 0; i < data.length; i ++){
                let value = data[i][valueKey]
                rc.push(nameKey ? { value, name:data[i][nameKey] } : value)
            }
            return rc
        }
        eval(`${req.dataview.option}`)
        res.send(option)
    })

    //视图
    app.get('/dataview',(req,res,next) => {
        let token = req.query.token
        req.headers.token = token
        next()
    },nm.loginRouter, getDataViewRouter,async (req,res)=>{
        res.send(`
        <!DOCTYPE html>
        <html lang="zh-cmn-Hans">
        <head>
          <meta charset="UTF-8">
          <meta content="yes" name="apple-mobile-web-app-capable">
          <meta content="yes" name="apple-touch-fullscreen">
          <meta name="App-Config" content="fullscreen=yes,useHistoryState=yes,transition=yes">
          <meta name="apple-mobile-web-app-status-bar-style" content="black">
          <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0;">
          <meta name="theme-color" content="#fff">
          <title>${req.dataview.name}</title>
          <style type="text/css">
            html,body{
              margin: 0;
              padding: 0;
              height: 100%;
              width: 100%;
            }
          </style>
            <script src="js/echarts.min.js"></script>
        </head>
        <body>
          <div id="main" style="width: 100%;height:100%;"></div>
          <script>
            let data = ${JSON.stringify(req.dataview.dataset)}
            function getData(valueKey,nameKey){
              let rc = []
              for(let i = 0; i < data.length; i ++){
                let value = data[i][valueKey]
                rc.push(nameKey ? { value, name:data[i][nameKey] } : value)
              }
              return rc
            }
            let mainDom = document.getElementById('main')
            if(!data.length){
                mainDom.innerHTML = '<div style="height:100%;display:flex;justify-content:center;align-items:center;color:#ccc;">${req.dataview.nullTips || '暂无数据～'}</div>'
            }else{
                var myChart = echarts.init(mainDom,'')
                let option
                ${req.dataview.option}
                myChart.setOption(option);
            }
          </script>
        </body>
        </html>`)
    })

    //启动/停止任务
    app.put('/v1/job/toggle',async (req,res)=>{
        let job = req.body,status = job.status
        if(!job.name) job = await models.job.findSync({ id:job.id })
        job.status = status
        await models.job.updateSync({ id:job.id },{ status })
        res.send(job.status ? await Task.start(job) : Task.stop(job))
    })
    //初始化执行定时任务
    let jobs = await models.job.listSync({})
    for(let i = 0; i < jobs.length; i ++){
        if(!jobs[i].status) continue
        await Task.start(jobs[i])
    }
    return {
        DB,
        evalJob
    }
}