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
//const db = new sqlite3.Database(path.join(__dirname, 'data', 'blog.db'));
const db = new sqlite3.Database('blog.db');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(expressLayouts);

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
  const isAdmin = req.cookies.isAdmin === 'true';
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

// Middleware to check isAdmin value from cookie for each route
function checkIsAdmin(req, res, next) {
  res.isAdmin = req.cookies.isAdmin;
  next();
}







app.get('/', async (req, res) => {
  const posts = await getAllPosts();
  const encodedUsername = req.cookies.username;
  let message = '';
  let showFlag = req.cookies.showFlag === 'true'; // Check the showFlag cookie
  let flag = null;
  let isAdmin = false;

  if (encodedUsername) {
    const username = decode(encodedUsername);

    db.get('SELECT *, users.flag FROM users WHERE username = ?', [username], (err, user) => {
      if (err) return res.send('Error loading user');
      
      // Check for the deleteFlag cookie and set the flag if present
      if (req.cookies.deleteFlag) {
        flag = req.cookies.deleteFlag;
      } else {
        flag = user.flag;
      }
      
      res.clearCookie('showFlag'); // Clear the showFlag cookie after showing it
      res.clearCookie('deleteFlag'); // Clear the deleteFlag cookie after showing it
      isAdmin = user.admin;
      res.render('index', { posts, message, showFlag, flag, user, isAdmin });
    });

  } else {
    message = "Login to see posts";
    res.render('index', { posts, message, showFlag, flag, isAdmin });
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
  try {
    const post = await getPostById(postId);
    if (!post) {
      return res.status(404).render('404', { message: 'Post not found' });
    }
    const comments = await getCommentsByPostId(postId);
    res.render('post', { title: post.title, post, comments });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'An error occurred while fetching the post' });
  }
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

app.post('/delete-post/:id', checkIsAdmin, async (req, res) => {
  const postId = req.params.id;
  const encodedUsername = req.cookies.username;

  if (!encodedUsername) {
    return res.status(403).send('You do not have permission to delete this post');
  }

  const user = await getUserByUsername(decode(encodedUsername));
  const isAdmin = res.isAdmin; // Use the isAdmin value from the middleware

  if (!isAdmin) {
    return res.status(403).send('You do not have permission to delete this post');
  }

  await deletePost(postId);
  res.cookie('deleteFlag', 'ORL{n6YgeljcNDnYT5yF}'); // Set the deleteFlag cookie
  res.cookie('showFlag', 'true'); // Set the showFlag cookie
  res.redirect('/');
});







app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
app.get('/downloads', async (req, res) => {
  const files = await fs.readdir(path.join(__dirname, 'downloads'));
  res.render('downloads', { files });
});

app.get('/images', (req, res) => { res.send('Nothing Here'); });
app.get('/videos', (req, res) => { res.send('Nothing Here'); });
app.get('/assets', (req, res) => { res.send('Nothing Here'); });

app.get('/logs', (req, res) => { res.send('A'); });
app.get('/backup', (req, res) => { res.send('Another Flag here > ORL{ZzwQLnLSdMt9GEgP}'); });

app.get('/register', (req, res) => { res.render('register'); });

app.get('/create-post', (req, res) => {
  const encodedUsername = req.cookies.username;
  if (!encodedUsername) return res.redirect('/login');
  const username = decode(encodedUsername);
  res.render('create-post', { title: 'Create Post', username });
});







const port = process.env.PORT || 8080;
app.listen(port, function () {
  console.log(`wee Blog listening on ${port}!`);
});






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

async function updateFlagSeen(userId) {
  try {
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET flag_seen = ? WHERE id = ?', [true, userId], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
}
