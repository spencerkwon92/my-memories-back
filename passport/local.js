const passport = require('passport')
const {Strategy: LocalStrategy} = require('passport-local')
const bcrypt = require('bcrypt')

const {User} = require('../models')

module.exports = ()=>{
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
  }, async (email, password, done)=>{
    try{
      const isUser = await User.findOne({
        where:{
          email
        }
      })
  
      if(!isUser) return done(null, false, {reason: '존재하지 않는 사용자입니다.'})
      
      const isCorrectPassword = await bcrypt.compare(password, isUser.password)
      if (isCorrectPassword) return done(null, isUser)
  
      return done(null, false, {reason: '비밀번호가 틀렸습니다.'})
    }catch(error){
      console.error(error)
      done(error)
    }

  }))
}