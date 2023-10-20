const express = require("express");
const cors = require("cors");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const dotenv = require("dotenv");
const morgan = require("morgan");
const path = require("path");
const hpp = require("hpp");
const helmet = require("helmet");

const postsRouter = require("./routes/posts");
const postRouter = require("./routes/post");
const userRouter = require("./routes/user");
const hashtagRouter = require("./routes/hashtag");
const commentRouter = require("./routes/comment");
const db = require("./models");
const passportConfig = require("./passport");

dotenv.config();
const app = express();
db.sequelize
  .sync()
  .then(() => {
    console.log("db connection success");
  })
  .catch(console.error);
passportConfig();

app.set('trust proxy', 1);
if(process.env.NODE_ENV === "production"){
  app.use(morgan("combined"));
  app.use(hpp());
  app.use(helmet());
  app.use(
    cors({
      origin: ["http://mymemories.kr"],
      credentials: true,
    })
  );
}else{
  app.use(morgan("dev"));
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
}

//middlewares...
app.use("/", express.static(path.join(__dirname, "uploadedPictures")));
app.use("/", express.static(path.join(__dirname, "uploadedUserProfilePictures")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: process.env.COOKIE_SECRET,
    proxy: process.env.NODE_ENV === "production",
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      domain: process.env.NODE_ENV === "production" && ".mymemories.kr",
    }
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use("/posts", postsRouter);
app.use("/post", postRouter); 
app.use("/user", userRouter);
app.use("/hashtag", hashtagRouter);
app.use("/comment", commentRouter);

//I allowed port 80 in the case of http
app.listen(80, () => {
  console.log("server is running");
});