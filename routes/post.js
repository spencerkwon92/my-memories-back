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
      },{
        model: User,
        as: 'Likers',
        attributes: ['id']
      }]
    })
    res.status(201).json(fullPost)
  }catch(err){
    console.error(err)
    next(err)
  }
})

router.patch('/:postId/like', async (req, res, next) => { // PATCH /post/1/like
  try {
    const post = await Post.findOne({ where: { id: req.params.postId }});
    if (!post) {
      return res.status(403).send('게시글이 존재하지 않습니다.');
    }
    await post.addLikers(req.user.id);
    res.json({ PostId: post.id, UserId: req.user.id });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.delete('/:postId/like', async (req, res, next) => { // DELETE /post/9
  try {
    const post = await Post.findOne({where: {id: req.params.postId}})
    if(!post){
      return res.status(403).send('게시글이 존재하지 않습니다.');
    }
    await post.removeLikers(req.user.id);
    res.json({PostId: post.id, UserId: req.user.id})
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.delete('/:postId', async(req, res, next)=>{
  try{
    await Post.destroy({
      where: {
        id: req.params.postId,
        UserId: req.user.id,
      }
    })

    res.status(200).json({PostId: parseInt(req.params.postId, 10)})
  }catch(err){
    console.error(err)
    next(err)
  }
})

module.exports = router;