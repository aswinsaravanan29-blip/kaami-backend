const mysql = require('mysql2/promise');
const { URL } = require('url');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Error: DATABASE_URL is not defined in environment variables.");
  process.exit(1);
}

let pool;
try {
  const parsedUrl = new URL(dbUrl);
  
  pool = mysql.createPool({
    host: parsedUrl.hostname,
    port: parsedUrl.port || 3306,
    user: parsedUrl.username,
    password: parsedUrl.password,
    database: parsedUrl.pathname.substring(1) || 'defaultdb',
    ssl: {
      rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  console.log("Database connection pool initialized.");
} catch (error) {
  console.error("Failed to parse DATABASE_URL or initialize connection pool:", error);
  process.exit(1);
}

module.exports = pool;
