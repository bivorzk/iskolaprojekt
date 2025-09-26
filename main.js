const express = require('express')
const app = express()
const port = 3000
const passwordhash = require('./passwordhash')
const database = require('./database') 
const path = require('path');


app.use(express.urlencoded({ extended: true }))

app.use(express.json())

app.use('/passwordhash', passwordhash)
app.use('/database', database)

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/passwordhash/login', (req, res) => {
  const { username, password } = req.body; // Now this works!
  res.send(`Hello ${username}, your password is ${password}`);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
