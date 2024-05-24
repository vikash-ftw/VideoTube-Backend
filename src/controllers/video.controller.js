import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../services/cloudinary.service.js";
import mongoose, { isValidObjectId } from "mongoose";

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // field validation present and not empty
  if (!(title && description)) {
    throw new ApiError(400, "All fields are required!");
  }
  // validating empty space values in fields
  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Some fields have empty space in value!");
  }

  // storing video and thumbnail on public local path
  let videoFileLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.videoFile) &&
    req.files.videoFile.length > 0
  ) {
    videoFileLocalPath = req.files.videoFile[0].path;
  }
  let thumbnailLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail.length > 0
  ) {
    thumbnailLocalPath = req.files.thumbnail[0].path;
  }
  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video file is required!");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail file is required!");
  }
  // upload videoFile and thumbnail on cloudinary
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new ApiError(500, "Video file upload failed!");
  }
  if (!thumbnail) {
    throw new ApiError(500, "Thumbnail file upload failed!");
  }

  // validating user ObjectId
  if (!isValidObjectId(new mongoose.Types.ObjectId(req?.user?._id))) {
    throw new ApiError(500, "Can not fetch Owner Id!");
  }
  // creating video document object
  const video = await Video.create({
    title,
    description,
    owner: new mongoose.Types.ObjectId(req?.user?._id),
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    duration: videoFile.duration,
  });
  // checking if document created successfully
  const createdVideo = await Video.findById(video._id).select("-views -owner");
  if (!createdVideo) {
    throw new ApiError(500, "Something went wrong while publishing the video!");
  }
  // crafting response
  res
    .status(201)
    .json(new ApiResponse(200, createdVideo, "Video published successfully"));
});

export { publishAVideo };
