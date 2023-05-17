const express = require('express')
const postRouter = require('./routes/post')
const db = require('./models')

const app = express()

db.sequelize.sync()
  .then(()=>{
    console.log('db connection success')
  })
  .catch(console.error)

// app.use('/post', postRouter)

app.listen(4000,()=>{
  console.log('server is running')

})