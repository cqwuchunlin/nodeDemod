///excel相关接口
const ExcelJS = require('exceljs')
module.exports = function (app, models, $, db, nm) {
    //通用倒出接口
    app.get('/modelToExcel/:name',async function(req,res,next){
        let modelName = req.params.name
        let schemas = models[modelName].schemas
        req.columns = schemas
        let query = req.query
        args = query.sql || {}
        query.pageNum = null
        query.pageSize = null
        query.unitId = query.unitId == 'all' ? undefined : query.unitId
        query.createTime = query.createTime || { $gte:new Date().getTime() - 30 * 24 * 60 * 60 * 1000 }
        if(typeof args == 'string') args = $.string(args).parse({})
        if(query.join) {
            args.join = args.join || {}
            var joins = query.join.split(',');
            for (var i = 0; i < joins.length; i++) {
                args.join[joins[i] + 'Id'] = {
                    type: 'LEFT',
                    name: joins[i],
                    key:joins[i] == 'unit' ? 'unitId' : 'id',
                    projection: {
                        name: joins[i] + 'Name'
                    }
                }
            }
        }
        req.rows = await models[modelName].listSync(query,args)
        let filename = models[modelName].nickName || ''
        req.filename = filename + '_' + $.guid()
        next()
    },toExcelRouter)

    //导出excel
    async function toExcelRouter(req,res){
        nm.loginRouter({
            headers:{
                token: req.query.token,
                unitId: req.query.unitId
            }
        }, res, async ()=>{
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'node sys'
            workbook.lastModifiedBy = 'node sys'
            workbook.created = new Date()
            workbook.modified = new Date()
            workbook.lastPrinted = new Date()
            const worksheet = workbook.addWorksheet('Sheet 1')
            worksheet.pageSetup.verticalCentered = true
            
            let columns = [],formats = {},promises = {},i = 0
            for(let key in req.columns){
                let model = req.columns[key]
                if(/createTimeString|updateTimeString|updateTime|state/.test(key) || !req.columns[key].label) continue
                if(!/input|onlyselect|textarea|select|switch|radio|datetime|image/.test(model.type || 'input')) continue
                model.index = i
                if(model.type == 'datetime') {
                    formats[key] = (value) => $.date(value).Format('yyyy-MM-dd hh:mm:ss')
                }else if(model.type == 'select' || model.type == 'radio'){
                    formats[key] = (value) => {
                        let actions = model.attr.actions || []
                        for(let i = 0; i < actions.length; i ++) if(actions[i].value == value) return actions[i].name
                        return ''
                    }
                }else if(model.type == 'switch'){
                    formats[key] = (value) => {
                        return value == 1 ? '是' : '否'
                    }
                }else if(model.type == 'onlyselect'){
                    formats[key] = (value,key,index,row) => {
                        return row[key.replace('Id','Name')] || value
                    }
                }else if(model.type == 'image' && model.canExcel){
                    promises[key] = (value,key,rowIndex,_row) => {
                        return new Promise(next => {
                            if(value){
                                let img = value.split(',')[0].trim()
                                img = img.indexOf('/file') < 5 ? Config.hosting + img : img
                                $.node.pipe(require('request')(img),(nu,buffer)=>{
                                    _row.height = 100
                                    _row._cells[req.columns[key].index].value = ''
                                    worksheet.addImage(workbook.addImage({
                                        buffer,
                                        extension: img.indexOf('.') > 0 ? img.split()[1] : 'png',
                                    }), {
                                        tl: { col: req.columns[key].index, row: rowIndex },
                                        ext: { width: 130, height: 130 }
                                    })
                                    next()
                                })
                            }else{
                                next()
                            }
                        })
                    }
                }
                let column = { alignment:{ vertical: 'middle', horizontal: 'center' },header: req.columns[key].label || key, key, width: req.columns[key].width }
                if(model.type == 'image') column.width = 20
                columns.push(column)
                i ++
            }
            worksheet.columns = columns
            for(let i = 0; i < req.rows.length; i ++){
                let row = req.rows[i]
                for(let key in formats) {
                    let value = formats[key](row[key],key,i + 1,row)
                    row[key] = value
                }
                let _row = worksheet.addRow(row)
                for(let key in promises) await promises[key](row[key],key,i + 1,_row)
            }
            worksheet.views = [
                {state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'special', activeCell: 'A1'}
            ]
            let buffer = await workbook.xlsx.writeBuffer(req.filename)
            res.set({
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment;filename="${encodeURIComponent(req.filename)}.xlsx"`,
                'Content-Length': buffer.length
            })
            res.end(buffer,'binary')
        })
    }
    return {
        toExcelRouter,
        ExcelJS
    }
}