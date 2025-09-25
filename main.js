const express = require('express')
const app = express()
const port = 3000
const passwordhash = require('./passwordhash')
//const database = require('./database') 

app.use('/passwordhash', passwordhash)
//app.use('/database', database)

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
