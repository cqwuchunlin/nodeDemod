module.exports = {
    TABLE_NICK_NAME: '数据视图',
    id:{
        type:'input',
        unList:false
    },
    name: {
        label: '视图名称',
        rule: { NotNull: true },
        unique:true,
        type: 'input'
    },
    pjectId:{
        label:'所属模块',
        type:'onlyselect'
    },
    datasetId: {
        label: '公共数据集',
        type: 'onlyselect'
    },
    status:{
        label:'是否启用',
        defaultValue:1,
        type:'switch'
    },
    deploy:{
        label:'Echarts配置',
        attr:{ rows:20,placeholder:'option = ' },
        data_type:'LONGTEXT',
        type:'textarea',
        rule: { NotNull: true, NotSql:false }
    },
    nullTips:{
        label:'为空提示',
        defaultValue:'没有数据哦~',
        type:'input'
    },
    tit:{
        label:'数据源配置-使用公共数据集可忽略',
        type:'title'
    },
    datasourceId: {
        label: '数据源',
        placeholder:'存在数据集时',
        type: 'onlyselect'
    },
    content:{
        label:'查询语句',
        type:'textarea',
        rule: { NotSql:false },
        attr:{
            placeholder:'SQL语句,支持${id}或#id形式带参,自带参数:${currentday}(当前日)、${yesterday}(昨日)、${currentmonth}(当前月)、${lastmonth}(前月)、${currentyear}(当年)、${lastyear}(去年)', 
            rows:10 
        },
        data_type:'LONGTEXT'
    }
}