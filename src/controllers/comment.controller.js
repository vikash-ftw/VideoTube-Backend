import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

// controller to add comment on video
const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // validating videoId
  if (!(videoId && isValidObjectId(videoId))) {
    throw new ApiError(400, "Valid videoId is required!");
  }

  // fetching and validating comment content
  const { content } = req.body;
  if (!(content && content?.trim() !== "")) {
    throw new ApiError(400, "Valid content is required!");
  }
  // create comment
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user,
  });

  const createdComment = await Comment.findById(comment._id);
  if (!createdComment) {
    throw new ApiError(
      500,
      "Server Error: Something went wrong while creating comment!"
    );
  }
  res
    .status(201)
    .json(new ApiResponse(201, createdComment, "Comment created successfully"));
});

// controller to update comment by commentId
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!(commentId && isValidObjectId(commentId))) {
    throw new ApiError(400, "Valid commentId is required!");
  }

  const { content } = req.body;
  if (!(content && content?.trim() !== "")) {
    throw new ApiError(400, "Valid content is required!");
  }

  // update comment
  const comment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );
  if (!comment) {
    throw new ApiError(400, "No comment found with given commentId!");
  }
  res
    .status(200)
    .json(new ApiResponse(200, comment, "Successfully updated comment"));
});

// controller to delete comment by commentId
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!(commentId && isValidObjectId(commentId))) {
    throw new ApiError(400, "Valid commentId is required!");
  }

  const deletedComment = await Comment.findByIdAndDelete(commentId);
  if (!deletedComment) {
    throw new ApiError(400, "No comment found with given commentId!");
  }
  res
    .status(200)
    .json(new ApiResponse(200, deletedComment, "Comment deleted successfully"));
});

// controller to fetch all video comments in pagination
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10, sortBy, sortType } = req.query;

  if (!(videoId && isValidObjectId(videoId))) {
    throw new ApiError(400, "Valid videoId is required!");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "No video found with given videoId!");
  }

  // Preparing query object
  const queryObj = { video: video._id };

  // Preparing sort object
  let sortObj = {};
  // if supplied
  if (sortBy && sortType) {
    sortObj[sortBy] = sortType === "desc" ? -1 : 1;
  } else {
    // otherwise default sort
    sortObj["createdAt"] = -1;
  }

  // Create the aggregation Pipeline
  const pipeline = [{ $match: queryObj }, { $sort: sortObj }];

  // Paginate with mongoose-paginate-v2
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  console.log("queryObj: ", queryObj);
  console.log("sortObj: ", sortObj);
  try {
    const result = await Comment.aggregatePaginate(
      Comment.aggregate(pipeline),
      options
    );
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    throw new ApiError(
      500,
      "Server Error: Something went wrong while fetching all video's comments in pagination!"
    );
  }
});

export { addComment, updateComment, deleteComment, getVideoComments };
