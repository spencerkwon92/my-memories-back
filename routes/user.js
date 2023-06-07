const express = require('express')
const bcrypt = require('bcrypt')
const passport = require('passport')

const {User, Post} = require('../models')
const {isLoggedIn, isNotLoggedIn} = require('./middlewares')

const router = express.Router()

router.get('/', async(req, res, next)=>{//Get/user
  try{

    if(req.user){

      const fullUserWithoutPassword = await User.findOne({
        where: { id: req.user.id },
        attributes: {
          exclude: ['password']
        },
        include: [{
          model: Post,
          attributes: ['id'],
        }, {
          model: User,
          as: 'Followings',
          attributes: ['id'],
        }, {
          model: User,
          as: 'Followers',
          attributes: ['id'],
        }]
      })
      res.status(200).json(fullUserWithoutPassword);
    }else{
      res.status(200).json(null);
    }
  }catch(err){
    console.error(err)
    next(err)
  }
})

//post/user/login
router.post('/login', isNotLoggedIn, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error(err);
      return next(err);
    }
    if (info) {
      return res.status(401).send(info.reason);
    }
    return req.login(user, async (loginErr) => {
      if (loginErr) {
        console.error(loginErr);
        return next(loginErr);
      }
      const fullUserWithoutPassword = await User.findOne({
        where: { id: user.id },
        attributes: {
          exclude: ['password']
        },
        include: [{
          model: Post,
          attributes: ['id'],
        }, {
          model: User,
          as: 'Followings',
          attributes: ['id'],
        }, {
          model: User,
          as: 'Followers',
          attributes: ['id'],
        }]
      })
      return res.status(200).json(fullUserWithoutPassword);
    });
  })(req, res, next);
});


router.post('/logout', isLoggedIn, (req, res) => {

  req.logout((err) => {
    if (err) {
      console.log('Error logging out:', err);
      return res.status(500).send('Internal Server Error');
    }

    req.session.destroy((err) => {
      if (err) {
        console.log('Error destroying session:', err);
        return res.status(500).send('Internal Server Error');
      }
      
      res.send('okay!');
    });
  });

});

router.post('/', isNotLoggedIn, async (req, res, next)=>{
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

router.patch('/nickname', isLoggedIn, async (req, res, next)=>{
  try{
    await User.update({
      nickname: req.body.nickname,
    },{
      where: {id: req.user.id}
    })

    res.status(200).json({nickname: req.body.nickname})
  }catch(err){
    console.error(err)
    next(err)
  }
})

router.patch('/:userId/follow', isLoggedIn, async (req, res, next)=>{
  try{
    const user = await User.findOne({where: {id: req.params.userId}})
    if(!user) return res.status(403).send('Not exist user')

    await user.addFollowers(req.user.id)
    
    res.status(200).json({UserId: parseInt(req.params.userId, 10)})
  }catch(err){
    console.error(err)
    next(err)
  } 
})

router.delete('/:userId/follow', isLoggedIn, async(req, res, next)=>{
  try{
    const user = await User.findOne({where: {id: req.params.userId}})
    if(!user) return res.status(403).send('Not exist user')

    await user.removeFollowers(req.user.id)
    
    res.status(200).json({UserId: parseInt(req.params.userId, 10)})
  }catch(err){
    console.error(err)
    next(err)
  } 
})

router.get('/followers', isLoggedIn, async(req, res, next)=>{
  try{
    const user = await User.findOne({where: {id: req.user.id}})
    if(!user) return res.status(403).send('Not exist user')

    const followers = await user.getFollowers()
    res.status(200).json(followers)
  }catch(err){
    console.error(err)
    next(err)
  }
})

router.get('/followings', isLoggedIn, async(req, res, next)=>{
    try{
    const user = await User.findOne({where: {id: req.user.id}})
    if(!user) return res.status(403).send('Not exist user')
    
    const followings = await user.getFollowings()
    res.status(200).json(followings)
  }catch(err){
    console.error(err)
    next(err)
  }
})

module.exports = router