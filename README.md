# weeCTF — Beginner Capture The Flag

Welcome to **wee CTF**! This is a beginner-friendly Capture The Flag challenge where you’ll learn the basics of web and forensics hacking while having fun.

---

## 🧩 What’s Inside

This CTF has **7 flags** hidden across different parts of a small web app. You’ll face challenges related to:

* 🕵️‍♂️ Directory Enumeration
* 💉 SQL Injection (SQLi)
* 🍪 Cookie Tampering
* 🔐 Password Brute Forcing
* 🖼️ Steganography (Hidden data in images)
* 🧠 Source Code Exploration

---

## 🏁 Flag List

| Flag                    | Location                           | Points    |
| ----------------------- | ---------------------------------- | --------- |
| `ORL{o0paDhZRuaAcaSai}` | Page Source                        | 5         |
| `ORL{xrR0UfF9zVQR7s2j}` | robots.txt (Base64 encoded)        | 10        |
| `ORL{ZzwQLnLSdMt9GEgP}` | Hidden directory (/backup)         | 10        |
| `ORL{s0kQc9cgHezyOY9b}` | Login (SQLi or brute force)        | 20        |
| `ORL{T18NO67HEHG6LH1O}` | ZIP File (brute force password)    | 20        |
| `ORL{K82P1LVTRBSZX2AS}` | Steganography Image                | 30        |
| `ORL{n6YgeIjcNDnYT5yF}` | Cookie modification (Admin delete) | 30        |

**Total Points:** 125

---

## ▶️ Run the CTF Box

**Using Node.js:**

```bash
cd ctf-box
npm install
node app.js
```

App runs on: [http://localhost:3000](http://localhost:3000)

**Using Docker:**

```bash
cd ctf-box
docker build -t wee-ctf .
docker run -p 3000:3000 wee-ctf
```

---

## 🧠 Helpful Wordlists

Provide these to players:

*  `login-passwords.txt` — for login brute forcing
*  `zip-passwords.txt` — for ZIP cracking
*  `dirs.txt` — for directory enumeration

---

## 💻 Flag Submission Platform

The platform has **two parts:**

| Player Side    | Admin Side    |
| -------------- | ------------- |
| Port: 8080     | Port: 8085    |

### Run Player Side

```bash
cd flag-platform/player-side
npm install
node app.js
```

### Run Admin Side

```bash
cd flag-platform/admin-side
npm install
node app.js
```

Use `pm2 start app.js --name <App_Name>` for background running.

---

## 🔐 Admin Login

| Username   | Password         | Access      |
| ---------- | ---------------- | ----------- |
| admin      | KUTsUPGm         | Limited     |
| superadmin | 3VHgBJzpzL1hH6HX | Full access |

---

## 🔄 Resetting the CTF

To reset the DB:

1. Go to `not_in_ctf/`
2. Copy the backup DB file
3. Replace the current database file

---

## 🏆 Have Fun!

Enjoy solving the wee CTF! 🥳
