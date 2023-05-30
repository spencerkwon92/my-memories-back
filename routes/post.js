const express = require('express');
const router = express.Router();

const {Post, Comment, Image, User} = require('../models')
const {isLoggedIn} = require('./middlewares')

router.post('/:postId/comment', isLoggedIn, async(req, res, next)=>{
  try{
    const isPost = await Post.findOne({
      where:{id: req.params.postId}
    })
    
    if(!isPost) return res.status(403).send('존재하지 않는 게시글입니다.') // return을 안하면 res를 두번 보내서 error!

    const comment = await Comment.create({
      content: req.body.content,
      PostId: parseInt(req.params.postId),
      UserId: req.user.id,
    })

    const fullComment = await Comment.findOne({
      where: {id: comment.id},
      include:[{
        model: User,
        attributes: ['id','nickname']
      }]
    })
    res.status(201).json(fullComment)
  }catch(err){
    console.error(err)
    next(err)
  }
  
})

router.post('/', isLoggedIn, async(req, res, next)=>{
  try{
    const post = await Post.create({
      content: req.body.content,
      UserId: req.user.id,
    })
    //가공하기...
    const fullPost = await Post.findOne({
      where: {id: post.id},
      include:[{
        model: Image,
      },{
        model: Comment,
        include: [{
          model: User,
          attributes: ['id','nickname']
        }]
      },{
        model: User,
        attributes: ['id','nickname']
      }]
    })

    res.status(201).json(fullPost)
  }catch(err){
    console.error(err)
    next(err)
  }
})

router.get('/', (req, res) => {
  res.send('This is the posts endpoint');
});

module.exports = router;