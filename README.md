# wee CTF

This is a complete Capture The Flag (CTF) challenge designed for beginners, featuring a flag submission platform.

## About the CTF

This CTF is ideal for beginners, focusing on well-known vulnerabilities such as Cross-Site Scripting (XSS), SQL Injection, and source code exposure. Participants will also need to demonstrate their knowledge of directory enumeration, brute forcing, steganography, and source code exploration.

The CTF includes a total of 7 flags to discover.

1. **robots.txt Flag**: There is a flag encoded with Base64 in the `robots.txt` file.
2. **Source Code Flag**: The main page's source code contains a hidden flag.
3. **Directory Enumeration Flag**: A flag can be found by performing directory enumeration and locating the `/backup` directory.
4. **Login Page Flag**: The username is exposed in the source code on the login page. Participants can exploit this vulnerability using SQL Injection or brute force the login.
5. **Admin Cookie Flag**: After logging in, players can modify the `isAdmin` cookie value to gain admin access, revealing a DELETE button for posts. Deleting any post will reward the player with a flag.
6. **Download Directory Flag**: In the `/Downloads` directory, there is a ZIP file. A flag can be obtained by downloading the ZIP file and brute-forcing its password.
7. **Steganography Flag**: After extracting the ZIP file, an image is revealed. Players can use steganography techniques to find the final flag hidden within the image.

## Flag Submission Platform

*Details about the Flag Submission Platform will be added here.*

## Setup CTF Box

### Flag Details

| Flag | Flag Details | Points |
|------|--------------|--------|
| ORL{n6YgeIjcNDnYT5yF} | Deleting a post (cookie modification) | 30 |
| ORL{K82P1LVTRBSZX2AS} | Steganography | 30 |
| ORL{T18NO67HEHG6LH1O} | ZIP file brute force | 20 |
| ORL{s0kQc9cgHezyOY9b} | Logging in as the user (SQLi or brute force) | 20 |
| ORL{xrR0UfF9zVQR7s2j} | From `robots.txt` (Base64 encoded) | 10 |
| ORL{ZzwQLnLSdMt9GEgP} | From an important-looking directory | 10 |
| ORL{o0paDhZRuaAcaSai} | From page source | 5 |
| N/A | ~~XSS vulnerability~~ | N/A |

**Important:** Provide the following resources to participants:
- A password list for login brute-forcing
- A password list for ZIP file brute-forcing
- A directory list for directory enumeration

### Run the CTF Box

#### Node.js
To run the CTF box using Node.js, execute the following commands. The application will run on port 3000.

```bash
cd ctf-box
node app.js
```

#### Docker
To create a Docker image and run the CTF box as a container, use the following commands:

```bash
cd ctf-box
docker build -t <your_image_name> .
docker run -p <port>:3000 <your_image_name>
```

### Additional Information

*To reset the database, copy the backup database from the "not_in_ctf" folder and rename it.*

*Some functionalities that were removed from the web application (post creation, account registration) are stored in the "not_in_ctf" folder.*

## Setup Flag Submission Platform

The flag submission platform includes two interfaces: one for the admin and one for the players.

### Run Flag Submission Platform

#### Node.js

The Admin Side will run on port 8085, and the Player Side will run on port 8080.

**Admin Side**

```bash
cd flag-platform/admin-side
npm install
node app.js
```

**Player Side**

```bash
cd flag-platform/player-side
npm install
node app.js
```

To run the application using **pm2**, use the following command instead of `node app.js`:

```bash
pm2 start app.js --name <App_Name>
```

### Admin Side Credentials

| Username   | Password       | Access Level                  |
|------------|----------------|--------------------------------|
| admin      | KUTsUPGm       | No access to add/remove flags and players |
| superadmin | 3VHgBJzpzL1hH6HX | Full Access                  |


