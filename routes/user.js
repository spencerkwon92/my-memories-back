const express = require('express')
const bcrypt = require('bcrypt')
const passport = require('passport')

const {User, Post} = require('../models')

const router = express.Router()

//post/user/login
router.post('/login',async (req, res, next)=>{
  passport.authenticate('local',(err, user, info)=>{
    if(err) {
      console.error(err)
      return next(err)
    }
    
    if (info) return res.status(401).send(info.reason)

    return req.login(user, async(loginErr)=>{
      if(loginErr){
        console.error(loginErr)
        return next(loginErr) 
      }

      const fullUser = await User.findOne({
        where: {id: user.id},
        attributes:{
          exclude:['password']
        },
        include:[{
          model: Post,
        },{
          model: User,
          as:'Followers',
        },{
          model: User,
          as: 'Followings',
        }]
      })
      return res.status(200).json(fullUser)

    })
  })(req, res, next)
})

router.post('/logout', (req, res)=>{
  console.log('logout')
  req.logout()
  req.session.destroy()
  req.send('logout success')
})

router.post('/', async (req, res, next)=>{
  try{

    const isExistUser = await User.findOne({
      where:{
         email: req.body.email,
      }
    })
    
    if(isExistUser) return res.status(403).send('Already exist user')

    const hashedPassword = await bcrypt.hash(req.body.password, 12)
    await User.create({
      email: req.body.email,
      nickname: req.body.nickname,
      password: hashedPassword,
    })

    res.status(201).send('Account created successfully')
  }catch(error){
    console.error(error)
    next(error)
  }
})

module.exports = router