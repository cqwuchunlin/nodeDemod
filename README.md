## 资料
# 低代码服务

## 安装运行
```
安装依赖： npm install 
启动服务： npm run dev
线上首次运行启动pm2： pm2 start pm2.json
线上运行： npm run serve
```

## 创建表(更新数据库&更新Java端Entity)
```
第一步 在entity文件夹中创建js文件，table_name.js  
第二步 创建table命令：npm run init -- table_name1 table_name2 (支持多个表安装)  
第三步 如果因为数据库中已有需要创建的表而失败，请确保数据安全的情况下谨慎操作，手动删除后再运行第二步

[字段设计助手](#/pages/model/design)参见/pages/model/design页面

表创建注意事项：
1.创建表默认会添加id(主键,雪花),createTime(创建时间/时间戳),updateTime（上次更新时间/时间戳）,state(数据状态/1或0),untiId(默认单位)，以上字段由系统框架控制，请不要进行其他操作
2.当需要使用表的关联字段时，请使用关联表名+Id的形式定义关联字段，例如:在用户信息表user里面有字段deptId,关联部门表dept的id字段，表示用户所属的部门。
3.TABLE_NICK_NAME，表昵称
4.TABLE_DESC，表描述
示例：
module.exports = {
    TABLE_NICK_NAME:'文章',
    TABLE_DESC:'包括了文章、新闻、通知、公告',
    img: {
        label: '头图',
        attr: {
            width: 801,
            height: 535
        },
        type: 'image'
    },
    title: {
        label: '标题',
        rule: { NotNull: true },
        allWidth: true,
        // unList: true,
        type: 'input'
    },
    type:{
        label:'类型',
        defaultValue:'article',
        attr:{
            actions: [
                { name: '文章', value: 'article' },
                { name: '新闻', value: 'news' },
                { name: '通知', value: 'notify' },
                { name: '公告', value: 'notice' }
            ]
        },
        type:'select'
    }
}
```

### entity(表)文件字段属性说明
```
1.label 字段名称
2.data_type 数据库字段类型定义，优先级最高,详见后面
3.rule 校验规则 非必填,详见后面
4.index 索引,String/Boolean
5.unique 唯一指定，true的时候指定此字段为唯一
6.desc 字段描述
```

### rule 校验规则
```
 参数 | 说明 | 示例
 --- | --- | ---
 Name | 姓名 | '张三'
 Phone | 电话号码 | '17215545454'
 IDCard | 身份证 | '5023145124589654'
 Email | 邮箱 | '313@qq.com'
 Date | 一般日期(使用“-”分隔,例如:2018-01-01) | '2017-12'
 PositiveNum | 正数 | 1.12
 PositiveInt | 正整数 | 1
 NotNull | 不能为空 | 
 MaxLength | 最大长度 | 18
 MinLength | 最小长度 | 6
 MaxNumber | 最大值 | 24
 MinNumber | 最小值 | 12
 Regx | 正则 | '^[a-zA-Z0-9_]{5,12}$_gmi_g_gmi_应该由5-12位数字、大小写字母或下划线组成'
```

### 字段类型
```
可通过data_type定义数据库字段类型,在无data_type时会根据部分定义属性做类型调整

rule影响如下:
PositiveNum - DOUBLE
PositiveInt - INT
NotNull - NOT NULL

如无指定则按VARCHAR(255)创建字段
```

## 创建接口
```
在router文件夹中创建js文件，model_name.js  
传入参数说明
app(express app),用法参照 [express官网](https://www.expressjs.com.cn/starter/basic-routing.html)
models 表实体
$ 工具库
db 数据库操作
nm 框架全局实例
```


