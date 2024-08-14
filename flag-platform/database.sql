CREATE DATABASE ctf;
USE ctf;

CREATE TABLE IF NOT EXISTS players (
    username VARCHAR(255) PRIMARY KEY,
    password VARCHAR(255),
    full_name VARCHAR(255),
    ctf_url VARCHAR(255),
    program VARCHAR(255),
    total_points INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS flags (
    flag VARCHAR(255) PRIMARY KEY,
    detail VARCHAR(255),
    points INT
);

CREATE TABLE IF NOT EXISTS player_flags (
    username VARCHAR(255),
    flag VARCHAR(255),
    FOREIGN KEY (username) REFERENCES players(username),
    FOREIGN KEY (flag) REFERENCES flags(flag)
);
