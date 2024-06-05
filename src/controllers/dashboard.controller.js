import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// controller to get channel stats
const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: get channel stats like total video views, total subscribers, total videos, total likes etc.

  // Fetch channel stats of loggedIn user (except total video views as of now)
  const channel = await User.aggregate([
    {
      $match: {
        _id: req.user?._id,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "videos",
      },
    },
    {
      $unwind: {
        path: "$videos",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "videos._id",
        foreignField: "video",
        as: "videos.likedVideos",
      },
    },
    {
      $group: {
        _id: "$_id",
        username: { $first: "$username" },
        fullName: { $first: "$fullName" },
        avatar: { $first: "$avatar" },
        videos: { $push: "$videos" },
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $addFields: {
        totalSubscribersCount: {
          $size: "$subscribers",
        },
        totalVideosCount: {
          $size: "$videos",
        },
        totalLikesCount: {
          $sum: {
            $map: {
              input: "$videos",
              as: "video",
              in: { $size: "$$video.likedVideos" },
            },
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        avatar: 1,
        totalSubscribersCount: 1,
        totalVideosCount: 1,
        totalLikesCount: 1,
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "Channel Stats fetched successfully")
    );
});

// controller to get all channel videos
const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: get all the videos uploaded by the channel

  // fetching all channel videos
  const channelVideos = await User.aggregate([
    {
      $match: {
        _id: req.user?._id,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "videos",
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        avatar: 1,
        videos: 1,
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelVideos[0],
        "Channel Videos fetched successfully"
      )
    );
});

export { getChannelStats, getChannelVideos };