### 数据库操作
```
数据库操作语法参照mongdb，操作数据库所有的结果会通过callback回传

查询数据列表
await models.table_name.listSync(query,args)
如query中有pageSize或pageNum会返回分页数据，{total:0,rows:[]}
前端请求接口:
url:/api/model/table_name
method:GET
params:{pageNum:1,sql:{sort:{level: 1}}}//对应query,可用sql字段对应args属性
response:{total:0,rows:[]}//或者[]

查询单个数据详情
await models.table_name.findSync(query,args)
//query为{id:1}
前端请求接口:
url:/api/model/table_name
method:GET
params:{id:1}//对应query，可用sql字段对应args属性
response:{}//实例全部数据

新增数据
await models.table_name.insertSync(data,args)
前端请求接口:
url:/api/model/table_name
method:POST
data:{}//对应data
response:{}//新增实例数据

修改数据
await models.table_name.updateSync(query,data,args)
前端请求接口:
url:/api/model/table_name
method:PUT
data:{id:1,name:'newName'}//id对应query,其余字段对应data
response:{}//修改影响数据

删除数据
await models.table_name.removeSync(query,args)
默认删除数据都是逻辑删除，数据库中修改该条数据的state值为0,查询列表的时候不会返回
如果需要真正删除请在args中添加real:true属性
前端请求接口:
url:/api/model/table_name
method:DELETE
params:{id:1,sql:{real:false}}
response:{}//删除数据影响数据

执行自定义SQL
await db._evalSync(sql,callback)
```

### 查询参数query说明
```
查询语法类似mongodb, [菜鸟教程](https://www.runoob.com/mongodb/mongodb-query.html)

等于 {key:value} 
小于 {key:{$lt:value}}
小于或等于 {key:{$lte:value}}
大于 {key:{$gt:value}}
大于或等于 {key:{$gte:value}}
不等于 {key:{$ne:value}}
AND {key1:value1, key2:value2}
正则 {key:{$regex:value}}
属于 {key:{$in:[value1,value2]}}
```

### 查询结果整理args说明
```
projection 可选，使用投影操作符指定返回的键。查询时返回文档中所有键值， 只需省略该参数即可（默认省略）
    举例 {id:0,nickName:1,name:'realName'}
    0:不返回
    1:返回
    String:按别名返回，类似SQL的AS

limit 指定读取的记录条数,skip跳过指定数量的数据
    举例 {limit:10,skip:0}
    注意，分页查询的时候框架会自动计算这两个值

sort 排序
    举例: { level: 1, sort: -1 }
    1：升序
    -1:降序

join 联表查询,可配置多个关联表，如果是html里面直接get请求，外层加sql:
    举例 
    {
        join:{
            deptId: {
                type: 'INNER',
                name: 'dept',
                key: 'id',//默认
                query: {
                    status: 1
                },
                projection: {
                    name: 1,
                    sort: 1,
                    url: 1,
                    parentId: 1
                }
            }
        }
    }
    其中deptId为关联字段名称
    type:关联查询类型，LEFT(默认)/INNER/RIGHT 
    name:关联表名
    key:关联表字段名
    query:查询关联表条件
    projection:关联表字段投影
```

### API

```
后台登录,获取token，后续所有接口都必须在header中加上token
url:/login
method:POST
data:{
	userName:'admin',//用户名
	passWord:'md5password'//MD5加密后的密码
}
response:{
	token:'',//登录凭证
	...//其他用户信息
}

文件上传
url:/upload
method:POST
data:FormData(),//文件对应字段名file
response:{
	id:'',//文件主码
}

文件访问
url:/file/{id} //id问文件上传返回的id，加上download会下载文件
method:GET

通过数据库访问，用法参照数据库操作
/api/model/table_name
```

# 前端架构

> 基于Vue的前端框架，使用框架提供的组件自适应移动端及PC端
> 前端代码目录admin

## models数据模型

> 后端数据库Entity，前端列表、表单编辑共用数据模型

