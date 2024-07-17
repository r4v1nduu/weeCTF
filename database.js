const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('blog.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE users (
      username VARCHAR(255) PRIMARY KEY,
      password VARCHAR(255) NOT NULL,
      flag VARCHAR(255),
      flag_seen BOOLEAN DEFAULT FALSE
    )
  `);

  db.run(`
    CREATE TABLE posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      user_name VARCHAR(255) NOT NULL,
      image_url VARCHAR(255),
      FOREIGN KEY (user_name) REFERENCES users(username)
    )
  `);

  db.run(`
    CREATE TABLE comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      content TEXT NOT NULL,
      user_name VARCHAR(255),
      post_id INT,
      FOREIGN KEY (user_name) REFERENCES users(username),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    )
  `);

  db.run(`
    INSERT INTO users (username, password, flag, flag_seen)
    VALUES  ('newuser01', 'ijQnTOzw', NULL, TRUE),
            ('newuser02', 'T6IGn3cm', 'ORL{s0kQc9cgHezyOY9b}', FALSE),
            ('olduser01', 'zCLyXGkk', NULL, TRUE),
            ('ravindu47', 'bbZIBtX9', 'ORL{n6YgeIjcNDnYT5yF}', FALSE);
  `);
});

db.close();