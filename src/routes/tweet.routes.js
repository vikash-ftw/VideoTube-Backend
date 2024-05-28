import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createTweet,
  updateTweet,
  deleteTweet,
  getUserTweets,
} from "../controllers/tweet.controller.js";

const router = Router();
router.use(verifyJWT); // applying the verifyJWT middleware to all routes in this file

router.route("/").post(createTweet);
router.route("/user/:userId").get(getUserTweets);
router.route("/:tweetId").delete(deleteTweet).patch(updateTweet);

export default router;