### input
+ 普通输入，表单默认输入方式
+ 数据模型适用于mixinput组件，详情参见maxinput组件
```
title: {
    label: '标题',///字段名称
    rule: { NotNull: true,MaxLength:18 },///表单校验规则
    ///defaultValue:'',///默认值
    ///data_type:'VARCHAR(128)',///默认VARCHAR(255)
    ///desc:'这是文章标题字段',///字段描述
    ///index:true,///索引,String/Boolean
    ///unique:true,///唯一指定，true的时候指定此字段为唯一
    ///allWidth: true,///设置pc端占整行
    ///style:'',///Web端CSS样式
    ///unList: true,///设置列表不显示
    attr:{///输入项其他属性
      type:'text',
      placeholder:'请输入标题'///占位符
    },
    ///readOnly:true ///设置只读
    type: 'input'///字段输入类型，默认input
},
```

### select
+ 单选
```
type:{
    label:'类型',
    defaultValue:'article',
    attr:{
        actions: [
            { name: '文章', value: 'article' },
            { name: '新闻', value: 'news' },
            { name: '通知', value: 'notify' },
            { name: '公告', value: 'notice' }
        ]
    },
    type:'select'
},
```
### onlyselect
+ 关联表选择
```
item:{
  id:'unitId',
  label:'所属单位',
  attr:{
    ///skey: 'name',///显示字段，默认name
    ///vkey: 'unitId',///取值字段，默认id
    ///url: '/api/model/unit',///查询API
    ///canClear:true,///是否可清除
    ///title: '请选择所属单位'///标题
  },
  type:'onlyselect'
},

```
+ 建议字段设计时采用表明+Id的方式，同时被关联表如果存在name字段表示名称，可简化attr配置
```
userId:{
  label:'用户',
  type:'onlyselect'
},
```

### image
+ 图片上传
```
images: {
    label: 'LOGO',
    attr: {
      width: 500,///宽带限制
      height: 500,///高度限制
      radius: 250,///圆角
      limit:1///数量限制，默认9张
    },
    type: 'image'
},
```

### file
+ 文件上传
```
files: {
    label: '附件',
    attr: {
      limit:1,///数量限制
      maxSize:200 * 1024 * 1024///大小限制
    },
    type: 'file'
},
```

### textarea
+ 多行输入框
```
digest: {
    label: '摘要',
    unList: true,///一般不显示在列表上
    type: 'textarea'
},
```

### editor
+ 富文本编辑器
```
content: {
    label: '详情',
    type: 'editor'
},
```

### region
+ 省市区选择
```
area: {
    label: '选择城市',
    type: 'region'
},
```

### mappoint
+ 地图选点，以[[longitude,latitude]...]格式保存
```
latLonArray: {
    label: '地图选点',
    data_type:'LONGTEXT',
    attr:{
      max:1//最大选点数,默认1
    },
    type: 'mappoint'
},
```

### mappolygon
+ 地图选区，以[[[longitude,latitude]...]...]格式保存
```
latLonArray: {
    label: '地图选区',
    data_type:'LONGTEXT',
    type: 'mappolygon'
},
```

### date
+ 日期
```
date: {
    label: '日期',
    type: 'date'
},
```

### time
+ 时间
```
time: {
    label: '时间',
    type: 'time'
},
```

### datetime
+ 日期+时间，以时间戳格式保存在数据库中
```
createTime: {
    label: '创建时间',
    type: 'datetime'
},
```

### radio
+ 单选(推荐使用select)
```
sex: {
    label: '性别',
    attr: {
      actions: [
        {
          value: 1,
          name: '男'
        },
        {
          value: 2,
          name: '女'
        }
      ]
    },
    type: 'radio'
},
```

### checkbox
+ 多选
```
tips: {
    label: '标签',
    attr: {
      actions: [
        {
          value: 'java',
          name: 'Java'
        },
        {
          value: 'web',
          name: '前端'
        },
        {
          value: 'test',
          name: '测试'
        },
        {
          value: 'bigdata',
          name: '大数据'
        },
        {
          value: 'ai',
          name: '人工智能'
        }
      ]
    },
    type: 'checkbox'
},
```

