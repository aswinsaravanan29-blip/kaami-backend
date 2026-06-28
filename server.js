const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Check & initialize database tables
async function initializeDatabase() {
  try {
    console.log("Checking and initializing database tables...");
    
    // Create users table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
