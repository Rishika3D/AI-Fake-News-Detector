CREATE TABLE history (
    id SERIAL PRIMARY KEY,
    user_id INT,
    input_type VARCHAR(20) NOT NULL,    -- 'url' or 'pdf'
    input_value TEXT NOT NULL,
    result VARCHAR(20) NOT NULL,
    confidence_score FLOAT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE history
ADD CONSTRAINT fk_user
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE SET NULL;

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    original_filename VARCHAR(255),
    file_path TEXT NOT NULL,            -- location where PDF is saved
    extracted_text TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);