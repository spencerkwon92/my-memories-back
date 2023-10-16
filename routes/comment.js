const express = require('express')

const {Comment} = require('../models')
const {isLoggedIn} = require('./middlewares')

const router = express.Router();

router.delete('/:commentId', isLoggedIn, async (req, res, next)=>{
  try{
    await Comment.destroy({
      where: {
        id: parseInt(req.params.commentId, 10),
        PostId: req.query.postId,
      },
    });

    res.status(200).json({CommentId: parseInt(req.params.commentId, 10), PostId: parseInt(req.query.postId,10) })
  }catch(err){
    console.error(err)
    next(err)
  }
})

module.exports = router