var $ = require('./tool');
var DB = require('./SQLHelper')();
var { toJava, toDart } = require('./ToEntity');
module.exports = async function(models,app,callback){
	for(var key in models){
		if(key === 'models' || key === 'config') continue;
		let ret = await models[key].createTableSync()
		if(ret.errorMsg) console.log('创建表' + key + '失败!!!',ret)
	}
	console.log('表结构更新完成!!!')
	if(!app.id) return
	//创建unit
	let unit = await models.unit.listSync({ unitId:app.id })
	if(unit.length == 0){
		unit = await models.unit.insertSync({
			parentUnitId:0,
			level:1,
			unitId:app.id,
			name:app.name,
			authorzation:Config.authorzation
		})
		if(!unit.errorMsg){
			console.log(app.name + '创建成功!');
		}else{
			console.log(app.name + '创建失败!' + unit.errorMsg);
			console.log(unit);
		}
	}else{
		unit = unit[0]
	}
	let user = await models.user.findSync({ userName:'admin' })
	if(user.errorMsg){
		user = await models.user.insertSync({
			photo:'/images/logo.png',
			unitId:app.id,
			name:'超级管理员',
			userName:'admin',
			nickName:'超级管理员',
			supplier:1
		})
		if(!user.errorMsg){
			console.log('超级管理员账号创建成功!')
		}else{
			console.log('超级管理员账号创建失败!' + ret.errorMsg);
			console.log(ret);
		}
	}
	let group = await models.group.findSync({name:'超级管理员',unitId:app.id})
	if(group.errorMsg){
		group = await models.group.insertSync({
			unitId:app.id,
			name:'超级管理员',
			sort:1,
			parentId:0,
			editAble:1
		})
		if(!group.errorMsg){
			console.log('超级管理员权组创建成功!')
			//管理用户群组
			await models.group_user.insertSync({ userId:user.id, groupId:group.id })
		}else{
			console.log('超级管理员权组创建失败!' + group.errorMsg);
			console.log(group);
		}
	}
	//创建菜单
	if(app.menus){
		let hasMenus = await models.menu.listSync({})
		if(hasMenus.length == 0 && group.id){
			var _menus = app.menus || []
			let menus = [],maxSort = 100
			for(let i = 0; i < _menus.length; i ++){
				let menu = _menus[i],id = i + 1
				menus.push({
					id,
					unitId:app.id,
					name:menu.name,
					sort:maxSort - i,
					level:1,
					url:menu.url,
					parentId:0
				})
				if(menu.children && menu.children.length){
					for(let j = 0; j < menu.children.length; j ++){
						let childMenu = menu.children[j];
						menus.push({
							unitId:app.id,
							name:childMenu.name,
							sort:maxSort - i,
							level:2,
							url:childMenu.url,
							parentId:id
						})
					}
				}
			}
			for(var i = 0; i < menus.length; i ++){
				menus[i].parentId = menus[i].parentId || 0;
				menus[i].editAble = menus[i].editAble || 1;
				let menu = await models.menu.insertSync(menus[i])
				if(!menu.errorMsg){
					let group_menu = await models.group_menu.insertSync({
						unitId:app.id,
						groupId:group.id,
						menuId:menu.id
					})
					if(group_menu.errorMsg) console.log('创建后台菜单 ' + menus[i].name + ' 失败')
				}
			}
			
		}
	}
	console.log('数据库初始化完成!!!')
	
	if(app.java) {
		for(let key in models) toJava(key,models[key].schemas,app.java,models[key])
		console.log('构建Java实体类完成')
	}
	if(app.dart) {
		for(let key in models) toDart(key,models[key].schemas,app.dart,models[key])
		console.log('构建Dart实体类完成')
	}
	if(callback) callback(models)
}
