const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const helmet = require("helmet");
const path = require('path');

const app = express();

app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.set('view engine', 'ejs');

app.use(
  helmet({
    hsts: false,
  })
);

helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    "default": "self"
  },
})

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'NIs@0509',
    database: 'ctf'
});

const jwtSecret = 'WQggYZ6lyFUNuU0IZ65SdLLg33y7bBFf';

app.use(session({
  secret: 'WQggYZ6lyFUNuU0IZ65SdLLg33y7bBFf',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});


function authenticateToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    req.session.error = 'Unauthorized';
    return res.redirect('/login');
  }

  jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        req.session.error = 'Forbidden';
        return res.redirect('/login');
      }
      req.user = user;
      next();
  });
}





app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

app.get('/login', (req, res) => {
  let error = req.session.error;
  req.session.error = null; 
  res.render('login', { user: req.user, error });
});

app.post('/login', async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const [results] = await db.execute('SELECT * FROM players WHERE username = ?', [username]);
    if (results.length === 0) {
      req.session.error = 'Invalid Username or Password';
      return res.redirect('/login');
    }

    const user = results[0];
    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) {
      req.session.error = 'Invalid Username or Password';
      return res.redirect('/login');
    }

    const token = jwt.sign({ id: user.username }, jwtSecret, { expiresIn: '3h' });
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});


app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

app.get('/dashboard', authenticateToken, async (req, res, next) => {
  let error = req.session.error;
  req.session.error = null; // Clear the error message after retrieving

  try {
    const [playerResults] = await db.execute(
      'SELECT username, full_name, ctf_url, program, total_points FROM players WHERE username = ?',
      [req.user.id]
    );

    const [flagResults] = await db.execute(
      'SELECT flag FROM player_flags WHERE username = ?',
      [req.user.id]
    );

    const user = playerResults[0];
    res.render('dashboard', { user: user, flags: flagResults, error });
  } catch (err) {
    next(err);
  }
});

app.post('/submit-flag', authenticateToken, async (req, res, next) => {
  const { flag } = req.body;
  const username = req.user.id;

  try {
    const [flagResults] = await db.execute('SELECT * FROM flags WHERE flag = ?', [flag]);
    if (flagResults.length === 0) {
      req.session.error = 'Invalid flag';
      return res.redirect('/dashboard');
    }

    const flagDetails = flagResults[0];

    const [playerFlagResults] = await db.execute(
      'SELECT * FROM player_flags WHERE username = ? AND flag = ?',
      [username, flag]
    );
    if (playerFlagResults.length > 0) {
      req.session.error = 'Flag already submitted';
      return res.redirect('/dashboard');
    }

    await db.execute('INSERT INTO player_flags (username, flag) VALUES (?, ?)', [username, flag]);
    await db.execute('UPDATE players SET total_points = total_points + ? WHERE username = ?', [flagDetails.points, username]);

    req.session.error = null; // Clear any previous error
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  }
});

app.get('*', (req, res) => {
  res.status(404).render('error', { message: 'Page not found', user: req.user });
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