### title
+ 对输入项进行分组
```
title1: {
    label: '基本信息',
    type: 'title'
},
```

## 组件

### listtable 
+ 分页列表
```
<template>
  <master :title="title">
    <listpage ref="listpage"></listpage>
  </master>
</template>
<script type="text/javascript">
(function (G) {
G.vue({
  "usingComponents": {///引入组件
    "master": "/components/Master/Master",///母版组件
    "listpage": "/components/List/Page/Page"///通用列表组件
  },
  "enablePullDownRefresh": true
},G.modelList({///配置listpage组件
  	modelName:'article',///entity名称
    title:'新闻',
    listPage(list,query){///query为前一个页面传过来的参数
      list.getUrl = '/api/model/article?type=news';///列表请求API
      list.searchKey = 'title,digest'///搜索字段，来源于列表数据模型
      ///list.canCheck = false ///取消选中按钮 同时取消批量删除
      ///list.canBack = true ///添加返回上一页按钮
      ///list.actions.add = false ///取消新增按钮
      ///list.actions.delet = undefined ///取消行删除按钮
      ///list.actions.edit = undefined ///取消行修改按钮
      // list.models = {/// 列表数据模型，默认使用后台返回对应的模型
      //   id:{
      //     label:'编号'
      //   }
      // }
      list.actions.push = {///定义操作按钮，默认存在修改和删除
        name:'推送',///按钮名称
        action(event){///点击回调
          let item = event.detail///数据
          console.log(item)
          ///推送逻辑
        }
      }
    },
    modeleditquery(edit,event,query){///编辑页面 edit对象，event事件，query前一个页面传过来的参数
      console.log(edit)
      // edit.models = {///编辑数据模型，默认使用后台返回的对应模型
      //   title:{
      //     label:'标题',
      //     type:'input'
      //   }
      // }
      ///edit.readOnly = true ///设置页面只读
      ///edit.meth = 'PUT' ///请求方式
      ///edit.url = '/api/model/article' ///请求地址
    }
  }));
})(Y)
</script>
<style scoped>
  /* 页面样式 */
</style>
```

### formitems 
+ 表单,使用数据模型
```
<template>
<div class="loginBox">
  <formitems :models="models" ref="loginForm"></formitems>
  <button_ class="loginBtn" type="primary" size="default" :disabled="submiting" @click="submit">{{submiting ? '登录中...' : '登录'}}</button_>
</div>
</template>
<script type="text/javascript">
(function (G) {
  G.vue({
  "usingComponents": {
    "formitems":"/components/Form/Items/Items"
  },
  "navigationBarTitleText": "登录"
},{
    data:{
      models:{///数据模型
        userName:{
          type: 'input',
          label: '用户名',
          rule: { NotNull: true }
        },
        passWord:{
          label: '密码',
          type: 'input',
          attr: { type: 'password' },
          rule: { NotNull: true }
        }
      },
      submiting: false
    },
    methods:{
      submit(){
        var data = this.selectComponent('#loginForm').submit();
        if(!data) return false;
        data.passWord = G.MD5(data.passWord);
        data.platform = G.platform;
        this.setData({submiting:true})
        let res = await G.post('/login',data)
        this.setData({ submiting: false })
      }
    }
  });
})(Y)

</script>
<style scoped>

</style>
```

### maxinput
+ 单个输入项,集合了多种方式输入，适用于除onlyselect、editor、table类型外所有的数据模型
+ 引入路径:"mixinput":"/components/Input/Mixinput/Mixinput"
```
///已本数据模型为例
item: {
    id:'title',
    label: '标题',///字段名称
    rule: { NotNull: true,MaxLength:18 },///表单校验规则
    attr:{///输入项其他属性
      type:'text',
      placeholder:'请输入标题'///占位符
    },
    ///readOnly:true ///设置只读
    type: 'input'///字段输入类型，默认input
}
<mixinput :name="item.id" :type="item.type" :attr="item.attr" :read-only="item.readOnly" value="这是初始值" @change="change"></mixinput>
```

