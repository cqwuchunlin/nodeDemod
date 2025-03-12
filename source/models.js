var $ = require('./tool');
module.exports = {
  configuration: {
    TABLE_NICK_NAME:'系统配置',
    type: {
      label: '类型',
      defaultValue: 'business',
      attr: {
        actions: [{
          value: 'system',
          name: '系统'
        },
        {
          value: 'business',
          name: '业务'
        },
        {
          value: 'other',
          name: '其他'
        }
        ]
      },
      type: 'select'
    },
    id: {
      label: '编号',
      data_type:'varchar(255)',
      type: 'input'
    },
    name: {
      label: '名称',
      rule: {
        NotNull: true
      },
      type: 'input'
    },
    value: {
      label: '值',
      type: 'input'
    },
    desoptions: {
      label: '描述',
      type: 'textarea',
      unList: true,
      data_type: 'LONGTEXT'
    },
    sort: {
      label: '排序',
      attr: {
        type: 'input'
      },
      type: 'input'
    }
  },
  user: {
    TABLE_NICK_NAME:'系统用户管理',
    openId: {
      label: '',
      data_type: 'VARCHAR(255) UNIQUE'
    },
    photo: {
      label: '头像',
      attr: {
        width: 300,
        height: 300,
        radius: 150
      },
      type: 'image'
    },
    userName: {
      label: '登录用户名',
      rule: {
        NotNull: true,
      //  Regx: '^[a-zA-Z0-9_]{5,12}$_gmi_g_gmi_应该由5-12位数字、大小写字母或下划线组成'
      },
      data_type: 'VARCHAR(255) UNIQUE NOT NULL'
    },
    passWord: {
      label: '',
      defaultValue: $.MD5('123456'),
      rule: {
        NotNull: true
      },
      unModel: true //静止应用于前台
    },
    nickName: {
      label: '昵称',
      type: 'input'
    },
    name: {
      label: '姓名',
      type: 'input'
    },
    sex: {
      label: '性别',
      defaultValue: 1,
      type: 'radio',
      attr: {
        actions: [{
          value: 1,
          name: '男'
        },
        {
          value: 2,
          name: '女'
        }
        ]
      }
    },
    phone: {
      label: '手机号',
      rule: {
        Phone: true
      },
      type: 'input',
      attr: {
        type: 'tel',
        placeholder: '请输入手机号'
      }
    },
    IDCard: {
      label: '身份证',
      rule: {
        IDCard: true
      },
      type: 'input'
    },
    brisday: {
      label: '生日',
      type: 'date'
    },
    address: {
      label: '地址',
      type: 'textarea'
    },
    status: {
      label: '是否启用',
      defaultValue: 1,
      type: 'switch'
    }
  },
  unit: {
    TABLE_NICK_NAME:'单位管理',
    TABLE_DESC:'用于数据隔离',
    unitId: {
      label: '编号'
    },
    level: {
      label: '层级',
      rule: {
        PositiveInt: true,
        NotNull: true
      }
    },
    sort: {
      label: '排序',
      attr: {
        type: 'number'
      },
      type: 'input'
    },
    parentUnitId: {
      label: '父单位'
    },
    name: {
      label: '单位名称',
      rule: {
        NotNull: true
      },
      type: 'input'
    },
    image: {
      label: 'LOGO',
      attr: {
        width: 500,
        height: 500
      },
      type: 'image'
    },
    authorzation: {
      label: '授权码'
    }
  },
  menu: {
    TABLE_NICK_NAME:'菜单管理',
    TABLE_DESC:'管理后台菜单',
    id: {
      label: '编号',
      data_type:'VARCHAR(50) NOT NULL UNIQUE'
    },
    level: {
      label: '层级',
      rule: {
        PositiveInt: true,
        NotNull: true
      }
    },
    name: {
      label: '名称',
      rule: {
        NotNull: true
      },
      type: 'input'
    },
    sort: {
      label: '权重',
      attr: {
        type: 'number'
      },
      rule: {
        NotNull: true,
        PositiveInt: true
      },
      type: 'input'
    },
    img: {
      label: '图片'
    },
    url: {
      label: '链接地址',
      type: 'input',
      //attr:{placeholder:'示例:/pages/model/list?modelName=user&title=用户表&searchKey=name,nickName'},
      attr: {
        placeholder: '有子菜单不用填写'
      },
      style: 'clear:both;height:auto;width:90%;'
    },
    parentId: {
      label: '上级菜单',
      data_type:'bigint'
    },
    status: {
      label: '是否启用',
      defaultValue: 1,
      type: 'switch'
    },
    editAble: {
      label: '能否编辑',
      defaultValue: 1,
      unList: true
    }
  },
  group: {
    TABLE_NICK_NAME:'权限管理',
    TABLE_DESC:'权限组',
    id: {
      label: '编号',
      data_type:'VARCHAR(50) NOT NULL UNIQUE'
    },
    name: {
      label: '名称',
      rule: {
        NotNull: true
      },
      type: 'input'
    },
    desoptions: {
      label: '描述',
      type: 'textarea'
    },
    status: {
      label: '启用',
      defaultValue: 1,
      type: 'switch'
    }
  },
  group_menu: {
    TABLE_DESC:'群组菜单关系表',
    groupId: {
      label: '群组编号',
      rule: {
        NotNull: true
      }
    },
    menuId: {
      label: '菜单编号',
      rule: {
        NotNull: true
      }
    }
  },
  group_user: {
    TABLE_DESC:'群组用户关系表',
    groupId: {
      label: '群组编号',
      rule: {
        NotNull: true
      }
    },
    userId: {
      label: '用户编号',
      rule: {
        NotNull: true
      }
    }
  },
  session: {
    TABLE_NICK_NAME:'登录日志',
    TABLE_DESC:'未启用Redis的情况下记录登录数据',
    id: {
      label: 'token',
      data_type:'VARCHAR(50) NOT NULL UNIQUE'
    },
    session_key: {
      label: '会话密钥'
    },
    userId: {
      label: ''
    },
    userName: {
      label: '用户账号'
    },
    type: {
      label: '登录类型',
      attr: {
        actions: [{
          name: '管理端登录',
          value: 1
        },
        {
          name: '应用端登录',
          value: 2
        },
        {
          name: 'API登录',
          value: 3
        }
        ]
      }
    },
    address: {
      label: '地址'
    },
    platform: {
      label: '登录平台'
    },
    inTime: {
      label: '登录时间'
    },
    outTime: {
      label: '退出时间'
    },
    createTime: {
      label: ''
    },
    updateTime: {
      label: ''
    }
  },
  file: {
    TABLE_NICK_NAME:'文件管理',
    TABLE_DESC:'文件记录表',
    filename: {
      label: '名称'
    },
    mimetype: {
      label: '类型'
    },
    originalname: {
      label: '原名称'
    },
    size: {
      label: '大小',
      rule: {
        PositiveInt: true
      }
    },
    authorization: {
      label: '是否需要授权',
      defaultValue: 0,
      type: 'switch'
    }
  },
  log: {
    TABLE_NICK_NAME:'日志管理',
    TABLE_DESC:'用户日志表',
    level: {
      label: '级别',
      attr: {
        actions: [{
          value: 1,
          name: '记录日志'
        },
        {
          value: 2,
          name: '错误日志'
        }
        ]
      },
      readOnly: true,
      defaultValue: 1,
      type: 'select'
    },
    type:{
      label:'类别',
      rule:{ NotNull:true },
      type:'input'
    },
    desoptions: {
      label: '描述',
      type:'input'
    },
    content: {
      label: '内容',
      attr:{ rows:30 },
      unCheckSQL:true,
      unList:true,
      data_type:'LONGTEXT',
      type:'textarea'
    }
  }
}