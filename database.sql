CREATE DATABASE blog;
CREATE USER 'blogger'@'localhost' IDENTIFIED BY 'rHVHh9Rx';
GRANT ALL PRIVILEGES ON blog.* TO 'blogger'@'localhost';
FLUSH PRIVILEGES;

USE blog;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username 
    password VARCHAR(255) NOT NULL,
    flag VARCHAR(255),
    flag_seen BOOLEAN DEFAULT FALSE
);

CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    image_url VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    user_id INT,
    post_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id)
);



INSERT INTO users (username, password, flag, flag_seen)
VALUES ('newuser01', 'ijQnTOzw', NULL, TRUE),
       ('newuser02', 'T6IGn3cm', 'ORL{s0kQc9cgHezyOY9b}', FALSE),
       ('olduser01', 'zCLyXGkk', NULL, TRUE),
       ('ravindu47', 'bbZIBtX9', 'ORL{n6YgeIjcNDnYT5yF}', FALSE);
