const { encode, decode } = require('./utils/encoder');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database('blog.db');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(expressLayouts);

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {cb(null, 'public/uploads/');},
  filename: function (req, file, cb) {cb(null, Date.now() + '-' + file.originalname);}
});
const upload = multer({ storage: storage });

// Middleware to set user data for views
app.use((req, res, next) => {
  const encodedUsername = req.cookies.username;
  if (encodedUsername) {
    const username = decode(encodedUsername);
    db.get('SELECT *, users.flag FROM users WHERE username = ?', [username], (err, user) => {
      if (err) return next();
      res.locals.user = user;
      next();
    });
  } else {
    res.locals.user = null;
    next();
  }
});

// Not used on the CTF

app.get('/register', (req, res) => {res.render('register');});
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err) => {
    if (err) return res.send('Error registering user');
    res.redirect('/login');
  });
});

app.get('/create-post', (req, res) => {
  const encodedUsername = req.cookies.username;
  if (!encodedUsername) return res.redirect('/login');
  const username = decode(encodedUsername);
  res.render('create-post', { title: 'Create Post', username });
});
app.post('/create-post', upload.single('image'), (req, res) => {
  const encodedUsername = req.cookies.username;
  if (!encodedUsername) return res.redirect('/login');
  const username = decode(encodedUsername);
  const { title, content } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
  db.run('INSERT INTO posts (title, content, image_url, user_name) VALUES (?, ?, ?, ?)', [title, content, imageUrl, username], (err) => {
    if (err) return res.send('Error creating post');
    res.redirect('/');
  });
});

// Routes

app.get('/', (req, res) => {
  const encodedUsername = req.cookies.username;
  if (!encodedUsername) {
    const message = "Login to see posts";
    res.render('index', { posts: [], message, showFlag: false, flag: null });
  } else {
    const username = decode(encodedUsername);
    db.get('SELECT *, users.flag FROM users WHERE username = ?', [username], (err, user) => {
      if (err) {return res.send('Error loading user');}
      const showFlag = req.cookies.showFlag === 'true';
      res.clearCookie('showFlag'); // Clear the flag cookie after showing it
      res.render('index', { posts: [], message: '', user, showFlag, flag: user.flag });
    });
  }
});

app.get('/login', (req, res) => {res.render('login');});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT *, users.flag FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
    if (err) return res.send('Error logging in');
    if (!user) {return res.send('Invalid username or password');}
    const showFlag = !user.flag_seen;
    if (showFlag) {
      db.run(`UPDATE users SET flag_seen = TRUE WHERE id = ?`, [user.id], (err) => {
        if (err) return res.send('Error updating flag status');
      });
    }
    // Encode username and set as cookie
    const encodedUsername = encode(username);
    res.cookie('username', encodedUsername);
    res.cookie('showFlag', showFlag);
    res.redirect('/');
  });
});

app.get('/logout', (req, res) => {
  res.clearCookie('username');
  res.redirect('/');
});

app.get('/post/:id', (req, res) => {
  const postId = req.params.id;
  db.all(`SELECT posts.*, users.username FROM posts JOIN users ON posts.user_id = users.id WHERE posts.id = ?`, [postId], (err, postResults) => {
    if (err) return res.send('Error loading post');
    const post = postResults[0];
    db.all(`SELECT comments.*, users.username FROM comments JOIN users ON comments.user_id = users.id WHERE comments.post_id = ?`, [postId], (err, commentResults) => {
      if (err) return res.send('Error loading comments');
      res.render('post', { title: post.title, post, comments: commentResults });
    });
  });
});

// XSS
app.post('/post/:id/comment', (req, res) => {
  const encodedUsername = req.cookies.username;
  if (!encodedUsername) return res.redirect('/login');
  const username = decode(encodedUsername);
  const postId = req.params.id;
  const { content } = req.body;
  db.run('INSERT INTO comments (content, user_id, post_id) VALUES (?, ?, ?)', [content, username, postId], (err) => {
    if (err) return res.send('Error posting comment');
    res.redirect(`/post/${postId}`);
  });
});

app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
app.get('/downloads', async (req, res) => {
  try {
    const files = await fs.readdir(path.join(__dirname, 'downloads'));
    res.render('downloads', { files });
  } catch (err) {
    console.error('Error reading downloads directory:', err);
    res.status(500).send('Error reading downloads directory');
  }
});

app.get('/images', (req, res) => {res.send('Nothing Here');});
app.get('/videos', (req, res) => {res.send('Nothing Here');});
app.get('/assets', (req, res) => {res.send('Nothing Here');});

app.get('/logs', (req, res) => {res.send('A');});

app.get('/backup', (req, res) => {res.send('Another Flag here > ORL{ZzwQLnLSdMt9GEgP}');});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});