const fs = require('fs')
process.env.NODE_ENV = process.argv[2] ? process.argv[2].replace('-','') : 'development'
let configPath = `./config.${ process.env.NODE_ENV }.js`;
let config = require(fs.existsSync(configPath) ? configPath : './config.js');
let nm = require('./source')
//实体
nm.$.merge(config,require('./entity'))
//初始化
let models = nm.models()
if(process.argv[3]) {
	let _models = {},_args = process.argv[3].split(',')
	for(let i = 0; i < _args.length; i ++){
		if(models[_args[i]]) {
			_models[_args[i]] = models[_args[i]]
		}
	}
	models = _models
}
require('./source/init.js')(models, {
	id:process.argv[3] ? '' : 'ylysf',
	name:'袁来有说法',
	menus:[//初始化时超管后台菜单
		{name:'首页',url:'/pages/index/index'},
		{name:'系统设置',children:[
			{name:'权限管理',url:'/pages/group/list/list'},
			{name:'菜单管理',url:'/pages/menu/list/list'},
			{name:'用户管理',url:'/pages/user/list/list'},
			{name:'单位管理',url:'/pages/unit/list/list'}
		]},
		{
			name:'数据可视化',children:[
				{name:'表单设计',url:'/pages/model/design'},
				{name:'数据源管理',url:'/pages/data/source'},
				{name:'模块管理',url:'/pages/pject/pject'},
				{name:'视图管理',url:'/pages/data/view'},
				{name:'数据集管理',url:'/pages/data/set'},
				{name:'任务管理',url:'/pages/job/job'},
				{name:'任务日志',url:'/pages/logs/logs'}
			]
		}
	]
})