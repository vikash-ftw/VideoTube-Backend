import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// controller to create a new playlist
const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!(name && description)) {
    throw new ApiError(400, "All fields are required!");
  }
  if ([name, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Empty fields!");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user,
  });
  const createdPlaylist = await Playlist.findById(playlist._id);
  if (!createPlaylist) {
    throw new ApiError(
      500,
      "Server Error: Something went wrong while creating playlist!"
    );
  }
  res
    .status(201)
    .json(
      new ApiResponse(201, createdPlaylist, "Successfully created new playlist")
    );
});

// controller to fetch users multiple playlists
const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!(userId && isValidObjectId(userId))) {
    throw new ApiError(400, "Valid userId is required!");
  }

  const playlist = await Playlist.find({ owner: userId });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        playlist,
        `Successfully fetched ${playlist.length} playlists of user`
      )
    );
});

// controller to fetch playlist by its Id
const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!(playlistId && isValidObjectId(playlistId))) {
    throw new ApiError(400, "Valid playlistId is required!");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(400, "No Playlist found!");
  }
  res
    .status(200)
    .json(new ApiResponse(200, playlist, "Successfully fetched playlist"));
});

// controller to add video to a playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  if (!(playlistId && isValidObjectId(playlistId))) {
    throw new ApiError(400, "Valid playlistId is required!");
  }
  if (!(videoId && isValidObjectId(videoId))) {
    throw new ApiError(400, "Valid videoId is required!");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $push: {
        videos: videoId,
      },
    },
    { new: true }
  );

  if (!updatedPlaylist) {
    throw new ApiError(
      500,
      "Server Error: Something went wrong when adding video to playlist!"
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Successfully added video to a playlist"
      )
    );
});

// controller to remove video from a playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!(playlistId && isValidObjectId(playlistId))) {
    throw new ApiError(400, "Valid playlistId is required!");
  }
  if (!(videoId && isValidObjectId(videoId))) {
    throw new ApiError(400, "Valid videoId is required!");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pullAll: {
        videos: videoId,
      },
    },
    { new: true }
  );

  if (!updatedPlaylist) {
    throw new ApiError(
      500,
      "Server Error: Something went wrong while removing video from playlist!"
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Successfully removed video from a playlist"
      )
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
};
