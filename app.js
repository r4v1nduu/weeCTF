const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const db = mysql.createConnection({
  host: 'localhost',
  user: 'bloguser',
  password: 'password',
  database: 'blog'
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.use(expressLayouts);


// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Middleware to set user data for views
app.use((req, res, next) => {
  if (req.cookies.userId) {
    db.query('SELECT * FROM users WHERE id = ?', [req.cookies.userId], (err, results) => {
      if (err) return next();
      res.locals.user = results[0];
      next();
    });
  } else {
    res.locals.user = null;
    next();
  }
});



app.get('/', (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) {
    res.render('index', { title: 'Home', message: 'Login to see posts' });
  } else {
    // Fetch posts for dashboard
    db.query(`
      SELECT posts.*, users.username 
      FROM posts 
      JOIN users ON posts.user_id = users.id 
      WHERE posts.user_id = ?
    `, [userId], (err, posts) => {
      if (err) return res.send('Error loading dashboard');
      res.render('index', { title: 'Home', posts });
    });
  }
});


app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);
  db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
    if (err) return res.send('Error registering user');
    res.redirect('/login');
  });
});


app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err) return res.send('Error logging in');
    const user = results[0];
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.send('Invalid username or password');
    }
    res.cookie('userId', user.id);
    res.redirect('/');
  });
});

app.get('/logout', (req, res) => {
  res.clearCookie('userId');
  res.redirect('/');
});


app.get('/create-post', (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.redirect('/login');
  res.render('create-post', { title: 'Create Post' });
});

app.post('/create-post', upload.single('image'), (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.redirect('/login');
  const { title, content } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
  db.query('INSERT INTO posts (title, content, image_url, user_id) VALUES (?, ?, ?, ?)', [title, content, imageUrl, userId], (err) => {
    if (err) return res.send('Error creating post');
    res.redirect('/');
  });
});


app.get('/post/:id', (req, res) => {
  const postId = req.params.id;
  db.query(`
    SELECT posts.*, users.username 
    FROM posts 
    JOIN users ON posts.user_id = users.id 
    WHERE posts.id = ?
  `, [postId], (err, postResults) => {
    if (err) return res.send('Error loading post');
    const post = postResults[0];
    db.query(`
      SELECT comments.*, users.username 
      FROM comments 
      JOIN users ON comments.user_id = users.id 
      WHERE comments.post_id = ?
    `, [postId], (err, commentResults) => {
      if (err) return res.send('Error loading comments');
      res.render('post', { title: post.title, post, comments: commentResults });
    });
  });
});

app.post('/post/:id/comment', (req, res) => {
  const userId = req.cookies.userId;
  if (!userId) return res.redirect('/login');
  const postId = req.params.id;
  const { content } = req.body;
  db.query('INSERT INTO comments (content, user_id, post_id) VALUES (?, ?, ?)', [content, userId, postId], (err) => {
    if (err) return res.send('Error posting comment');
    res.redirect(`/post/${postId}`);
  });
});



app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
