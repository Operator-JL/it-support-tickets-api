const sql = require('mssql');
require('dotenv').config();

const rawServer = process.env.DB_SERVER || 'localhost';
const [server, instanceName] = rawServer.split('\\');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

if (instanceName) {
  dbConfig.options.instanceName = instanceName;
}

let pool;

const getConnection = async () => {
  if (pool) {
    return pool;
  }

  pool = await sql.connect(dbConfig);
  return pool;
};

module.exports = {
  sql,
  getConnection
};
