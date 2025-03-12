module.exports = {
    TABLE_NICK_NAME: '数据集',
    id:{
        type:'input',
        unList:false
    },
    name: {
        label: '名称',
        rule: { NotNull: true },
        type: 'input'
    },
    pjectId:{
        label:'所属模块',
        type:'onlyselect'
    },
    datasourceId: {
        label: '数据源',
        rule: { NotNull: true },
        type: 'onlyselect'
    },
    content:{
        label:'查询语句',
        attr:{
            placeholder:'SQL语句,支持${id}或#id形式带参,自带参数:${currentday}(当前日)、${yesterday}(昨日)、${currentmonth}(当前月)、${lastmonth}(前月)、${currentyear}(当年)、${lastyear}(去年)',
            rows:10
        },
        rule: { NotNull: true, NotSql:false },
        data_type:'LONGTEXT',
        type:'textarea'
    },
    status:{
        label:'是否启动',
        defaultValue:1,
        type:'switch'
    }
}