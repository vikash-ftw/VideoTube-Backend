import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// controller to toggle a like on a video by a loggedIn user
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!(videoId && isValidObjectId(videoId))) {
    throw new ApiError(400, "Valid videoId is required!");
  }

  let deleteLikeIfExist;
  try {
    deleteLikeIfExist = await Like.findOneAndDelete({
      video: videoId,
      likedBy: req.user,
    });
  } catch (error) {
    throw new ApiError(
      500,
      "Server Error: Something went wrong while toggling like!"
    );
  }
  if (!deleteLikeIfExist) {
    await Like.create({
      video: videoId,
      likedBy: req.user,
    });
  }
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { videoId, likedBy: req.user._id },
        `Successfully ${deleteLikeIfExist ? "Unliked" : "Liked"} the video`
      )
    );
});

// controller to toggle a like on a comment by a loggedIn user
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!(commentId && isValidObjectId(commentId))) {
    throw new ApiError(400, "Valid commentId is required!");
  }

  let deleteLikeIfExist;
  try {
    deleteLikeIfExist = await Like.findOneAndDelete({
      comment: commentId,
      likedBy: req.user,
    });
  } catch (error) {
    throw new ApiError(
      500,
      "Server Error: Something went wrong while toggling comment like!"
    );
  }
  if (!deleteLikeIfExist) {
    await Like.create({
      comment: commentId,
      likedBy: req.user,
    });
  }
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { commentId, likedBy: req.user._id },
        `Successfully ${deleteLikeIfExist ? "Unliked" : "Liked"} the comment`
      )
    );
});

// controller to toggle a like on a tweet by a loggedIn user
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!(tweetId && isValidObjectId(tweetId))) {
    throw new ApiError(400, "Valid tweetId is required!");
  }

  let deleteLikeIfExist;
  try {
    deleteLikeIfExist = await Like.findOneAndDelete({
      tweet: tweetId,
      likedBy: req.user,
    });
  } catch (error) {
    throw new ApiError(500, "Something went wrong while toggling tweet like!");
  }
  if (!deleteLikeIfExist) {
    await Like.create({
      tweet: tweetId,
      likedBy: req.user,
    });
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { tweetId, likedBy: req.user._id },
        `Successfully ${deleteLikeIfExist ? "Unliked" : "Liked"} the tweet`
      )
    );
});

// controller to fetch all liked videos of loggedIn user
const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideosList = await Like.find({
    likedBy: req.user,
    video: { $exists: true },
  });
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        likedVideosList,
        `Successfully fetched ${likedVideosList.length} liked videos`
      )
    );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
