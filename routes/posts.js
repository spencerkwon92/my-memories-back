const express = require("express");
const { Op } = require("sequelize");
const { Post, Comment, Image, User } = require("../models");

const { isLoggedIn, isNotLoggedIn } = require("./middlewares");

const router = express.Router();

// Get/posts
router.get("/", async (req, res, next) => {
  try {
    // 모든 데이트를 가져오는 경우, 얼만큼 페이지에 렌더링 해줄지 고려해야함.
    const where = {};
    if (parseInt(req.query.lastId, 10)) {
      where.id = { [Op.lt]: parseInt(req.query.lastId, 10) };
    }

    const posts = await Post.findAll({
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
          model: Image,
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
            }
          ],
        },
        {
          model: User,
          as: "Likers",
          attributes: ["id"],
        },
      ],
    });
    res.status(200).json(posts);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
