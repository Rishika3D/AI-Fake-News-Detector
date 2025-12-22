-- 1. Reset Database (Start Fresh)
DROP TABLE IF EXISTS history;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS users;

-- 2. Create Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create History Table
-- Matches your Node.js code: (url, result, confidence, created_at)
CREATE TABLE history (
    id SERIAL PRIMARY KEY,
    user_id INT,               -- NULL allowed for anonymous users
    url TEXT,                  -- Stores the link analyzed
    result TEXT,               -- Stores the label (e.g., "Real", "Fake")
    confidence FLOAT,          -- Stores the AI score (e.g., 0.98)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_user
      FOREIGN KEY (user_id) 
      REFERENCES users(id) 
      ON DELETE SET NULL
);

-- 4. Create Documents Table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    original_filename VARCHAR(255),
    file_path TEXT NOT NULL,
    extracted_text TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);