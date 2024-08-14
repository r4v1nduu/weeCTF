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
app.use(expressLayouts);
app.use(cookieParser());
app.use(session({
  secret: '5vsaFghFA54adsF4a',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
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

function isAuthenticated(req, res, next) {
  if (res.locals.user !== undefined && res.locals.user !== null) { return next(); }
  req.session.error = 'You must log in first';
  res.redirect('/login');
}







app.get('/' , async (req, res) => {
  const posts = await getAllPosts();
  const encodedUsername = req.cookies.username;
  const message = "Login to see posts"
  const showFlag = req.cookies.showFlag === 'true'; // Check the showFlag cookie
  const isAdmin = req.cookies.isAdmin;
  let flag = null;

  if (encodedUsername) {
    const username = decode(encodedUsername);
    db.get('SELECT *, users.flag FROM users WHERE username = ?', [username], (err, user) => {
      if (err) {return res.status(500).render('404', { message: 'Internal server error. Please try again later.' });}
      
      // Check for the deleteFlag cookie and set the flag if present
      if (req.cookies.deleteFlag) {flag = req.cookies.deleteFlag;} else {flag = user.flag;}
      
      res.clearCookie('showFlag'); // Clear the showFlag cookie after showing it
      res.clearCookie('deleteFlag'); // Clear the deleteFlag cookie after showing it
      res.render('index', { posts, message, showFlag, flag, user, isAdmin, error: req.session.error });
    });

  } else {
    res.render('index', { posts, message, showFlag, flag, isAdmin, error: req.session.error });
    req.session.error = null;
  }
});



app.get('/login', (req, res) => {
  res.render('login', { error: req.session.error });
  req.session.error = null;
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const sql = `SELECT *, users.flag FROM users WHERE username = '${username}' AND password = '${password}'`;
  
  db.get(sql, async (err, user) => {
    if (err) {
      req.session.error = 'Error logging in';
      return res.status(500).redirect('/login');
    }
    if (!user) {
      req.session.error = 'Invalid username or password';
      return res.status(401).redirect('/login');
    }

    const showFlag = !user.flag_seen_login;
    if (showFlag) { await updateFlagSeenLogin(user.id); }

    const dbUsername = user.username;
    const encodedUsername = encode(dbUsername);
    const isAdmin = user.admin;
    
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



app.get('/post/:id', isAuthenticated, async (req, res) => {
  const postId = req.params.id;
  try {
    const post = await getPostById(postId);
    if (!post) {
      return res.status(404).render('404', { message: 'Post not found' });
    }
    const comments = await getCommentsByPostId(postId);
    res.render('post', { title: post.title, post, comments });
  } catch (err) {
    res.status(500).render('404', { message: 'An error occurred while fetching the post' });
  }
});

app.post('/post/:id/comment', isAuthenticated, async (req, res) => {
  const encodedUsername = req.cookies.username;
  if (!encodedUsername) return res.redirect('/login');
  const username = decode(encodedUsername);
  const postId = req.params.id;
  const { content } = req.body;
  await createComment(content, username, postId);
  res.redirect(`/post/${postId}`);
});

app.post('/delete-post/:id', isAuthenticated, async (req, res) => {
  const postId = req.params.id;
  const encodedUsername = req.cookies.username;
  const username = decode(encodedUsername);
  if (!encodedUsername) { return res.status(403).render('404', { message: 'An error Occured !' }); }

  const sql = `SELECT *, users.flag FROM users WHERE username = '${username}'`;

  let user;
  try {
    user = await new Promise((resolve, reject) => {
      db.get('SELECT *, users.flag FROM users WHERE username = ?', [username], (err, user) => {
        if (err) return reject(err);
        resolve(user);
      });
    });
  } catch (error) {
    return res.status(500).render('404', { message: 'Internal server error. Please try again later.' });
  }

  const isAdmin = req.cookies.isAdmin;
  if (isAdmin === '1') {
    await deletePost(postId);

    const showFlag = !user.flag_seen_delete;
    if (showFlag) { await updateFlagSeenDelete(user.id); }

    res.cookie('deleteFlag', 'ORL{n6YgeljcNDnYT5yF}'); // Set the deleteFlag cookie
    res.cookie('showFlag', showFlag); // Set the showFlag cookie
    res.redirect('/');
  } else {
    req.session.error = 'You do not have permission to delete posts';
    return res.status(403).redirect('/');
  }
});







app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
app.get('/downloads', async (req, res) => {
  const files = await fs.readdir(path.join(__dirname, 'downloads'));
  res.render('downloads', { files });
});

app.get('/images', (req, res) => { res.send('Nothing Here'); });
app.get('/videos', (req, res) => { res.send('Nothing Here'); });
app.get('/assets', (req, res) => { res.send('Nothing Here'); });

app.get('/logs', (req, res) => { res.send('Nothing Here'); });
app.get('/backup', (req, res) => { res.send('Another Flag here > ORL{ZzwQLnLSdMt9GEgP}'); });

app.get('/register', (req, res) => { res.render('register'); });

app.get('/create-post', isAuthenticated, (req, res) => {
  const encodedUsername = req.cookies.username;
  if (!encodedUsername) return res.redirect('/login');
  const username = decode(encodedUsername);
  res.render('create-post', { title: 'Create Post', username });
});














const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log(`wee Blog listening on ${port}!`);
});






// Helper functions
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
  try {
    const post = await new Promise((resolve, reject) => {
      db.get(`SELECT posts.*, users.username FROM posts JOIN users ON posts.user_name = users.username WHERE posts.id = ?`, [postId], (err, post) => {
        if (err) reject(err);
        resolve(post || null); // Resolve with null if post is not found
      });
    });
    return post;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function getCommentsByPostId(postId) {
  try {
    const comments = await new Promise((resolve, reject) => {
      db.all(`SELECT comments.*, users.username FROM comments JOIN users ON comments.user_name = users.username WHERE comments.post_id = ?`, [postId], (err, comments) => {
        if (err) reject(err);
        resolve(comments);
      });
    });
    return comments;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function createPost(title, content, imageUrl, username) {
  try {
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO posts (title, content, image_url, user_name) VALUES (?, ?, ?, ?)', [title, content, imageUrl, username], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function createComment(content, username, postId) {
  await new Promise((resolve, reject) => {
    const sql = `INSERT INTO comments (content, user_name, post_id) VALUES ('${content}', '${username}', '${postId}')`;
    db.run(sql, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

async function deletePost(postId) {
  try {
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM posts WHERE id = ?', [postId], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function updateFlagSeenLogin(userId) {
  try {
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET flag_seen_login = ? WHERE id = ?', [true, userId], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function updateFlagSeenDelete(userId) {
  try {
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET flag_seen_delete = ? WHERE id = ?', [true, userId], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
}