### onlyselect
+ 关联表选择，使用方式,引入路径:"mixinput":"/components/Input/OnlySelect/OnlySelect"
```
<onlyselect :skey="item.attr.skey" :sitem="item.attr.sitem" :name="item.id" :disabled="item.readOnly" :url="item.attr.url" :meth="item.attr.meth" :title="item.attr.title" :data="item.attr.data" :placeholder="item.attr.placeholder" :search-key="item.attr.searchKey" :search-regex="item.attr.searchRegex" :can-clear="item.attr.canClear" :vkey="item.attr.vkey" :value="1" @change="change"></onlyselect>
```

### webmappoint
+ 地图选点，使用方式,引入路径:"webmappoint":"/components/Input/Map/Point/Point"
+ [高德地图API](https://lbs.amap.com/demo/jsapi-v2/example/map-lifecycle/map-show)
```
<webmappoint ref="testmap" :index="index" :name="item.id" :disabled="item.readOnly" :attr="item.attr" value="[[longitude,latitude]...]" @change="change" @click="mapClick"></webmappoint>
//获取地图原始对象,获取后使用高德API操作地图
this.$refs.testmap.map
```

### webmappolygon
+ 地图选区，使用方式,引入路径:"webmappolygon":"/components/Input/Map/Polygon/Polygon"
+ [高德地图API](https://lbs.amap.com/demo/jsapi-v2/example/map-lifecycle/map-show)
```
<webmappolygon ref="testmap" :index="index" :name="item.id" :disabled="_readOnly||item.readOnly" :attr="item.attr" :value="[[[longitude,latitude]...]...]" @change="change"></webmappolygon>
//获取地图原始对象,获取后使用高德API操作地图
this.$refs.testmap.map
```

### modal
+ 自定义内容弹框,引入路径:"modal":"/components/Modal/Modal"
```
<modal :confirm-box-style="contentStyle" title="新增内容" :visible="show" @success="submit" @fail="closeEdit">
  这是一个自定义内容弹出框
</modal>
```

### drawer
+ 自定义内容周边弹出层,引入路径:"drawer":"/components/Drawer/Drawer"
```
<drawer :content-style="drawerStyle" :visible="show" @close="openSearch">
  这是一个带透明背景的周边弹出层
</drawer>
```

## API

### 网络请求
```
let res = await G.get('{JAVAURL}/api',{id:1})
if(!res.errorMsg) {
  //获取数据成功
}

let res = await G.post('{JAVAURL}/api',{name:'张三',age:24})
if(!res.errorMsg){
  //新增数据成功
}

let res = await G.put('{JAVAURL}/api',{id:1,name:'张三',age:26})
if(!res.errorMsg){
  //修改数据成功
}

let res = await G.delete(`{JAVAURL}/api/${id}`)
if(!res.errorMsg){
  //删除数据成功
}
```

### 页面跳转
```
///html中跳转
<div @click="$go" :data-url="'/pages/user/detail' + id">跳转详情</div>
///js中跳转
G.$go(`/pages/user/detail?id=${id}`)

///html中跳转
<div @click="$back">返回上一页</div>
///js中跳转
G.$back()

```

### 弹框
```
G.alert('我是确定弹框').then(()=>{
  ///弹出后逻辑
  G.confirm('我是提示弹框').then(()=>{
    ///弹出后逻辑
    console.log('用户选择了确定')
  }).catch(()=>{
    console.log('用户选择了取消')
  })
})

```

### 黑色限时提示框
```
G.toask('这是错误的')

```

## tool.js API

[https://gitee.com/yfly666/tools](https://gitee.com/yfly666/tools)
