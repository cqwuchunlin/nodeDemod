module.exports = {
    TABLE_NICK_NAME: '数据源',
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
    host: {
        label: 'IP',
        rule: { NotNull: true },
        type: 'input'
    },
    port:{
        label:'端口',
        rule: { NotNull: true },
        defaultValue:3306,
        attr:{
            type:'number'
        },
        type:'input'
    },
    dbn:{
        label:'库名',
        rule: { NotNull: true },
        type:'input'
    },
    user:{
        label:'用户名',
        defaultValue:'root',
        rule: { NotNull: true },
        type:'input'
    },
    password:{
        label:'密码',
        rule: { NotNull: true },
        unModel: true,
        attr:{
            type:'password'
        },
        type:'input'
    }
}