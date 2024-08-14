// app.js
const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();
const session = require('express-session');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static('public'));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'NIs@0509',
    database: 'ctf'
});

app.use(session({
    secret: '5vsaFghFA54adsF4a',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

db.connect((err) => {
    if (err) throw err;
});

const admins = [
    { username: 'admin', password: bcrypt.hashSync('KUTsUPGm', 8), role: 'admin' },
    { username: 'superadmin', password: bcrypt.hashSync('3VHgBJzpzL1hH6HX', 8), role: 'superadmin' }
];

const jwtSecret = 'WQggYZ6lyFUNuU0IZ65SdLLg33y7bBFf';

function authenticateToken(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        req.session.error = 'Unauthorized access. Please log in.';
        return res.redirect('/login');
    }

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            req.session.error = 'Forbidden access. Invalid token.';
            return res.redirect('/login');
        }
        res.locals.user = user;
        req.user = user;
        next();
    });
}

function isSuperAdmin(req, res, next) {
    if (req.user.role !== 'superadmin') {
        req.session.error = 'Forbidden access. You do not have the required permissions.';
        return res.redirect('/login'); // Redirect to login or a dedicated error page
    }
    next();
}

// Centralized error handling middleware
function errorHandler(err, req, res, next) {
    console.error(err.stack);
    res.status(500).render('error', { message: 'Internal Server Error', user: req.user });
}

app.get('/', (req, res) => {
    res.redirect('/highscore');
});

app.get('/login', (req, res) => {
    const error = req.session.error || null;
    req.session.error = null; // Clear the error after displaying it
    res.render('login', { user: req.user, error });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const admin = admins.find(user => user.username === username);
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
        req.session.error = 'Invalid username or password';
        return res.redirect('/login');
    }

    const token = jwt.sign({ username: admin.username, role: admin.role }, jwtSecret, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/highscore');
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

app.get('/highscore', authenticateToken, async (req, res, next) => {
    try {
        const [results] = await db.promise().query('SELECT username, full_name, ctf_url, program, total_points FROM players ORDER BY total_points DESC');
        res.render('highscore', { players: results });
    } catch (err) {
        next(err);
    }
});

app.get('/manage-players', authenticateToken, isSuperAdmin, async (req, res, next) => {
    try {
        const [results] = await db.promise().query('SELECT * FROM players');
        res.render('manage-players', { players: results });
    } catch (err) {
        next(err);
    }
});

app.post('/manage-players/add', authenticateToken, isSuperAdmin, async (req, res, next) => {
    const { username, password, full_name, ctf_url, program } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);
    try {
        await db.promise().query('INSERT INTO players (username, password, full_name, ctf_url, program) VALUES (?, ?, ?, ?, ?)', [username, hashedPassword, full_name, ctf_url, program]);
        res.redirect('/manage-players');
    } catch (err) {
        next(err);
    }
});

app.post('/manage-players/delete', authenticateToken, isSuperAdmin, async (req, res, next) => {
    const { username } = req.body;
    try {
        await db.promise().query('DELETE FROM players WHERE username = ?', [username]);
        res.redirect('/manage-players');
    } catch (err) {
        next(err);
    }
});

app.get('/manage-flags', authenticateToken, isSuperAdmin, async (req, res, next) => {
    try {
        const [results] = await db.promise().query('SELECT * FROM flags');
        res.render('manage-flags', { flags: results });
    } catch (err) {
        next(err);
    }
});

app.post('/manage-flags/add', authenticateToken, isSuperAdmin, async (req, res, next) => {
    const { flag, detail, points } = req.body;
    try {
        await db.promise().query('INSERT INTO flags (flag, detail, points) VALUES (?, ?, ?)', [flag, detail, points]);
        res.redirect('/manage-flags');
    } catch (err) {
        next(err);
    }
});

app.post('/manage-flags/delete', authenticateToken, isSuperAdmin, async (req, res, next) => {
    const { flag } = req.body;
    try {
        await db.promise().query('DELETE FROM flags WHERE flag = ?', [flag]);
        res.redirect('/manage-flags');
    } catch (err) {
        next(err);
    }
});

// 404 Error Handling
app.get('*', (req, res) => {
    res.status(404).render('error', { message: 'Page not found', user: req.user });
});

// Use the centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 8085;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});