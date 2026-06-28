const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Check & initialize database tables
async function initializeDatabase() {
  try {
    console.log("Checking and initializing database tables...");
    
    // 1. users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. profiles table
    await db.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        user_id INT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        profession VARCHAR(255) NOT NULL,
        theme_mode VARCHAR(255) DEFAULT 'modern',
        bio TEXT,
        availability VARCHAR(255) DEFAULT 'open-roles',
        checked_tasks TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. projects table
    await db.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        tech_stack TEXT,
        link VARCHAR(255),
        year VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Verified',
        stars VARCHAR(50) DEFAULT '0',
        forks VARCHAR(50) DEFAULT '0',
        visits VARCHAR(50) DEFAULT '0',
        proof_count INT DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. certificates table
    await db.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        issuer VARCHAR(255) NOT NULL,
        credential_id VARCHAR(255),
        issue_date VARCHAR(100),
        verified TINYINT DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 5. testimonials table
    await db.query(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        author VARCHAR(255) NOT NULL,
        role VARCHAR(255),
        quote TEXT NOT NULL,
        verified TINYINT DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 6. inbox_items table
    await db.query(`
      CREATE TABLE IF NOT EXISTS inbox_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(255) NOT NULL,
        requester VARCHAR(255) NOT NULL,
        details TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        timestamp VARCHAR(255),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 7. activities table
    await db.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        text VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        timestamp VARCHAR(255),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    console.log("Database tables initialized successfully.");
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Kaami API is running' });
});

const PORT = process.env.PORT || 5000;

// Initialize DB and then start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
