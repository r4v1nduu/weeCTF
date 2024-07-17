const { encode, decode } = require('./utils/encoder');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs').promises;
const multer = require('multer');
const path = require('path');

const app = express();
const db = new sqlite3.Database('blog.db');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(expressLayouts);

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Use secure: true in production
}));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Middleware to set user data for views
app.use(async (req, res, next) => {
  const encodedUsername = req.cookies.username;
  const isAdmin = req.cookies.isAdmin;
  if (encodedUsername) {
    const username = decode(encodedUsername);
    db.get('SELECT *, users.flag FROM users WHERE username = ?', [username], (err, user) => {
      if (err) return next();
      res.locals.user = user;
      res.locals.isAdmin = isAdmin;
      res.user = user;
      res.isAdmin = isAdmin;
      next();
    });
  } else {
    res.locals.user = null;
    res.locals.isAdmin = false;
    res.user = null;
    res.isAdmin = false;
    next();
  }
});







app.get('/', async (req, res) => {
  const posts = await getAllPosts();
  const encodedUsername = req.cookies.username;
  let message = '';
  let showFlag = false;
  let showDeleteFlag = false;
  let flag = null;
  let isAdmin = false;

  if (encodedUsername) {
    const username = decode(encodedUsername);

    db.get('SELECT *, users.flag FROM users WHERE username = ?', [username], (err, user) => {
      if (err) return res.send('Error loading user');
      showFlag = req.cookies.showFlag === 'true';
      res.clearCookie('showFlag'); // Clear the flag cookie after showing it
      showDeleteFlag = req.cookies.showDeleteFlag;
      res.clearCookie('showDeleteFlag');
      flag = user.flag;
      isAdmin = user.admin;
      res.render('index', { posts, message, showFlag, showDeleteFlag, flag, user, isAdmin });
    });
  
  } else {
    message = "Login to see posts";
    res.render('index', { posts, message, showFlag, showDeleteFlag, flag });
  }
  
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Intentionally vulnerable to SQL Injection: using string concatenation
  const sql = `SELECT *, users.flag FROM users WHERE username = '${username}' AND password = '${password}'`;
  
  db.get(sql, async (err, user) => {
    if (err) return res.send('Error logging in');
    if (!user) return res.send('Invalid username or password');

    const showFlag = !user.flag_seen;

    if (showFlag) {
      await updateFlagSeen(user.id);
    }

    const dbUsername = user.username;
    const isAdmin = user.admin;
    const encodedUsername = encode(dbUsername);
    res.cookie('username', encodedUsername);
    res.cookie('isAdmin', isAdmin);
    res.cookie('showFlag', showFlag);
    res.redirect('/');
  });

});

app.get('/logout', (req, res) => {
  res.clearCookie('username');
  res.clearCookie('isAdmin');
  res.clearCookie('showFlag');
  res.redirect('/');
});







app.get('/post/:id', async (req, res) => {
  const postId = req.params.id;
  const post = await getPostById(postId);
  const comments = await getCommentsByPostId(postId);
  res.render('post', { title: post.title, post, comments });
});

app.post('/post/:id/comment', async (req, res) => {
  const encodedUsername = req.cookies.username;
  if (!encodedUsername) return res.redirect('/login');
  const username = decode(encodedUsername);
  const postId = req.params.id;
  const { content } = req.body;
  await createComment(content, username, postId);
  res.redirect(`/post/${postId}`);
});

app.post('/delete-post/:id', async (req, res) => {
  const postId = req.params.id;
  const encodedUsername = req.cookies.username;

  if (!encodedUsername) {
    return res.status(403).send('You do not have permission to delete this post');
  }

  const user = await getUserByUsername(decode(encodedUsername));
  const isAdmin = user.admin;

  if (!isAdmin) {
    return res.status(403).send('You do not have permission to delete this post');
  }

  await deletePost(postId);
  req.session.showDeleteFlag = true;
  res.redirect('/');
});







app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
app.get('/downloads', async (req, res) => {
  const files = await fs.readdir(path.join(__dirname, 'downloads'));
  res.render('downloads', { files });
});

app.get('/images', (req, res) => {res.send('Nothing Here');});
app.get('/videos', (req, res) => {res.send('Nothing Here');});
app.get('/assets', (req, res) => {res.send('Nothing Here');});

app.get('/logs', (req, res) => {res.send('A');});
app.get('/backup', (req, res) => {res.send('Another Flag here > ORL{ZzwQLnLSdMt9GEgP}');});







// Routes that are not used in CTF
app.get('/register', (req, res) => {res.render('register');});
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  await registerUser(username, password);
  res.redirect('/login');
});
app.get('/create-post', (req, res) => {
  const encodedUsername = req.cookies.username;
  if (!encodedUsername) return res.redirect('/login');
  const username = decode(encodedUsername);
  res.render('create-post', { title: 'Create Post', username });
});
app.post('/create-post', upload.single('image'), async (req, res) => {
  const encodedUsername = req.cookies.username;
  if (!encodedUsername) return res.redirect('/login');
  const username = decode(encodedUsername);
  const { title, content } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
  await createPost(title, content, imageUrl, username);
  res.redirect('/');
});







app.listen(3000, () => {console.log('Server is running on http://localhost:3000');});














// Helper functions
async function getUserByUsername(username) {
  const user = await new Promise((resolve, reject) => {
    db.get('SELECT *, users.flag FROM users WHERE username = ?', [username], (err, user) => {
      if (err) reject(err);
      resolve(user);
    });
  });
  return user;
}

async function getAllPosts() {
  const posts = await new Promise((resolve, reject) => {
    db.all('SELECT posts.*, users.username FROM posts JOIN users ON posts.user_name = users.username', (err, posts) => {
      if (err) reject(err);
      resolve(posts);
    });
  });
  return posts;
}

async function getPostById(postId) {
  const post = await new Promise((resolve, reject) => {
    db.get(`SELECT posts.*, users.username FROM posts JOIN users ON posts.user_name = users.username WHERE posts.id = ?`, [postId], (err, post) => {
      if (err) reject(err);
      resolve(post);
    });
  });
  return post;
}

async function getCommentsByPostId(postId) {
  const comments = await new Promise((resolve, reject) => {
    db.all(`SELECT comments.*, users.username FROM comments JOIN users ON comments.user_name = users.username WHERE comments.post_id = ?`, [postId], (err, comments) => {
      if (err) reject(err);
      resolve(comments);
    });
  });
  return comments;
}

async function createComment(content, username, postId) {
  await new Promise((resolve, reject) => {
    db.run('INSERT INTO comments (content, user_name, post_id) VALUES (?, ?, ?)', [content, username, postId], (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

async function deletePost(postId) {
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM posts WHERE id = ?', [postId], (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

async function registerUser(username, password) {
  await new Promise((resolve, reject) => {
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

async function createPost(title, content, imageUrl, username) {
  await new Promise((resolve, reject) => {
    db.run('INSERT INTO posts (title, content, image_url, user_name) VALUES (?, ?, ?, ?)', [title, content, imageUrl, username], (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

async function updateFlagSeen(userId) {
  await new Promise((resolve, reject) => {
    db.run('UPDATE users SET flag_seen = TRUE WHERE id = ?', [userId], (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}
