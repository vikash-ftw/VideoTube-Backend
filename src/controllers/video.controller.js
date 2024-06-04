import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../services/cloudinary.service.js";
import mongoose, { isValidObjectId } from "mongoose";

// publish new video
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

// get video by Id
const getVideoById = asyncHandler(async (req, res) => {
  // fetch id from url path
  const { videoId } = req.params;
  if (!(videoId && isValidObjectId(videoId))) {
    throw new ApiError(400, "Valid videoId is required!");
  }
  // find the video by id
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found with given Id!");
  }
  // prepare response
  res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

// update video details like title, description & thumbnail
const updateVideo = asyncHandler(async (req, res) => {
  // fetch videoId from params
  const { videoId } = req.params;
  if (!(videoId && isValidObjectId(videoId))) {
    throw new ApiError(400, "Valid videoId is required!");
  }

  // get video
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found with given Id!");
  }

  // authorize current loggedIn user and video owner are same
  if (video.owner.equals(req.user)) {
    throw new ApiError(401, "Unauthorized to update video details!");
  }
  // now fetch the updated details and thumbnail file from req
  const { title, description } = req.body;
  if (!(title && description)) {
    throw new ApiError(400, "All fields are required!");
  }
  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Some field are empty!");
  }
  const thumbnailLocalPath = req.file?.path;
  if (!thumbnailLocalPath) {
    throw new Error(400, "Thumbnail file is required!");
  }
  // upload on cloudinary
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnail?.url) {
    throw new ApiError(500, "Server Error: thumbnail uploading failed!");
  }

  // update details
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnail.url,
      },
    },
    { new: true }
  );
  // prepare response
  res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Video details updated successfully")
    );
});

// delete a video by Id
const deleteVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!(videoId && isValidObjectId(videoId))) {
    throw new ApiError(400, "Valid videoId is required!");
  }
  // get video
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found with given Id!");
  }
  // authorize current loggedIn user and video owner are same
  if (video.owner.equals(req.user)) {
    throw new ApiError(401, "Unauthorized to delete video!");
  }

  // deletes the video
  const deletedVideo = await Video.findByIdAndDelete(videoId);
  if (!deletedVideo) {
    throw new ApiError(
      500,
      "Server Error: Something went wrong while deleting video!"
    );
  }

  // prepare response
  res
    .status(200)
    .json(new ApiResponse(200, { deletedVideo }, "video deleted successfully"));
});

// toggle publish status
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!(videoId && isValidObjectId(videoId))) {
    throw new ApiError(400, "Valid videoId is required!");
  }
  // get video
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found with given Id!");
  }
  // authorize current loggedIn user and video owner are same
  if (video.owner.equals(req.user)) {
    throw new ApiError(401, "Unauthorized to toggle video publish status!");
  }

  // store current status
  const toggleStatus = video.isPublished;
  // now change the status
  try {
    video.isPublished = !video.isPublished;
    await video.save({ validateBeforeSave: false });
  } catch (error) {
    throw new ApiError(
      500,
      "Server Error: Something went wrong while toggling video publish status!"
    );
  }

  // prepare response
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        `Successfully set video publish status to ${!toggleStatus}`
      )
    );
});

// fetch all videos via pagination based on query, sort, limit, offset
const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  // validating the userId field
  if (!(userId && isValidObjectId(userId))) {
    throw new ApiError(400, "Valid userId is required!");
  }

  // fetching user from userId
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(400, "No user found with given userId!");
  }

  // Preparing the query object
  let queryObj = {};
  if (query) {
    // Assuming query is a JSON string, parse it into an object
    queryObj = JSON.parse(query);
  }
  if (user) {
    queryObj.owner = user._id;
  }

  // Preparing sort object
  let sortObj = {};
  // if supplied
  if (sortBy && sortType) {
    sortObj[sortBy] = sortType === "desc" ? -1 : 1;
  } else {
    // otherwise default sort
    sortObj["createdAt"] = -1;
  }

  // Create the aggregation pipeline
  const pipeline = [{ $match: queryObj }, { $sort: sortObj }];

  // Paginate with mongoose-paginate-v2
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  console.log("queryObj: ", queryObj);
  console.log("sortObj: ", sortObj);
  try {
    const result = await Video.aggregatePaginate(
      Video.aggregate(pipeline),
      options
    );
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    throw new ApiError(
      500,
      "Server Error: Something went wrong while fetching all videos in pagination!"
    );
  }
});

export {
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideoById,
  togglePublishStatus,
  getAllVideos,
};
