/*UNRES Add this annotation to the document let it is inaccessible*/
var DB = require('./SQLHelper');
var $ = require('./tool');
var db = DB()
function Model(name, schemas,idKey) {
  if(name) this.init({ name, schemas, idKey})
  this.init = function(args){
    args = args || {}
    this.name = args.name;
    this.idKey = args.idKey || 'id';
    this.desc = args.schemas.TABLE_DESC || '';
    this.nickName = args.schemas.TABLE_NICK_NAME || '';
    delete args.schemas.TABLE_DESC;///表描述
    delete args.schemas.TABLE_NICK_NAME;///表昵称
    this.schemas = args.schemas;
    if(!args.disDefaultModel) this.setDefaultModel()
  }
  this.setDefaultModel = function(){
    for (var key in this.schemas){
      if (!/TABLE_/.test(key) && typeof this.schemas[key] == 'string') {
        this.schemas[key] = {
          label: this.schemas[key]
        }
      }
      this.schemas[key].rule = this.schemas[key].rule || {}
      if(/textarea|input/.test(this.schemas[key].type) && this.schemas[key].rule.NotSql !== false) this.schemas[key].rule.NotSql = true
      if(this.schemas[key].PRIMARYKEY || (this.schemas[key].data_type && /PRIMARY KEY/.test(this.schemas[key].data_type))) this.idKey = key;
    }
    this.schemas.id = $.merge({
      label: 'ID',
      unList:true
    }, this.schemas.id || {})
    this.schemas.createTime = $.merge({
      label: '创建时间',
      type: 'datetime',
      unModel: true
    }, this.schemas.createTime || {})
    this.schemas.createTimeString = $.merge({
      label: '创建时间',
      // unModel: true,
      desc:'创建时间字符串'
    }, this.schemas.createTimeString || {})
    this.schemas.updateTime = $.merge({
      label: '更新时间',
      type: 'datetime',
      unModel: true
    }, this.schemas.updateTime || {})
    this.schemas.updateTimeString = $.merge({
      label: '更新时间',
      unModel: true,
      desc:'更新时间字符串'
    }, this.schemas.updateTimeString || {})
    this.schemas.state = $.merge({
      label: '',
      data_type: 'INT',
      defaultValue:1,
      unModel: true,
      desc:'逻辑删除控制:1(默认)、0(已逻辑删除)'
    }, this.schemas.state || {})
    this.schemas.unitId = $.merge({
      label: '',
      index:true,
      desc:'数据隔离字段'
    }, this.schemas.unitId || {})
  }
  this.db = db
  this.checkSQL = function (sql, isQuery) {
    try {
      if (typeof sql == 'string') {
        if (isQuery) {
          if (!$.Verify.NotSql(sql)[0]) {
            console.log('警惕sql注入',sql)
            return '----------';
          } else {
            if (/^\{.+\}$/.test(sql)) {
              return JSON.parse(sql);
            } else {
              return sql;
            }
          }
        } else {
          if ($.Verify.NotSql(sql)[0]) {
            return sql;
          }else{
            return '----------'
          }
        }
      } else {
        return sql;
      }
    } catch (e) {
      return '----------';
    }
  }
  this.queryFormat = function (query) {
    query = query || {};
    var o = {};
    for (var key in this.schemas) {
      var queryString = this.schemas[key].unCheckSQL ? query[key] : this.checkSQL(query[key], true);
      if (queryString !== undefined && queryString !== '') o[key] = queryString;
    }
    if (query.pageNum) o.pageNum = query.pageNum;
    if (query.pageSize) o.pageSize = query.pageSize;
    if (query.unitId && this.schemas.unitId) {
      var unitId = this.checkSQL(query.unitId, true);
      if (unitId) o.unitId = unitId;
    }
    return o;
  }
  //查询
  this.find = function (query, fn, args) {
    return this.db.find(this.name, this.queryFormat(query), fn, args);
  }
  ///2版本 支持Promise
  this.findSync = function(query,args){
    return new Promise(next => {
      this.find(query,next,args)
    })
  }
  this.findDB = function (database, query, fn, args) {
    return this.db.find(this.name, this.queryFormat(query), fn, args, database);
  }
  //列表
  this.list = function (query, fn, args) {
    query = query || {}
    if (query.state == undefined) query.state = 1;
    args = args || {};
    if(!args.sort && this.schemas.id) {
      args.sort = {};
      args.sort[this.name + '.id'] = -1;
    }
    return this.db.list(this.name, this.queryFormat(query), fn, args);
  }
  ///2版本 支持Promise
  this.listSync = function(query,args){
    return new Promise(next => {
      this.list(query,next,args)
    })
  }
  this.listDB = function (database, query, fn, args) {
    query = query || {}
    if (query.state == undefined) query.state = 1;
    args = args || {};
    if(!args.sort && this.schemas.createTime) {
      args.sort = {};
      args.sort[(this.name || database) + '.createTime'] = -1;
    }
    return this.db.list(this.name, this.queryFormat(query), fn, args, database);
  }
  //功能函数
  this.functions = function (options, fn, query, args) {
    return this.db.functions(this.name, options, fn, this.queryFormat(query), args);
  }
  ///2版本 支持Promise
  this.functionsSync = function(options, query, args){
    return new Promise(next => {
      this.functions(options, next, query, args)
    })
  }
  this.functionsDB = function (database, options, fn, query, args) {
    return this.db.functions(this.name, options, fn, this.queryFormat(query), args, database);
  }
  this.query = async function(sql){
    return await this.db._evalSync(sql)
  }
  //数据验证
  this.dataFormat = function (data, update) {
    var o = {},
      err = [];
    for (var key in (update ? data : this.schemas)) {
      //赋值
      if (key == '_id') {
        //continue;
      } else if (key == 'unitId' && data[key] != undefined && data[key] != null) {
        // o[key] = typeof data[key] == 'string' && !this.schemas[key].unCheckSQL ? this.checkSQL(data[key]) : data[key];
        o[key] = data[key]
      } else if(key == 'id' && update){
        //continue
      } else if(update && data[key] == undefined){
        //continue
      } else {
        if (this.schemas[key] && typeof this.schemas[key]) {
          // if (typeof data[key] == 'string') data[key] = this.schemas[key].unCheckSQL ? data[key] : this.checkSQL(data[key]);
          if (data[key] == undefined || data[key] == null) {
            if (this.schemas[key].defaultValue != undefined) o[key] = this.schemas[key].defaultValue;
          } else {
            o[key] = data[key];
          }
          //新增、修改触发器
          if(this.schemas[key].trigger){
            if(update && this.schemas[key].trigger.update){
              o[key] = this.schemas[key].trigger.update.call(null,o[key],$)
            }else if(this.schemas[key].trigger.insert){
              o[key] = this.schemas[key].trigger.insert.call(null,o[key],$)
            }
          }
          //验证
          if (this.schemas[key].rule) {
            if (!this.schemas[key].rule.NotNull && !$.Verify.NotNull(o[key])[0]) {
              //无需验证为空 但为空的情况
            } else {
              for (var k in this.schemas[key].rule) {
                var _rule = this.schemas[key].rule[k];
                if (_rule != false) {
                  var v = $.Verify[k](o[key], _rule);
                  if (!v[0]) err.push(this.schemas[key].label + v[1]);
                }
              }
            }
          }
        }
      }
      if(!this.schemas[key]) continue;
      if(/^(sort|state|level|createTime|updateTime)$/.test(key)
        || this.schemas[key].type == 'switch' 
        || (this.schemas[key].data_type && this.schemas[key].data_type.indexOf('INT') > -1)
        || (this.schemas[key].attr && this.schemas[key].attr.type == 'number')  
        || (this.schemas[key].rule && (this.schemas[key].rule.PositiveInt 
          || this.schemas[key].rule.PositiveNum))){
        if(typeof o[key] == 'string') o[key] = -(-o[key]);
      }
    }
    if (err.length == 0) {
      return o;
    } else {
      return {
        errorMsg: err.join(',')
      };
    }
  }
  //新增
  this.insert = function (data, fn, args) {
    data.id = !data.id ? $.snowflake() : data.id;
    data = this.dataFormat(data);
    let now = new Date();
    data.createTime = !data.createTime ? now.getTime() : data.createTime;
    data.createTimeString = $.date(data.createTime).toLocalString();
    data.state = 1;
    if(Config && Config.unitId && !data.unitId) data.unitId = Config.unitId;
    if (!data.errorMsg) {
      return this.db.insert(this.name, data, typeof fn == 'function' ? function (ret) {
        if (!ret.errorMsg) {
          //data._id = ret.insertedIds ? ret.insertedIds[0] : ret.insertId;
          data.id = data.id
          fn(data);
        } else {
          fn(ret);
        }
      } : fn);
    } else {
      if (typeof fn == 'function') fn(data);
    }
  }
  ///2版本 支持Promise
  this.insertSync = function(data, args){
    return new Promise(next => {
      this.insert(data, next, args)
    })
  }
  this.insertDB = function (database, data, fn, args) {
    data = this.dataFormat(data);
    data.id = !data.id ? $.snowflake() : data.id;
    let now = new Date();
    data.createTime = !data.createTime ? now.getTime() : data.createTime;
    data.createTimeString = $.date(data.createTime).toLocalString();
    data.state = 1;
    if(Config && Config.unitId && !data.unitId) data.unitId = Config.unitId;
    if (!data.errorMsg) {
      return this.db.insert(this.name, data, typeof fn == 'function' ? (ret) => {
        if (!ret.errorMsg) {
          //data._id = ret.insertedIds ? ret.insertedIds[0] : ret.insertId;
          data.id = data.id.toString()
          fn(data);
        } else {
          fn(ret);
        }
      } : fn, database);
    } else {
      if (typeof fn == 'function') fn(data);
    }
  }
  this.emptyQuery = function (query) {
    var isEmpty = true;
    for (var _key in query) {
      if (query[_key]) {
        isEmpty = false;
        break;
      }
    }
    return isEmpty;
  }
  //更新
  this.update = function (query, data, fn, args) {
    data = this.emptyQuery(query) ? {errorMsg: '不能进行无条件更新!'} : this.dataFormat(data, true);
    if (!data.errorMsg) {
      let now = new Date();
      data.updateTime = !data.updateTime ? now.getTime() : data.updateTime;
      data.updateTimeString = $.date(now).toLocalString();
      delete data.id;
      return this.db.update(this.name, this.queryFormat(query), data, fn, args);
    } else {
      if (typeof fn == 'function') fn(data);
    }
  }
  ///2版本 支持Promise
  this.updateSync = function(query, data, args){
    return new Promise(next => {
      this.update(query, data, next, args)
    })
  }
  this.updateDB = function (database, query, data, fn, args) {
    data = this.emptyQuery(query) ? {errorMsg: '不能进行无条件更新!'} : this.dataFormat(data, true);
    if (!data.errorMsg) {
      let now = new Date();
      data.updateTime = !data.updateTime ? now.getTime() : data.updateTime;
      data.updateTimeString = $.date(now).toLocalString();
      delete data.id;
      return this.db.update(this.name, this.queryFormat(query), data, fn, args, database);
    } else {
      if (typeof fn == 'function') fn(data);
    }
  }
  //删除
  this.remove = function (query, fn, args) {
    if (this.emptyQuery(query)) {
      var data = {errorMsg:'不能进行无条件删除!'};
      if(typeof fn == 'function') fn(data);
      return data;
    }
    if (args && args.real) {
      return this.db.remove(this.name, this.queryFormat(query, true), fn, args);
    } else {
      return this.db.update(this.name, this.queryFormat(query, true), {
        state: 0
      }, fn, args);
    }
  }
  ///2版本 支持Promise
  this.removeSync = function(query, args){
    return new Promise(next => {
      this.remove(query, next, args)
    })
  }
  this.removeDB = function (database, query, fn, args) {
    if(this.emptyQuery(query)) {
      var data = {errorMsg:'不能进行无条件删除!'};
      if(typeof fn == 'function') fn(data);
      return data;
    }
    args = args || {};
    if (args.real) {
      return this.db.remove(this.name, this.queryFormat(query, true), fn, args, database);
    } else {
      return this.db.update(this.name, this.queryFormat(query, true), {
        state: 0
      }, fn, args, database);
    }
  }
  //更新表结构
  this.createTable = function(next){
    this.db.createTable(this.name,this.schemas,next)
  }
  this.createTableSync = function(){
    return new Promise(next => {
      this.createTable(next)
    })
  }
}
module.exports = Model;