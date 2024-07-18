app.get('/register', (req, res) => { res.render('register'); });
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  await registerUser(username, password);
  res.redirect('/login');
});
app.get('/create-post', checkIsAdmin, (req, res) => {
  const encodedUsername = req.cookies.username;
  if (!encodedUsername) return res.redirect('/login');
  const username = decode(encodedUsername);
  res.render('create-post', { title: 'Create Post', username });
});
app.post('/create-post', checkIsAdmin, upload.single('image'), async (req, res) => {
  const encodedUsername = req.cookies.username;
  if (!encodedUsername) return res.redirect('/login');
  const username = decode(encodedUsername);
  const { title, content } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
  await createPost(title, content, imageUrl, username);
  res.redirect('/');
});