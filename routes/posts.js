const express = require('express')

const {Post, Comment, Image, User} = require('../models')

const router = express.Router()

router.get('/',async (req, res, next)=>{
  try{
    // 모든 데이트를 가져오는 경우, 얼만큼 페이지에 렌더링 해줄지 고려해야함.
    const posts = await Post.findAll({
       limit: 10,
       order: [['createdAt', 'DESC'],[Comment,'createdAt','DESC']],
       include:[{
        model: User,
        attributes:['id', 'nickname']
       },{
        model: Image,
       },{
        model: Comment,
        include:[{
          model: User,
          attributes:['id','nickname'],
        }]
       }]
    })

    res.status(200).json(posts)
  }catch(err){
    console.error(err)
    next(err)
  }
})

module.exports = router