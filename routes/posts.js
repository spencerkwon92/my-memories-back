const express = require("express");
const { Op } = require("sequelize");
const { Post, Comment, Image, User } = require("../models");

const { isLoggedIn, isNotLoggedIn } = require("./middlewares");

const router = express.Router();

//This API need to removed.
router.get("/:id", isLoggedIn, async (req, res, next) => {
  // Get/posts/1
  try {
    const posts = await Post.findAll({
      where: { UserId: parseInt(req.params.id) },
      order: [
        ["createdAt", "DESC"],
        [Comment, "createdAt", "DESC"],
      ],
      include: [
        {
          model: User,
          attributes: ["id", "nickname"],
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
    res.status(200).json(posts);
  } catch (err) {
    console.error(err);
    next(err);
  }
}); //GET/posts/userid...

router.get("/", async (req, res, next) => {
  try {
    // 모든 데이트를 가져오는 경우, 얼만큼 페이지에 렌더링 해줄지 고려해야함.
    const where = {};
    if (parseInt(req.query.lastId, 10)) {
      where.id = { [Op.lt]: parseInt(req.query.lastId, 10) };
    }

    const posts = await Post.findAll({
      limit: 10,
      order: [
        ["createdAt", "DESC"],
        [Comment, "createdAt", "DESC"],
      ],
      include: [
        {
          model: User,
          attributes: ["id", "nickname"],
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
    res.status(200).json(posts);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
