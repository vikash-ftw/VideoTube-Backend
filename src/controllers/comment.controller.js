import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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
    throw new ApiError(400, "Valid commentId is required");
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
    throw new ApiError(
      500,
      "Server Error: Something went wrong while updating comment!"
    );
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
    throw new ApiError(400, "Comment not found!");
  }
  res
    .status(200)
    .json(new ApiResponse(200, deletedComment, "Comment deleted successfully"));
});

export { addComment, updateComment, deleteComment };
