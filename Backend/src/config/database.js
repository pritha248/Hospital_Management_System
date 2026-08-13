// const mysql = require("mysql2");
// require("dotenv").config();

// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// module.exports = pool.promise();


const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const poolConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

if (process.env.DB_SSL === "true") {
  const caFromEnv = process.env.DB_SSL_CA;

  if (!caFromEnv) {
    throw new Error(
      "DB_SSL=true but DB_SSL_CA is not configured."
    );
  }

  let ca;

  // If DB_SSL_CA is a file path, read the certificate from the file.
  if (
    !caFromEnv.includes("BEGIN CERTIFICATE") &&
    fs.existsSync(path.resolve(caFromEnv))
  ) {
    ca = fs.readFileSync(path.resolve(caFromEnv), "utf8");
  } else {
    // Otherwise treat DB_SSL_CA as the certificate itself.
    ca = caFromEnv.replace(/\\n/g, "\n");
  }

  poolConfig.ssl = {
    ca,
    rejectUnauthorized: true
  };
}

const pool = mysql.createPool(poolConfig);

module.exports = pool.promise();