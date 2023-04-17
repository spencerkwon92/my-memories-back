const express = require('express')
const postRouter = require('./routes/post')

const app = express()

//app.메서드('url'...) 
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use('/post', postRouter)

app.listen(4000,()=>{
  console.log('server is running')

})