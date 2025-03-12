module.exports = {
  port: 3001,
  router: {
    default: './admin/H5'
  },
  sql: {
    host: 'localhost',
    user: 'root',
    password: '871215',//ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'ssky2019+'
    database: 'mall',
    connectTimeout: 6000,
    multipleStatements: true
  },
  pem_cer:'./ssl/xcx.shengshikangyang.com.cer',
  pem_key:'./ssl/xcx.shengshikangyang.com.key',
  dataxCMD:'python /Users/yfly/Documents/git/DataX/target/datax/datax/bin/datax.py ',
}