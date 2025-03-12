/*UNRES Add this annotation to the document let it is inaccessible*/
const mysql = require('mysql')
module.exports = function(config){
  return {
    pool:null,
    connect(fn, callBack) {
      if (!this.pool) {
        this.pool = mysql.createPool(Object.assign({
          connectionLimit:100,//一次创建的最大连接数量
          multipleStatements: true,
          charset:'utf8mb4',
          supportBigNumbers:true,
          bigNumberStrings:true
        }, config || Config.sql))
      }
      var _this = this,failTimes = 0;
      this.pool.getConnection((err,connection) => {
        if (err) {
          console.log('connection connect err', err);
          if(failTimes == 3){
            if(typeof callBack == 'function') callBack({errorMsg:'mysql connection connect err 3 times'})
          }else{
            failTimes ++;
            if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR' || err.code === 'ETIMEDOUT') {
              _this.connect(fn, callBack);
            }
          }
        }else{
          if (typeof fn == 'function') fn(connection);
        }
      })
    },
    _eval(s, fn,args) {
      let _this = this
      args = args || {}
      new Promise(next => {
        if(args.connection){
          next(args.connection)
        }else{
          this.connect(next,fn)
        }
      }).then(connection => {
        connection.query(s, (err, res) => {
          //db.end();
          //if(!args.connection) connection.release();
          if(!args.connection) {
            _this.pool.releaseConnection(connection);
          }
          if (err) {
            var errorMsg = err.sqlMessage || err.code || '数据库未知错误';
            console.log(`error sql:
            ${s}
            -------------------- 
            ${errorMsg}
            `);
            let returnErrorMsg = '访问数据出错'
            let reg = new RegExp(`^Duplicate entry '(.+)' for key '(.+)\.(.+)'$`)
            if(reg.test(errorMsg)) returnErrorMsg = errorMsg.replace(reg,'$1 已经存在')
            if (typeof fn == 'function') fn({
              errorMsg: returnErrorMsg
            });
          } else {
            if(args.logs) console.log(s,res);
            if (typeof fn == 'function') fn(res);
          }
        })
      })
    },
    ///2版本 支持Promise
    _evalSync(s, args){
      return new Promise(next => {
        this._eval(s, next,args)
      })
    },
    reName(name, database) {
      return (database || Config.sql.database) + '.' + name
    },
    queryToWhere(name, query) {
      var _rc = '';
  
      function stringify(key, value) {
        var rc = '',
          flog = 0;
        if (value && typeof value == 'object') {
          if (value.$gt != undefined) {
            rc += ' AND ' + name + '.' + key + '>' + value.$gt;
            flog++;
          }
          if (value.$gte != undefined) {
            rc += ' AND ' + name + '.' + key + '>=' + value.$gte;
            flog++;
          }
          if (value.$lt != undefined) {
            rc += ' AND ' + name + '.' + key + '<' + value.$lt;
            flog++;
          }
          if (value.$lte != undefined) {
            rc += ' AND ' + name + '.' + key + '<=' + value.$lte;
            flog++;
          }
          if (value.$ne != undefined) {
            rc += ' AND ' + name + '.' + key + '<>' + (typeof value.$ne === 'string' ? "'" + value.$ne + "'" : value.$ne);
            flog++;
          }
          if (value.$in) {
            value.$in = value.$in instanceof Array ? "'" + value.$in.join("','") + "'" : value.$in;
            rc += ' AND ' + name + '.' + key + ' IN (' + value.$in + ')';
          }
          if (value.$regex) {
            rc += ' AND ' + name + '.' + key + " REGEXP '" + value.$regex + "'";
            flog++;
          }
        } else if(value == 'IS NOT NULL' || value == 'ISNOTNULL'){
          rc += ' AND ' + name + '.' + key + ' IS NOT NULL';
          flog++;
        } else if(value == 'IS NULL' || value == 'ISNULL'){
          rc += ' AND ' + name + '.' + key + ' IS NULL';
          flog++;
        } else {
          rc += ' AND ' + name + '.' + key + '=' + (typeof value === 'string' ? "'" + value + "'" : value);
          flog++;
        }
        rc = rc.replace(' AND ', '');
        return flog === 1 ? rc : ('(' + rc + ')');
      }
      for (var key in query) {
        if (key == 'pageNum' || key == 'pageSize') continue;
        var flog = '=',
          value = query[key];
        if (key === '$or') {
          var _orString = '';
          for (var i = 0; i < value.length; i++) {
            var orString = '',
              num = 0;
            for (var k in value[i]) {
              orString += ' AND ' + stringify(k, value[i][k]);
              num++
            }
            orString = orString.replace(' AND ', '');
            if (num == 1) {
              _orString += ' OR ' + orString + '';
            } else {
              _orString += ' OR (' + orString + ')';
            }
          }
          _rc += ' AND (' + _orString.replace(' OR ', '') + ')';
        } else {
          _rc += ' AND ' + stringify(key, value);
        }
      }
      return _rc && _rc != '()' ? ' WHERE ' + _rc.replace(' AND ', '') : '';
    },
    projectionToRows(name, projection) {
      var _rc = '';
      if (projection) {
        for (var key in projection) {
          _rc += ',' + name + '.' + key;
          if (typeof projection[key] === 'string') _rc += ' AS ' + projection[key];
        }
      }
      return _rc.replace(',', '') || (name + '.*');
    },
    projectionToJoin(name, join, database) {
      var alias = '',
        leftword = '',
        wherewolds = '';
      for (var key in join) {
        key = join[key].id || key;
        var tablename = this.reName(join[key].name, database),
          projection = join[key].projection,
          type = join[key].type || 'LEFT';
        leftword += ' ' + type + ' JOIN ' + tablename + ' ON ' + (join[key].base || name) + '.' + key + '=' + tablename + '.' + (join[key].key || 'id');
        if (join[key].query) {
          var queryWhere = this.queryToWhere(tablename, join[key].query).replace(' WHERE', '');
          if (queryWhere) wherewolds += ' AND ' + queryWhere;
        }
        if (!projection) {
          projection = Config.models[tablename];
          for (var k in projection) {
            alias += ',' + tablename + '.' + k;
            alias += ' AS ' + tablename + '_' + k;
          }
        } else {
          for (var k in projection) {
            alias += ',' + tablename + '.' + k;
            if (typeof projection[k] === 'string') alias += ' AS ' + projection[k];
          }
        }
      }
      return [alias, leftword, wherewolds];
    },
    find(name, query, fn, args, database) {
      args = args || {};
      name = this.reName(name, database);
      var projectionToJoin = this.projectionToJoin(name, args.join, database);
      var wherewolds = this.queryToWhere(name, query);
      if (projectionToJoin[1]) wherewolds = projectionToJoin[1] + wherewolds;
      if (projectionToJoin[2]) wherewolds += projectionToJoin[2];
      this._eval('SELECT ' + this.projectionToRows(name, args.projection) + projectionToJoin[0] + ' FROM ' + name + wherewolds + ' LIMIT 1', res => {
        if (!res.errorMsg) {
          if (typeof fn == 'function') fn(res instanceof Array && res.length > 0 ? res[0] : {
            errorMsg: '未找到记录',
            nodata: true
          });
        } else {
          if (typeof fn == 'function') fn(res);
        }
      },args)
    },
    list(name, query, fn, args, database) {
      args = args || {};
      name = this.reName(name, database);
      var limitwords = !args.limit ? '' : (' LIMIT ' + args.limit + ' OFFSET ' + (args.skip || 0));
      var sortwords = '';
      if (args.sort) {
        for (var key in args.sort) sortwords += ' ,' + key + (args.sort[key] === -1 ? ' DESC' : '');
        if (sortwords) sortwords = ' ORDER BY ' + sortwords.replace(' ,', '');
      }
      var projectionToJoin = this.projectionToJoin(name, args.join, database);
      var wherewolds = this.queryToWhere(name, query);
      if (projectionToJoin[1]) wherewolds = projectionToJoin[1] + wherewolds;
      if (projectionToJoin[2]) wherewolds += projectionToJoin[2];
      var groupwolds = args.group ? ' GROUP BY ' + args.group : '';
      if (query.pageNum || query.pageSize) {
        query.pageSize = query.pageSize || 10;
        query.pageNum = query.pageNum || 1;
        var totalSql = 'SELECT COUNT(*) AS total FROM ' + name + wherewolds + groupwolds;
        limitwords = ' LIMIT ' + query.pageSize + ' OFFSET ' + query.pageSize * (query.pageNum - 1);
        var rowsSql = 'SELECT ' + this.projectionToRows(name, args.projection) + projectionToJoin[0] + ' FROM ' + name + wherewolds + groupwolds + sortwords + limitwords
        this._eval(rowsSql + ';' + totalSql, res => {
          if(typeof fn == 'function'){
            fn(res.errorMsg ? res : {
              total: res[1] ? res[1][0].total : 0,
              rows: res[0]
            })
          }else{
            throw res;
          }
        },args);
      } else {
        var sql = 'SELECT ' + this.projectionToRows(name, args.projection) + projectionToJoin[0] + ' FROM ' + name + wherewolds + groupwolds + sortwords + limitwords;
        if (typeof fn != 'function') {
          return sql;
        } else {
          this._eval(sql, fn,args);
        }
      }
    },
    functions: function (name, options, fn, query, args, database) {
      args = args || {};
      name = this.reName(name, database);
      options = options || [{
        id: '*',
        type: 'count',
        as: ''
      }];
      if (!(options instanceof Array)) options = [options];
      var optionsString = '';
      for (var i = 0; i < options.length; i++) {
        var option = typeof options[i] == 'string' ? {
          id: '*',
          type: options[i]
        } : options[i];
        optionsString += (option.type + '(' + (option.id || option._id) + ')' + (option.as ? ' AS ' + option.as : ''));
      }
      var sortwords = '';
      if (args.sort) {
        for (var key in args.sort) sortwords += ' ,' + key + (args.sort[key] === -1 ? ' DESC' : '');
        if (sortwords) sortwords = ' ORDER BY ' + sortwords.replace(' ,', '');
      }
      var limitwords = !args.limit ? '' : (' LIMIT ' + args.limit + ' OFFSET ' + (args.skip || 0));
      var projectionToJoin = this.projectionToJoin(name, args.join, database);
      var wherewolds = this.queryToWhere(name, query);
      if (projectionToJoin[1]) wherewolds = projectionToJoin[1] + wherewolds;
      if (projectionToJoin[2]) wherewolds += projectionToJoin[2];
      var groupwolds = args.group ? ' GROUP BY ' + args.group : '';
      var sql = 'SELECT ' + optionsString + ' FROM ' + name + wherewolds + groupwolds + sortwords + limitwords;
      if (typeof fn != 'function') {
        return sql;
      } else {
        this._eval(sql, fn,args);
      }
    },
    insert: function (name, data, fn, args, database) {
      args = args || {};
      name = this.reName(name, database);
      var rows = '',
        values = '';
      for (var key in data) {
        if (data[key] == undefined || data[key] == null || data[key] === '') continue;
        rows += ',' + key;
        //values += ',"' + data[key] + '"';
        if(/"/.test(data[key])){
          values += ",'" + data[key] + "'";
        }else{
          values += ",\"" + data[key] + "\"";
        }
      }
      var sql = 'INSERT INTO ' + name + ' ' + '(' + rows.replace(',', '') + ') VALUES (' + values.replace(',', '') + ');';
      if (typeof fn != 'function') {
        return sql;
      } else {
        this._eval(sql, fn,args);
      }
    },
    update: function (name, query, data, fn, args, database) {
      args = args || {};
      name = this.reName(name, database);
      args.multi = args.multi == undefined ? true : args.multi; //条数.默认全部
      var values = '';
      //for(var key in data) values += ',' + key + '="' + data[key] + '"';
      for (var key in data) {
        if(data[key] === ''){
          values += ',' + key + "=null";
        }else{
          if(/"/.test(data[key])){
            values += ',' + key + "='" + data[key] + "'";
          }else{
            values += ',' + key + "=\"" + data[key] + "\"";
          }
        }
      }
      var limitwords = !args.limit ? '' : (' LIMIT ' + args.limit + ' OFFSET ' + (args.skip || 0));
      var sql = 'SET SQL_SAFE_UPDATES = 0;UPDATE ' + name + ' SET ' + values.replace(',', '') + this.queryToWhere(name, query) + limitwords + ';SET SQL_SAFE_UPDATES = 1;';
      if (typeof fn != 'function') {
        return sql;
      } else {
        this._eval(sql, fn,args);
      }
    },
    remove: function (name, query, fn, args, database) {
      args = args || {}
      name = this.reName(name, database);
      var limitwords = !args.limit ? '' : (' LIMIT ' + args.limit + ' OFFSET ' + (args.skip || 0));
      var sql = 'SET SQL_SAFE_UPDATES = 0;DELETE FROM ' + name + this.queryToWhere(name, query) + limitwords + ';SET SQL_SAFE_UPDATES = 1;';
      if (typeof fn != 'function') {
        return sql;
      } else {
        this._eval(sql, fn,args);
      }
    },
    jsSave: function (id, value, fn, args) {
      this._eval('CREATE PROCEDURE ' + id + value, fn,args)
    },
    jsLoad: function (s, fn,args) {
      this._eval('CALL ' + s, fn,args)
    },
    dropIndex:function(next,tablename,database){
      database = database || Config.sql.database;
      let dropIndexSql = `SELECT CONCAT('ALTER TABLE _ZWF',i.TABLE_NAME,'ZWF_ DROP INDEX ',i.INDEX_NAME,' ;') AS dropSql
      FROM INFORMATION_SCHEMA.STATISTICS i
      WHERE TABLE_SCHEMA = '${database}' AND i.INDEX_NAME <> 'PRIMARY'`;
      if(tablename) {
        dropIndexSql += ` AND i.TABLE_NAME = '${tablename}';`;
      }else{
        dropIndexSql += ';';
      }
      this._eval(dropIndexSql,ret => {
        let dropIndexs = '';
        for(let i = 0; i < ret.length; i ++) {
          dropIndexs += ret[i].dropSql.replace(/_ZWF(.+)ZWF_/,database + '.$1');
        }
        if(dropIndexs){
          this._eval(dropIndexs,next)
        }else{
          next({})
        }
      })
    },
    creatCol(key,model){
      let rc = '',defalutType = 'VARCHAR(255)'
      if(model.type == 'title') return
      var data_type = model.data_type || ''
      // if (key == '_id' && !data_type) data_type = 'BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY';
      // if (key == 'id' && !data_type) data_type = 'BIGINT NOT NULL UNIQUE';
      // if (key == '_id' && !data_type) data_type = 'BIGINT NOT NULL AUTO_INCREMENT';
      if (key == 'id' && !data_type) data_type = 'BIGINT NOT NULL UNIQUE PRIMARY KEY';
      model.rule = model.rule || {};
      if (!data_type) {
        var datatype = model.rule.PositiveNum ? 'DOUBLE' : (model.rule.PositiveInt ? 'INT' : defalutType);
        if(/sort|state|level|status/.test(key)
          || model.type == 'switch' 
          || (model.attr && model.attr.type == 'number')){
          datatype = 'INT';
        }else if(model.type == 'datetime'){
          datatype = 'BIGINT';
        }
        data_type += datatype;
        if (model.rule.NotNull) data_type += ' NOT NULL';
      }
      if (/file|editor|table|form|mappolygon/.test(model.type)) {
        data_type = 'LONGTEXT';
      }else if(/image/.test(model.type) && model.attr && model.attr.limit > 2){
        data_type = 'LONGTEXT';
      }
      rc = key + ' ' + (data_type || defalutType);
      ///唯一
      if(model.unique) rc += ' UNIQUE';
      ///默认值
      if(model.defaultValue){
        if(/^[0-9]*$/.test(model.defaultValue)){
          rc += ' DEFAULT ' + model.defaultValue;
        }else{
          rc += ' DEFAULT "' + model.defaultValue + '"';
        }
      }
      ///描述
      let desc = model.desc || model.label || ''
      if(desc) rc += ' COMMENT "' + desc + '"';
      if(model.attr && model.attr.actions){
        let descs = []
        for(let i = 0; i < model.attr.actions.length;i ++){
          let item = model.attr.actions[i]
          descs.push(`${item.name}:${item.value}`)
        }
        if(descs.length) desc += ` ${descs.join(',')}`
      }
      return rc
    },
    createTable: function (_name, models, fn, database) {
      var name = this.reName(_name, database);
      var rows = {},indexs = {};
      for (var key in models) {
        let col = this.creatCol(key,models[key])
        if(!col) continue
        rows[key] = col
        ///索引
        if (models[key].index) {
          let indexName = typeof models[key].index == 'string' ? models[key].index : ('IDX_' + key)
          if(!indexs[indexName]) indexs[indexName] = []
          indexs[indexName].push(key)
        }
        //if (models[key].index) indexs.push(',INDEX ' + (typeof models[key].index == 'string' ? models[key].index : ('IDX_' + key)) + '(' + key + ')')
      }
      this._eval('DESC ' + name + ';',ret => {
        var createSql = '';
        if(ret.errorMsg){
          createSql += 'CREATE TABLE ' + name + '(';
          for(var key in rows) createSql += ',' + rows[key];
          for(var key in indexs) createSql += ',INDEX ' + key + '(' + indexs[key].join(',') +')';
          createSql += ')';
          createSql = createSql.replace(',', '');
          this._eval(createSql, fn);
        }else{
          var retObj = {};
          createSql += 'ALTER TABLE ' + name + ' ';
          for(var i = 0; i < ret.length; i ++) retObj[ret[i].Field] = ret[i];
          for(var key in rows){
            if(retObj[key]){
              if(key != 'id') {
                // createSql += ',CHANGE COLUMN ' + key + ' ' + rows[key];
                createSql += ',MODIFY COLUMN ' + rows[key];
              }
            }else{
              createSql += ',ADD COLUMN ' + rows[key];
            }
          }
          for(var key in indexs) createSql += ',ADD INDEX ' + key + '(' + indexs[key].join(',') +')';
          // createSql += ' COMMENT = "' + (models.nickName || models.desc || '') + '"'
          createSql = createSql.replace(',', '');
          // console.log(createSql)
          this.dropIndex(ret => {
            this._eval(createSql, fn)
          },_name,database)
        }
      })
    }
  }
}