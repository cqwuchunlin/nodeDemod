var express = require('express');
var bodyParser = require('body-parser');
//var session = require('express-session');
//var cookieParser = require('cookie-parser');
var fs = require('fs');
var readline = require('readline');
//var ejs = require('ejs');
var multer = require('multer');
var app = express();
var https = require('https');
var http = require('http');
var models = { }, Model;
var DB = require('./SQLHelper');
var $ = require('./tool');
require('body-parser-xml')(bodyParser);
app.use(bodyParser.json({limit:'100mb'}));
app.use(bodyParser.urlencoded({ limit:'100mb', extended: true }));
//app.use(cookieParser());
app.use(function (req, res, next) {
  res.setTimeout(10 * 60 * 1000, function () {
    return res.status(408).send({
      errorMsg: '请求超时'
    })
  })
  next();
})

var nm = {
  $: $,
  app: app,
  redis:{},
  db: DB(),
  DB,
  init: function (config) {
    let base64 = new $.Base64()
    app.use(function (req, res, next) {
      //加密发送 dev模式不加密
      res.sendEncode = function(data){
        if(config.encode){
          res.send(base64.encodeURI(typeof data == 'string' ? data : JSON.stringify(data)))
        }else{
          res.send(data)
        }
      }
      next();
    })
    ///redis链接
    if(config.redis){
      let redisConfig = config.redis;
      const redistool = require('redis');
      redisConfig.dbs = redisConfig.dbs || {};
      redisConfig.dbs.session = redisConfig.dbs.session || 0;
      for(let key in redisConfig.dbs){
        nm.redis[key] = {
          client:null,
          clientTime:0,
          init(){
            let nowTime = new Date().getTime()
            if(!this.client || (this.client && nowTime - this.clientTime > 60 * 1000)){
              this.client = redistool.createClient({...redisConfig,db:redisConfig.dbs[key]})
              this.clientTime = nowTime
            }
            return this.client
          },
          get(){//获取字符串
            let redisClient = this.init()
            return redisClient.get.apply(redisClient,arguments)
          },
          set(){//保存字符串
            let redisClient = this.init()
            return redisClient.set.apply(redisClient,arguments)
          },
          lpush(){//保存数组
            let redisClient = this.init()
            return redisClient.lpush.apply(redisClient,arguments)
          },
          lrange(){//获取数组
            let redisClient = this.init()
            return redisClient.lrange.apply(redisClient,arguments)
          },
          expire(){//设置有效期
            let redisClient = this.init()
            return redisClient.expire.apply(redisClient,arguments)
          }
        }
        // nm.redis[key] = redistool.createClient({...redisConfig,db:redisConfig.dbs[key]})
        // nm.redis[key].on('error', function(error) {
        //   console.error(key,error)
        // })
      }
    }
    config.api = $.merge({
      app_group_menu: {
        sort: {
          level: 1,
          sort: -1
        },
        projection: {
          menuId: 'id'
        },
        join: {
          menuId: {
            type: 'INNER',
            name: 'menu',
            key: 'id',
            query: {
              status: {
                $ne: 0
              }
            },
            projection: {
              name: 1,
              sort: 1,
              url: 1,
              parentId: 1
            }
          }
        }
      },
      classifySort: { //分类排序,先level后sort
        sort: {
          level: 1,
          sort: -1
        }
      },
      groupMenu_group_menu: {
        sort: {
          level: 1,
          sort: -1
        },
        projection: {
          menuId: 1
        },
        join: {
          menuId: {
            type: 'INNER',
            name: 'menu',
            key: 'id',
            query: {
              status: {
                $ne: 0
              }
            },
            projection: {
              name: 1,
              sort: 1,
              parentId: 1
            }
          }
        }
      },
      unitUser_unit: {
        projection: {
          unitId: 'value',
          name: 1
        }
      },
      unitUser_user: {
        projection: {
          unitId: 1,
          id:1,
          userName: 1,
          nickName: 1,
          name: 1
        }
      },
      userGroup_group_user: {
        projection: {
          groupId: 1
        },
        join: {
          groupId: {
            type: 'INNER',
            name: 'group',
            query: {
              status: {
                $ne: 0
              }
            },
            projection: {
              name: 1
            }
          }
        }
      },
      userList_user: {
        projection: {
          photo: 1,
          userName: 1,
          nickName: 1,
          name: 1,
          sex: 1,
          phone: 1,
          IDCard: 1,
          brisday: 1,
          address: 1,
          status: 1,
          id:1
        }
      }
    }, config.api || {});
    global.Config = config;
    Model = require('./Model');
    this.setModel(config.models);
    //this.initDB();
    var _this = this;
    var routers = Config.router;
    //app.set('views', Config.views || './template'); // 指定视图所在的位置
    //app.set('view engine', Config.viewEngine || 'ejs'); // 注册模板引擎
    app.use(bodyParser.xml({
      limit: '1MB', // Reject payload bigger than 1 MB 
      xmlParseOptions: {
        normalize: true, // Trim whitespace inside text nodes 
        normalizeTags: true, // Transform tags to lowercase 
        explicitArray: false // Only put nodes in array if >1 
      }
    }));
    Config.AccessControlAllow = Config.AccessControlAllow || {};
    app.all('*', function (req, res, next) {
      res.header("Access-Control-Allow-Origin", Config.AccessControlAllow.Origin || '*');
      res.header('Access-Control-Allow-Methods', Config.AccessControlAllow.Methods || 'PUT,POST,GET,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,token,unitId,unitid,userId,userid' + (Config.AccessControlAllow.Headers ? ',' + Config.AccessControlAllow.Headers : ''));
      next();
    });

    function checkUnModel(modelName, sql) {
      if (!sql) return false;
      var projection;
      if (sql.projection) {
        projection = {}
        for (var key in sql.projection) {
          if (!Config.models[modelName][key].unModel) projection[key] = sql.projection[key];
        }
        sql.projection = projection;
      }
      if (sql.join) {
        for (var key in sql.join) {
          checkUnModel(sql.join[key].name, sql.join[key]);
        }
      }
    }
    var modelRouter = function (req, res, next) {
      try {
        if (models[req.params.name]) {
          if (req.query.sql || req.query.args) {
            req.query.sql = req.query.sql || req.query.args
            if (req.query.sql.charAt(0) != '{') {
              req.sql = $.clone(Config.api[req.query.sql]);
            } else {
              req.sql = JSON.parse(req.query.sql || '{}');
            }
            req.query.sql = null;
          } else if (req.body.sql || req.body.args) {
            req.body.sql = req.body.sql || req.body.args
            if (typeof req.sql == 'string') {
              req.sql = $.clone(Config.api[req.query.sql]);
            } else if (req.sql == 'object') {
              req.sql = req.body.sql;
            }
            req.body.sql = null;
          }
          checkUnModel(req.sql);
          _this.loginRouter(req, res, next);
        } else {
          res.send({
            errorMsg: '无效请求!!!'
          });
        }
      } catch (err) {
        res.send({
          errorMsg: '请求数据错误'
        });
        console.log('请求数据错误',{
          headers:req.headers,
          err,
          body:req.body,
          query:req.query,
          originalUrl:req.originalUrl,
          ip:req.ip
        });
      }
    }
    //行政区域代码
    var areas = [];
    app.get('/areacode', function (req, res) {
      if (areas.length) {
        res.send(areas);
      } else {
        var rl = readline.createInterface({
          input: fs.createReadStream('./source/areaCode.txt'),
          crlfDelay: Infinity
        })
        rl.on('line', (line) => {
          var province = line.charAt(0) + line.charAt(1),
            city = line.charAt(2) + line.charAt(3),
            district = line.charAt(4) + line.charAt(5);
          var id = province + city + district,
            parentId = '',
            capital = 0;
          var name = line.replace(/\d|\s/g, '');
          if (!name || !/^\d+$/.test(id)) return false;
          if (city == '00') {
            parentId = '';
          } else if (district == '00') {
            parentId = province + '0000';
            capital = 1;
          } else {
            parentId = province + city + '00';
          }
          //排除台湾 香港 澳门
          if (!/710000|810000|820000/.test(id)) areas.push({
            name: name,
            id: id,
            parentId: parentId,
            capital: capital
          });
          switch (id) { //直辖市
            case '110000':
              areas.push({
                name: '北京市',
                id: '110100',
                parentId: '110000',
                capital: 1
              })
              break;
            case '120000':
              areas.push({
                name: '天津市',
                id: '120100',
                parentId: '120000',
                capital: 1
              });
              break;
            case '310000':
              areas.push({
                name: '上海市',
                id: '310100',
                parentId: '310000',
                capital: 1
              });
              break;
            case '500000':
              areas.push({
                name: '重庆市',
                id: '500100',
                parentId: '500000',
                capital: 1
              });
              areas.push({
                name: '县',
                id: '500200',
                parentId: '500000',
                capital: 0
              });
              break;
            default:
              break;
          }
        })
        rl.on('close', function () {
          res.send(areas);
        })
      }
    })
    //code登陆
    app.get('/getAccessToken',async function(req,res){
      let base64 = new $.Base64(),code = req.query.code,env = ''
      if(code){
        if(code == 'YXBwdGVzYXRvY1m7R0l1Y62593k6Z4V6V3S8S5UNvbXBvbmVudA==dA=='){//测试code
            code = ['admin',(await models.user.findSync({ userName:'admin' })).passWord]
            // res.send({ token:ret.id, env })
            env = 'test'
        }else{
            try{
                code = base64.decodeURI(code)
                code = code.split('|')
                if(!code[0] || !code[1]){
                    res.send({ errorMsg:'code错误' })
                    return
                }
            }catch(e){
              res.send({ errorMsg:'code参数错误' })
              return
            }
        }
        let user = await models.user.findSync({ userName: code[0],passWord:code[1] })
        if (!user.id) {
          res.send(user)
        } else {
            nm.setSessionRouter(req,null,{
                userId: user.id,
                userName: user.userName,
                platform: 'app',
                type: 3
            }, ret => {
                if (!ret.errorMsg) {
                  res.send({ token:ret.id, env })
                } else {
                  res.send(ret)
                }
            })
        }
      }else{
        res.send({ errorMsg:'缺少code参数' })
      }
    })
    //用户登录
    let loginErrs = {}
    app.post('/login', function (req, res) {
      if (req.body.userName) {
        models.user.find({
          userName: req.body.userName,
          status: 1
        }, async function (useRet) {
          if(!useRet.id){
            useRet = await models.user.findSync({
              phone: req.body.userName,
              status: 1
            })
          }
          let nowTime = new Date().getTime()
          if(loginErrs[useRet.id] && loginErrs[useRet.id].lockTime){
            if(nowTime - loginErrs[useRet.id].lockTime < 10 * 60 * 1000 && loginErrs[useRet.id].times >= 5){
              res.send({
                errorMsg: '当前账号已锁定,请' + (parseInt((loginErrs[useRet.id].lockTime + 10 * 60 * 1000 - nowTime) / 1000 / 60) + 1) + '分钟后再试!'
              })
              return false
            }else{//解锁
              loginErrs[useRet.id] = undefined
            }
          }
          if (!useRet.errorMsg) {
            if (useRet.passWord != req.body.passWord) {
              loginErrs[useRet.id] = loginErrs[useRet.id] || {times:0,time:nowTime}
              if(nowTime - loginErrs[useRet.id].time < 10 * 60 * 1000){//10分钟内输入错误更新错误次数
                loginErrs[useRet.id].times ++
                if(loginErrs[useRet.id].times == 5){
                  loginErrs[useRet.id].lockTime = nowTime
                  res.send({
                    errorMsg: '错误次数太多,请10分钟后再试!'
                  })
                  return false
                }
              }else{
                loginErrs[useRet.id].time = nowTime
                loginErrs[useRet.id].times  = 1
              }
              res.send({
                errorMsg: '用户名或密码错误!'
              })
            } else {
              if (useRet.miniAppUse != 1 && (req.body.platform == 'WeChatMiniApp' || req.body.platform == 'AlipayMiniApp')) {
                res.send({
                  errorMsg: '请联系管理员授权小程序登录权限!'
                });
              } else {
                _this.setSessionRouter(req,res,{
                  unitId: useRet.unitId,
                  userId: useRet.id,
                  userName: useRet.userName
                },ret => {
                  var userInfo = $.merge(useRet, {
                    token: ret.id,
                    id: useRet.id,
                    passWord: '',
                    IDCard: ''
                  })
                  models.group_user.list({
                    userId: useRet.id
                  }, function (ret) {
                    if (!ret.errorMsg) {
                      if (useRet.miniAppUse && (req.body.platform == 'WeChatMiniApp' || req.body.platform == 'AlipayMiniApp')) {
                        userInfo.groups = ret;
                        res.sendEncode(userInfo);
                      } else {
                        if (ret.length > 0) {
                          userInfo.groups = ret;
                          res.sendEncode(userInfo)
                        } else {
                          res.send({
                            errorMsg: '无法登录管理平台,请联系管理员分配权限!'
                          });
                        }
                      }
                    } else {
                      res.send(ret);
                    }
                  }, {
                    // sort:{sort:-1},
                    projection: {
                      groupId: true
                    },
                    join: {
                      groupId: {
                        type: 'INNER',
                        name: 'group',
                        key: 'id',
                        query: {
                          status: 1
                        },
                        projection: models.group.schemas
                      }
                    }
                  })
                })
              }
            }
          } else {
            res.send({errorMsg:'用户名或密码错误'});
            // res.send(useRet);
          }
        })
      } else {
        res.send({
          errorMsg: '用户名不能为空!'
        });
      }
    })
    //修改密码
    app.post('/changePassWord', function (req, res) {
      if (req.body.userName) {
        models.user.find({
          userName: req.body.userName
        }, function (ret) {
          if (ret.errorMsg) {
            res.send(ret);
          } else if (!ret.id) {
            res.send({
              errorMsg: '用户不存在!'
            });
          } else {
            if (ret.passWord != req.body.passWord) {
              res.send({
                errorMsg: '旧密码输入错误!'
              });
            } else if (ret.passWord == req.body.newPassWord) {
              res.send({
                errorMsg: '新密码不能与旧密码一样!'
              });
            } else {
              models.user.update({
                id: ret.id
              }, {
                passWord: req.body.newPassWord
              }, function (ret) {
                res.sendEncode(ret)
              })
            }
          }
        })
      } else {
        res.send({
          errorMsg: '抱歉，您不能这样做！'
        });
      }
    })
    // app.get('/logs', function (req, res) {
    //   var files = fs.readdirSync('./logs'), _files = [];
    //   for (var i = 0; i < files.length; i++) {
    //     _files.push('<div><a target="_blank" href="/logs/' + files[i] + '">' + files[i] + '</a></div>')
    //   }
    //   res.send(_files.join(''));
    // })
    //清理历史登录记录,默认3天前
    app.delete('/sessions', this.loginRouter, function (req, res) {
      models.session.remove({
        createTime: {
          $lte: new Date().getTime() - (req.query.day || 3) * 24 * 60 * 60 * 1000
        }
      }, function (ret) {
        res.sendEncode(ret)
      }, {
        real: true
      })
    })
    //退出登录
    app.get('/logout', function (req, res) {
      if (req.headers['token']) {
        models.session.update({
          id: req.headers['token']
        }, {
          outTime: $.date(new Date()).Format('yyyy-MM-dd hh:mm:ss')
        }, function (ret) {
          res.sendEncode(ret)
        })
      } else {
        res.send({});
      }
    })

    function uploadPath(filename) {
      return __dirname.replace(/source$/, '') + 'uploads/' + filename
    }
    config.file = config.file || {}
    app.post('/upload', this.loginRouter, multer({
      preservePath: true,
      limits: config.file.limit || { fileSize: 100 * 1024 * 1024 },//100M
      fileFilter(req, file, next) {
        // 允许的MIME类型
        let fileIsAllowed = true;
        // if (file.mimetype === 'image/jpeg') {
        //   fileIsAllowed = true;
        // }
        var names = file.originalname.split('.')
        let type = names[names.length - 1].toLowerCase()
        let types = ['png','jpeg','jpg','gif','xlsx','xls','txt','pptx','ppt','pdf','doc','docx'].concat(config.file.accept || [])
        if(types.indexOf(type) == -1) {
          fileIsAllowed = false
          req.error = { errorMsg:'不支持的文件类型' }
        }
        let unAccept = ['.html.','.js.','.css.'].concat(config.file.unAccept || [])
        unAccept = new RegExp(unAccept.join('|'))
        if(unAccept.test(file.originalname)){
          fileIsAllowed = false
          req.error = { errorMsg:'非法的文件名' }
        }
        next(null, fileIsAllowed);
      },
      storage: multer.diskStorage({
        destination: './uploads',
        filename: function (req, file, next) {
          var names = file.originalname.split('.');
          next(null, _this.$.guid() + '.' + names[names.length - 1]);
        }
      })
    }).single('file'), function (req, res) {
      if(req.error){
        res.send(req.error)
        return
      }
      if (req.query.authorization) req.file.authorization = 1;
      req.file.unitId = req.unitId;
      //if(/image\//.test(req.file.mimetype)) req.file.originalname = req.file.originalname.split('.')[0] + '.' + req.file.mimetype.replace('image/');
      models.file.insert(req.file, function (ret) {
        res.send(ret);
      });
    })
    app.get('/file/:id', function (req, res) {
      models.file.find({
        id: req.params.id
      }, function (ret) {
        if (ret.errorMsg) {
          res.send(ret);
          return false;
        }
        if (ret.authorization == 1) {
          _this.loginRouter({
            headers: {
              token: req.query.token,
              unitId: req.query.unitId
            }
          }, res, function () {
            if (req.query.download) {
              res.download(uploadPath(ret.filename), ret.originalname);
            } else {
              res.sendFile(uploadPath(ret.filename));
            }
          })
        } else {
          if (req.query.download) {
            res.download(uploadPath(ret.filename), ret.originalname);
          } else {
            res.sendFile(uploadPath(ret.filename));
          }
        }
      })
    })
    app.route('/nickNames').get(function (req, res) {
      let nickNames = {}
      for(let key in models) if(models[key].nickName) nickNames[key] = models[key].nickName
      res.send($.merge(nickNames,Config.nickNames || {}))
    })
    app.route('/model/:name').get(function (req, res) {
      var returnModel = {};
      for (var key in models[req.params.name].schemas) {
        var model = models[req.params.name].schemas[key];
        if(/TABLE_/.test(key)) continue;
        if (typeof model == 'string') model = {
          label: model
        };
        if (model.label && !model.unModel) {
          model.id = key;
          returnModel[key] = model;
          delete returnModel[key].data_type;
          delete returnModel[key].varType;
        }
      }
      res.sendEncode(returnModel)
    })
    app.route('/api/model/:name')
      .get(modelRouter, function (req, res) {
        req.query._ = null;
        if (req.query.join) {
          req.sql = req.sql || {};
          req.sql.join = req.sql.join || {};
          var joins = req.query.join.split(',');
          for (var i = 0; i < joins.length; i++) {
            let idKey = 'Id'
            if(!models[req.params.name].schemas[joins[i] + idKey]){
              idKey = '_id'
            }
            req.sql.join[joins[i] + idKey] = {
              type: 'LEFT',
              name: joins[i],
              key:joins[i] == 'unit' ? 'unitId' : 'id',
              projection: {
                name: joins[i] + 'Name'
              }
            }
          }
          req.query.join = null;
        }
        if (req.query.id && /^\w+$/.test(req.query.id) && !req.query.pageNum && !req.query.pageSize) {
          models[req.params.name].find(req.query, function (ret) {
            res.sendEncode(ret)
          }, req.sql)
        } else {
          if (Config.models[req.params.name].sort) {
            req.sql = req.sql || {};
            if(!req.sql.sort){
              req.sql.sort = {}
              if(models[req.params.name].schemas.sort) req.sql.sort.sort = -1
              if(models[req.params.name].schemas.createTime) req.sql.sort.createTime = 1
            }
          }
          if(models[req.params.name].schemas.unitId){
            if (req.unitId) {
              req.unitId = req.unitId != 'all' ? { $regex: req.unitId } : req.unitId
              req.query.unitId = req.query.unitId || req.unitId
            }
            req.query.unitId = req.query.unitId == 'all' ? undefined : req.query.unitId;
          }
          models[req.params.name].list(req.query, function (ret) {
            res.sendEncode(ret)
          }, req.sql)
        }
      })
      .post(modelRouter, function (req, res) {
        if (req.unitId) req.body.unitId = req.body.unitId || (req.unitId == 'all' ? undefined : req.unitId);
        // req.query.unitId = req.query.unitId == 'all' ? undefined : req.query.unitId;
        models[req.params.name].insert(req.body, function (ret) {
          if (!ret.errorMsg) {
            for (var key in Config.models[req.params.name])
              if (Config.models[req.params.name][key].unModel && ret[key]) ret[key] = undefined;
          }
          res.sendEncode(ret)
        }, req.sql);
      })
      .put(modelRouter, function (req, res) {
        var query = req.body.query || {};
        if (req.body.id) query.id = req.body.id;
        models[req.params.name].update(query, req.body, function (ret) {
          res.sendEncode(ret)
        }, req.sql);
      })
      .delete(modelRouter, function (req, res) {
        if (req.unitId) {
          req.unitId = req.unitId != 'all' ? { $regex: req.unitId } : req.unitId
          req.query.unitId = req.query.unitId || req.unitId
        }
        req.query.unitId = req.query.unitId == 'all' ? undefined : req.query.unitId;
        models[req.params.name].remove(req.query, function (ret) {
          res.sendEncode(ret)
        }, req.sql);
      });

    for (var key in routers) {
      if (key == 'default') {
        app.use('/', express.static(routers[key]));
      } else {
        if (routers[key].html) app.use('/' + key, express.static(routers[key].html));
        if (routers[key].server) app.use('/' + key, require(routers[key].server));
      }
    }
    app.use(function (err, req, res, next) {
      //打印出错误
      if(req.originalUrl.indexOf('/file/') == 0){
        console.log('500 err 加载图片出错,' + req.originalUrl);
        res.status(500).send({
          errorMsg: '未知错误'
        });
      }else{
        console.log('500 err',{
          headers:req.headers,
          err,
          body:req.body,
          query:req.query,
          originalUrl:req.originalUrl,
          ip:req.ip
        });
        res.status(500).send({
          errorMsg: '未知错误'
        });
      }
    });
  },
  initDB: function (next) {
    let args = { 
      id:Config.id,
      name:Config.name
    }
    if(Config.init) args = Object.assign(Config.init)
    require('./init')(models, args,next)
    // if (process.argv[2] == '-init') {
    //   require('../init')(models, process.argv[3]);
    // } else {

    // }
  },
  models: function () {
    return models;
  },
  log: function (content, type) {
    if (!type) {
      console.log(content);
    } else {
      models.log.insert({
        content: content,
        type: type,
        desoptions: $.date().Format('yyyy-MM-dd hh:mm:ss')
      })
    }
  },
  setModel: function (_models) {
    _models = _models || {}
    _models = this.$.merge(require('./models'), _models)
    for (var key in _models) {
      Config.disDefaultModels = Config.disDefaultModels || {}
      models[key] = new Model()
      models[key].init({
        name:key,
        schemas:_models[key],
        disDefaultModel:Config.disDefaultModels[key]
      })
    }
    Config.models = _models
  },
  router: function (fn) {
    fn.call(app, app);
  },
  ///获取session路由，redis模式会解析session详情
  loginRouter: function (req, res, next) {
    var _session, token = req.headers['token'], unitId = req.headers['unitId'] || req.headers['unitid'];
    function check(session) {
      if (!session.errorMsg && session.id && !session.outTime && (new Date() - session.createTime) <= ((Config.sessionTime * 1000) || 1000 * 60 * 60 * 2)) {
        req.unitId = unitId || session.unitId;
        req.session = session;
        if (!_session) $.Storage.set('session_' + token, session);
        next();
      } else {
        $.Storage.remove('session_' + token);
        res.status(400).send({
          code: 400,
          errorMsg: 'token失效'
        });
      }
    }
    if (req.method == 'OPTIONS') {
      next()
    } else if (token) {
      _session = $.Storage.get('session_' + token);
      if (_session) {
        check(_session);
      } else {
        if(nm.redis && nm.redis.session){
          nm.redis.session.get('session_' + token,(err,ret) => {
            try{
              check(JSON.parse(ret))
            }catch(e){
              res.status(400).send({
                code: 400,
                errorMsg: 'token失效'
              });
            }
          })
        }else{
          models.session.find({
            id: token
          }, function (ret) {
            check(ret);
          })
        }
      }
    } else {
      res.status(400).send({
        code: 400,
        errorMsg: '无token'
      });
    }
  },
  setSession(options){
    return new Promise(next => {
      this.setSessionRouter({},null,options,next)
    })
  },
  ///设置session路由
  setSessionRouter:function(req,res,useRet,next){
    var nowTime = new Date();
    useRet.id = useRet.id || $.snowflake();
    useRet.token = useRet.id
    useRet.platform = useRet.platform || req.body.platform;
    useRet.type = useRet.type || req.body.type || 1,
    useRet.address = useRet.address || req.ip,
    useRet.inTime = $.date(nowTime).Format('yyyy-MM-dd hh:mm:ss');
    useRet.createTime = nowTime.getTime();
    useRet.unitId = useRet.unitId || Config.unitId;
    if(nm.redis.session){
      nm.redis.session.set('session_' + useRet.id,JSON.stringify(useRet));
      nm.redis.session.expire('session_' + useRet.id,(Config.sessionTime || 60 * 60 * 2));
      next(useRet);
    }else{
      models.session.insert(useRet, function(ret){
        // if(!ret.errorMsg) ret.token = userRet.token
        // next(ret)
        next(ret.errorMsg ? ret : useRet)
      })
      // models.session.insert(useRet, next)
    }
  },
  updateVersionNumber: function (files, num) { //更新文件版本号
    for (var i = 0; i < files.length; i++) fs.writeFileSync(files[i], fs.readFileSync(files[i], 'utf-8').replace(/__\d+__/gmi, '__' + num + '__'));
  },
  server: function () {
    var httpServer = http.createServer(app);
    if (Config.port == 443 || Config.port == 44380) {
      var option = {};
      if (Config.pem_key && Config.pem_cer) {
        option = {
          key: fs.readFileSync(Config.pem_key, 'utf8'),
          cert: fs.readFileSync(Config.pem_cer, 'utf8')
        }
      } else if (Config.pfx && Config.passphrase) {
        option = {
          pfx: fs.readFileSync(Config.pfx),
          passphrase: Config.passphrase
        }
      }
      var httpsServer = https.createServer(option, app);
      httpsServer.listen(443, '0.0.0.0', function () {
        Config.ip = httpsServer.address().address;
        console.log('HTTPS Server is running on: http://%s:%s', Config.ip, httpsServer.address().port);
      });
      if (Config.port == 44380) {
        httpServer.listen(80, '0.0.0.0', function () {
          Config.ip = httpServer.address().address;
          console.log('HTTP Server is running on: http://%s:%s', Config.ip, httpServer.address().port);
        });
      }
    } else {
      httpServer.listen(Config.port, '0.0.0.0', function () {
        Config.ip = httpServer.address().address;
        console.log('HTTP Server is running on: http://%s:%s', 'localhost', httpServer.address().port);
      });
    }
  }
}
process.on('uncaughtException', function (err) {
  //打印出错误
  if(err.originalUrl && err.originalUrl.indexOf('/file/') == 0){
    console.log('加载图片出错,' + err.originalUrl);
  }else{
    console.log(err);
  }
})

module.exports = nm;