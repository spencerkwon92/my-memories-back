const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const fs = require("fs");
const multerS3 = require("multer-s3");
const AWS= require("aws-sdk");

const { Post, Comment, Image, User, Hashtag } = require("../models");
const { isLoggedIn, isNotLoggedIn } = require("./middlewares");
const { hash } = require("bcrypt");

try {
  fs.accessSync("uploadedPictures");
} catch (err) {
  console.log("uploadedPictures 폴더가 없으므로 생성합니다.");
  fs.mkdirSync("uploadedPictures");
}

router.post("/:postId/comment", isLoggedIn, async (req, res, next) => {
  try {
    const isPost = await Post.findOne({
      where: { id: req.params.postId },
    });

    if (!isPost) return res.status(403).send("존재하지 않는 게시글입니다."); // return을 안하면 res를 두번 보내서 error!

    const comment = await Comment.create({
      content: req.body.content,
      PostId: parseInt(req.params.postId),
      UserId: req.user.id,
    });

    const fullComment = await Comment.findOne({
      where: { id: comment.id },
      include: [
        {
          model: User,
          attributes: ["id", "nickname"],
          include: [
            {
              model: Image,
              as: "ProfileImage",
            },
          ],
        },
      ],
    });
    res.status(201).json(fullComment);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

//multerS2 setting.
AWS.config.update({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: "ap-northeast-2",
})
const upload = multer({
  // storage: multer.diskStorage({
  //   destination(req, file, done) {
  //     done(null, "uploadedPictures");
  //   },
  //   filename(req, file, done) {
  //     const ext = path.extname(file.originalname);
  //     const basename = path.basename(file.originalname, ext);
  //     done(null, basename + "_" + new Date().getTime() + ext);
  //   },
  // }),
  storage: multerS3({
    s3: new AWS.S3(),
    bucket: "my-memories-s3",
    key(req, file, cb){
      cb(null, `postImages/${Date.now()}_${path.basename(file.originalname)}`)
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.post("/", isLoggedIn, upload.none(), async (req, res, next) => {
  try {
    const hashtags = req.body.content.match(/#[^\s#]+/g);

    const post = await Post.create({
      content: req.body.content,
      UserId: req.user.id,
    });

    if (hashtags) {
      const result = await Promise.all(
        hashtags.map((tag) =>
          Hashtag.findOrCreate({
            where: { name: tag.slice(1).toLowerCase() },
          })
        )
      );
      await post.addHashtags(result.map((v) => v[0]));
    }
    //이미지를 Image 모델에 넣어주기... 그리고 그것을  포스트에 넣어주기.
    if (req.body.image) {
      if (Array.isArray(req.body.image)) {
        const images = await Promise.all(
          req.body.image.map((image) => Image.create({ src: image }))
        );
        await post.addImages(images);
      } else {
        const image = await Image.create({ src: req.body.image });
        await post.addImages(image);
      }
    }

    //가공하기...
    const fullPost = await Post.findOne({
      where: { id: post.id },
      include: [
        {
          model: Image,
        },
        {
          model: Comment,
          include: [
            {
              model: User,
              attributes: ["id", "nickname"],
              include: [
                {
                  model: Image,
                  as: "ProfileImage",
                },
              ],
            },
          ],
        },
        {
          model: User,
          attributes: ["id", "nickname"],
          include: [
            {
              model: Image,
              as: "ProfileImage",
            },
          ],
        },
        {
          model: User,
          as: "Likers",
          attributes: ["id"],
        },
      ],
    });
    res.status(201).json(fullPost);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.patch("/:postId/like", async (req, res, next) => {
  // PATCH /post/1/like
  try {
    const post = await Post.findOne({ where: { id: req.params.postId } });
    if (!post) {
      return res.status(403).send("게시글이 존재하지 않습니다.");
    }
    await post.addLikers(req.user.id);
    res.json({ PostId: post.id, UserId: req.user.id });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

//still working on it.
router.patch("/:postId/content", isLoggedIn, async(req,res,next)=>{
  const hashTags = req.body.content.match(/#[^\s#]+/g);
  try{
    await Post.update({
      content: req.body.content,
    },{
        where: {
          id: req.params.postId,
          UserId: req.user.id,
        }
    })
    const post = await Post.findOne({where: {id: req.params.postId}})
    if (hashTags) {
      const result = await Promise.all(
        hashTags.map((tag) =>
          Hashtag.findOrCreate({
            where: { name: tag.slice(1).toLowerCase() },
          })
        )
      );
      await post.setHashtags(result.map((v) => v[0]));
    }

    res.status(200).json({PostId: parseInt(req.params.postId, 10), content: req.body.content})
  }catch(err){
    console.error(err);
    next(err)
  }
})

router.delete("/:postId/like", async (req, res, next) => {
  // DELETE /post/9
  try {
    const post = await Post.findOne({ where: { id: req.params.postId } });
    if (!post) {
      return res.status(403).send("게시글이 존재하지 않습니다.");
    }
    await post.removeLikers(req.user.id);
    res.json({ PostId: post.id, UserId: req.user.id });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.delete("/:postId", async (req, res, next) => {
  try {
    await Post.destroy({
      where: {
        id: req.params.postId,
        UserId: req.user.id,
      },
    });
    await Comment.destroy({
      where: {
        PostId: req.params.postId,
        UserId: req.user.id,
      },
    });
    res.status(200).json({ PostId: parseInt(req.params.postId, 10) });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.post("/images", isLoggedIn, upload.array("image"), async (req, res, next) => {
    console.log(req.files);
    res.json(req.files.map((file) => file.location));
  }
);

module.exports = router;
