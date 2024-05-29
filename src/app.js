import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/ApiError.js";

const app = express();

// configure the cors
// app.use(cors()) // normal configured
// prod based configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // to manage req origin source ex- origin: 'http://example.com'
    credentials: true, // allow cookies on cross-origin requests
  })
);

// configure the data type we receive in request
app.use(
  express.json({
    limit: "25kb", // limit data size
  })
);

// configure the url encoder for url data like %20 and +
app.use(
  express.urlencoded({
    extended: true, // allow objects in objects - nested objects - not used mostly
    limit: "25kb",
  })
);

// configure the file local storage on server - local asset storage on public folder
app.use(express.static("public")); // here public is the folder name

// configure the cookie handling
app.use(cookieParser());

// import routes
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import likeRouter from "./routes/like.routes.js";
import commentRouter from "./routes/comment.routes.js";
import tweetRouter from "./routes/tweet.routes.js";

// user routes
app.use("/api/v1/users", userRouter);
// video routes
app.use("/api/v1/videos", videoRouter);
// subscription based routes
app.use("/api/v1/subscriptions", subscriptionRouter);
// like based routes
app.use("/api/v1/likes", likeRouter);
// comment based routes
app.use("/api/v1/comments", commentRouter);
// tweet based routes
app.use("/api/v1/tweets", tweetRouter);

// middleware to send error in better format
app.use(async (err, req, res, next) => {
  if (err instanceof ApiError) {
    res
      .status(err.statusCode)
      .json({ statusCode: err.statusCode, message: err.message });
  } else {
    res.status(500).json({ statusCode: 500, message: err?.message });
  }
});

export { app };
