import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// controller to create new tweet
const createTweet = asyncHandler(async (req, res) => {
  // fetch content from req body
  const { content } = req.body;
  if (!(content && content?.trim() !== "")) {
    throw new ApiError(400, "Valid Tweet Content is required!");
  }
  const tweet = await Tweet.create({
    content,
    owner: req.user,
  });

  const createdTweet = await Tweet.findById(tweet._id);
  if (!createdTweet) {
    throw new ApiError(
      500,
      "Server Error: Something went wrong while creating tweet!"
    );
  }

  res
    .status(201)
    .json(
      new ApiResponse(201, createdTweet, "Successfully created a new tweet")
    );
});

// controller to update a tweet by tweetId
const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!(tweetId && isValidObjectId(tweetId))) {
    throw new ApiError(400, "Valid tweetId is required!");
  }

  // parse the tweet content from req body
  const { content } = req.body;
  if (!(content && content?.trim() !== "")) {
    throw new ApiError(400, "Valid tweet content is required!");
  }

  // update the tweet
  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!updatedTweet) {
    throw new ApiError(400, "No tweet found with given Id!");
  }

  res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Successfully updated tweet"));
});

// controller to delete a tweet by tweetId
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!(tweetId && isValidObjectId(tweetId))) {
    throw new ApiError(400, "Valid tweetId is required!");
  }

  const deletedTweet = await Tweet.findByIdAndDelete(tweetId);
  if (!deletedTweet) {
    throw new ApiError(400, "No tweet found with given Id!");
  }
  res
    .status(200)
    .json(new ApiResponse(200, deletedTweet, "Successfully deleted tweet"));
});

// controller to fetch User's Tweets
const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!(userId && isValidObjectId(userId))) {
    throw new ApiError(400, "Valid userId is required to fetch tweets!");
  }

  const allTweets = await Tweet.find({ owner: userId });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        allTweets,
        `Fetched ${allTweets.length} tweets of user`
      )
    );
});
export { createTweet, updateTweet, deleteTweet, getUserTweets };
