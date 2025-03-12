module.exports = {
    TABLE_NICK_NAME: '任务',
    name: {
        label: '名称',
        rule: { NotNull: true },
        type: 'input'
    },
    pjectId:{
        label:'所属模块',
        type:'onlyselect'
    },
    cron: {
        label: 'Cron表达式',
        type:'input'
    },
    dw:{
        label:'数据层级',
        attr:{
            actions:[
                { name:'ODS(清洗层)',value:'ods' },
                { name:'DWD(细节层)',value:'dwd' },
                { name:'DWM(中间层)',value:'dwm' },
                { name:'DWS(服务层)',value:'dws' },
                { name:'ADS(应用层)',value:'ads' }
            ]
        },
        type:'select'
    },
    type:{
        label:'任务类型',
        defaultValue:'datay',
        attr:{
            actions:[
                { name:'DataY',value:'datay' },
                { name:'DataX',value:'datax' },
                { name:'Command',value:'command' },
                { name:'JavaScript',value:'code' }
            ]
        },
        type:'select'
    },
    content:{
        label:'内容',
        attr:{
            placeholder:'Command有效'
        },
        rule: { NotSql:false },
        type:'input'
    },
    status:{
        label:'是否启动',
        defaultValue:0,
        type:'switch'
    },
    file:{
        label:'配置脚本',
        attr:{ rows:30,placeholder:'Command模式无效,只支持${id}形式带参,自带参数:${currentday}(当前日)、${yesterday}(昨日)、${currentmonth}(当前月)、${lastmonth}(前月)、${currentyear}(当年)、${lastyear}(去年)' },
        unCheckSQL:true,
        unList:true,
        rule: { NotSql:false },
        data_type:'LONGTEXT',
        type:'textarea'
    },
    pFunction:{
        label:'前置参数',
        attr:{
            placeholder:'JavaScript脚本',
            rows:20
        },
        unCheckSQL:true,
        rule: { NotSql:false },
        unList:true,
        data_type:'LONGTEXT',
        type:'textarea'
    }
}