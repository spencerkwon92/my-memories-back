const express = require('express')
const bcrypt = require('bcrypt')
const passport = require('passport')
const { Op } = require("sequelize");
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const multerS3 = require('multer-s3')
const AWS = require('aws-sdk')

const {User, Post, Comment, Image} = require('../models')
const {isLoggedIn, isNotLoggedIn} = require("./middlewares");

const router = express.Router()

try{
  fs.accessSync("uploadedUserProfilePictures");
}catch(err){
  console.error("uploadedUserProfilePictures 폴더가 없으므로 생성합니다.");
  fs.mkdirSync("uploadedUserProfilePictures");
}

//Get/user => 내 정보 가져오기
router.get('/', async(req, res, next)=>{
  try{
    if(req.user){
      const fullUserWithoutPassword = await User.findOne({
        where: { id: req.user.id },
        attributes: {
          exclude: ["password"],
        },
        include: [
          {
            model: Post,
            attributes: ["id"],
          },
          {
            model: User,
            as: "Followings",
            attributes: ["id"],
          },
          {
            model: User,
            as: "Followers",
            attributes: ["id"],
          },
          {
            model: Image,
            as: "ProfileImage",
          }
        ],
      });
      res.status(200).json(fullUserWithoutPassword);
    }else{
      console.log('비로그인 상태에서 데이터를 불러옵니다.')
      res.status(200).json(null);
    }
  }catch(err){
    console.error(err)
    next(err)
  }
})

//POST/user/login ==> 로그인하기.
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
          exclude: ['password'], 
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

router.get('/followers', isLoggedIn, async(req, res, next)=>{
  try{
    const user = await User.findOne({where: {id: req.user.id}})
    if(!user) return res.status(403).send('Not exist user')
    
    const followers = await user.getFollowers({
      attributes: {
        exclude: ['password']
      },
      include: [
        {
          model: Image,
          as: 'ProfileImage',
        }
      ]
    })
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
    
    const followings = await user.getFollowings({
      attributes: {
        exclude: ['password']
      },
      include:[
        {
          model: Image,
          as: 'ProfileImage',
        }
      ]
    })
    res.status(200).json(followings)
  }catch(err){
    console.error(err)
    next(err)
  }
})

// POST/user/logout ==> 로그아웃하기.
router.post('/logout', isLoggedIn, (req, res) => {
  console.log(isLoggedIn)
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

//post/user ==> 회원가입하기.
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

//Patch/user/nickname ==> 닉네임 변경하기.
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

AWS.config.update({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: "ap-northeast-2",
});
//multer setting.
const upload = multer({

  storage: multerS3({
    s3: new AWS.S3(),
    bucket: "my-memories-s3",
    key(req, file, cb){
      cb(null, `userProfileImages/${Date.now()}_${path.basename(file.originalname)}`)
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.patch("/profileImage", isLoggedIn, upload.none(), async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: {id: req.user.id},
      include: [
        {
          model: Image,
          as: 'ProfileImage',
        }
      ]
    })

    const image = await Image.upsert({
      src: req.body.profileImage,
      UserId: req.user.id,
    },{
      returning: true,
    })

    await user.setProfileImage(image[0])

    res.status(200).json(image[0])
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.post('/profileImage', isLoggedIn, upload.single('profileImage'), async(req,res, next)=>{
  console.log(req.file);
  res.json(
    req.file.location.replace(/\/userProfileImages\//, "/resizedUserImages/")
  );
})

//Get/user/1 => 특정 유저 정보 가져오기.₩
router.get('/:userId', async (req, res, next)=>{
  try{
    const user = await User.findOne({
      where: {id: parseInt(req.params.userId)},
      attributes: {
        exclude: ['password']
      },
      include:[
        {
          model: Post,
          attributes: ['id'],
        },
        {
          model: User,
          as: 'Followings',
          attributes: ['id'],
        },
        {
          model: User,
          as: 'Followers',
          attributes: ['id'],
        },
        {
          model: Image,
          as: 'ProfileImage',
        }
      ]
    })
    res.status(200).json(user);
  }catch(err){
    console.error(err)
    next(err)
  }
})

// Patch/user/1/follow ==> 팔로우하기.
router.patch('/:userId/follow', isLoggedIn, async (req, res, next)=>{
  try{

    const user = await User.findOne({where: {id: parseInt(req.params.userId,10)}})
    if(!user) return res.status(403).send('Not exist user')

    await user.addFollowers(req.user.id)
    
    res.status(200).json({UserId: parseInt(req.params.userId, 10)})
  }catch(err){
    console.error(err)
    next(err)
  } 
})

// Delete/user/1/follow ==> 언팔 하기.
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

//GET/user/1/posts ==> 특정 유저의 게시글 가져오기.
router.get('/:userId/posts', async(req, res, next)=>{
  const user = await User.findOne({where: {id: req.params.userId}});
  try{
    if (user) {
      const where = {};
      if (parseInt(req.query.lastId, 10)) {
        where.id = { [Op.lt]: parseInt(req.query.lastId, 10) };
      }

      const posts = await user.getPosts({
        where,
        limit: 10,
        order: [
          ["createdAt", "DESC"],
          [Comment, "createdAt", "DESC"],
        ],
        include: [
          {
            model: User,
            attributes: ["id", "nickname"],
            include:[
              {
                model: Image,
                as: "ProfileImage",
              }
            ]
          },
          {
            model: User,
            through: "Like",
            as: "Likers",
            attributes: ["id"],
          },
          {
            model: Comment,
            include: [
              {
                model: User,
                attributes: ["id", "nickname"],
                include:[
                  {
                    model: Image,
                    as: "ProfileImage",
                  }
                ]
              },
            ],
          },
          {
            model: Image,
          },
        ],
      });
      console.log(posts), res.status(200).json(posts);
    } else {
      res.state(404).send("Not exist user");
    }
  }catch(err){
    console.error(err)
    next(err)
  }
})

module.exports = router