import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../services/cloudinary.service.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// function to generate accessToken and refreshToken
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    // save refreshToken in user
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while token generation");
  }
};

// register controller
const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty and should be valid values
  // check if user already exists : check by username or email
  // check for images, check for avatar value i.e image type
  // if avatar image present - upload it to cloudinary
  // create user object - create entry in db
  // for success response body - send details back - remove password & refresh token
  // check for user creation
  // return the response back to client

  // 1. get details
  const { fullName, email, username, password } = req.body;
  // 2. perform validation
  /* // beginner uses this multiple if's for every field
  if(fullName === "") {
    throw new ApiError(400, "fullName is required")
  }
  */
  // best practices
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required!");
  }
  // 3. check if user exists
  // checking on both email or username
  // using await for db operations
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // 4. check for images
  // as we added middleware for multer it added .files() func in req object

  // undefined not handled properly so commented
  // const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0].path;
  // new basic if approach
  let avatarLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
  }
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required!");
  }

  // 5. upload them to cloudinary
  // as file uploading may take time and we need to wait for it response - use await
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required!");
  }

  // 6. create user object
  const user = await User.create({
    fullName,
    email,
    username,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // 7. check if user created
  // not optimal way as extra db query is hit
  // but currently it serves basic functionality so good to go
  // but it has one advantage as we can use select query to exclude fields in client response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user!");
  }

  // 8. crafting the client response
  res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

// login controller
const loginUser = asyncHandler(async (req, res) => {
  // 1. fetch username email password from req body
  // 2. login by username or email
  // 3. fetch the user from db
  // 4. password checking
  // 5. generate accessToken and refreshToken
  // 6. set secure cookies and reponse for client

  const { username, email, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required!");
  }

  const fetchedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!fetchedUser) {
    throw new ApiError(404, "User does not exist!");
  }

  // password checking
  const isPasswordValid = await fetchedUser.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials!");
  }

  // generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    fetchedUser._id
  );

  // fetch the loggedIn user again
  const loggedInUser = await User.findById(fetchedUser._id).select(
    "-password -refreshToken"
  );
  // options to enable secure cookie - only server can modify cookies
  // at development level - set secure to false bcz it works well with HTTPS
  // at production level - set secure to true and httpOnly to false
  const options = {
    httpOnly: true,
    secure: false,
  };

  // setting secure cookies for tokens with options
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User Logged In Successfully"
      )
    );
});

// logout
const logoutUser = asyncHandler(async (req, res) => {
  // added user attr in req object by middleware
  // remove the refresh token from user document in DB
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 }, // this removes the field from document
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: false,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

// endpoint to regenerate accessToken via refreshToken stored in db
const refreshAccessToken = asyncHandler(async (req, res) => {
  // fetch refreshToken from client req
  const receivedRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;
  // check if valid or not
  if (!receivedRefreshToken) {
    throw new ApiError(401, "Unauthorized Request!");
  }

  try {
    // verify and decode refreshToken payload data
    const decodedToken = await jwt.verify(
      receivedRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    // accessing payload data and querying db to fetch user details
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token!");
    }

    // now match the encoded received token with token saved in db
    if (receivedRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used!");
    }

    // regenerate new accessToken and refreshToken
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    // generate response and save new tokens in cookies
    const options = {
      httpOnly: true,
      secure: false,
    };

    return res
      .status(200)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken: newAccessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// change password
const changeUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  // since auth middleware is added - it gives us user object via req.user
  const user = await User.findById(req?.user?._id);
  // checking received old password is correct
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password!");
  }

  // set new password - new hashed password will be saved by pre hook in user model
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// fetch current user
const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req?.user) {
    throw new ApiError(401, "Unauthorized Access!");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// update user account details
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!(fullName && email)) {
    throw new ApiError(400, "All fields are required!");
  }

  const user = await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// update user avatar - good practice to separate file based updation from text based updation
const updateUserAvatar = asyncHandler(async (req, res) => {
  // multer added req.file attribute
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar?.url) {
    throw new ApiError(500, "Avatar file upload failed!");
  }

  const user = await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User Avatar updated successfully"));
});

// update user cover image
const updateUserCoverImage = asyncHandler(async (req, res) => {
  // multer added req.file attribute
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "CoverImage file is missing!");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage?.url) {
    throw new ApiError(500, "CoverImage file upload failed!");
  }

  const user = await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User CoverImage updated successfully"));
});

// get User channel profile
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "username is missing in url!");
  }

  // using aggregation pipeline
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
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
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist");
  }

  console.log("channel info: ", channel);
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

// get user video watch history
const getWatchHistory = asyncHandler(async (req, res) => {
  // using aggregation pipeline
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req?.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "User's watchHistory fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeUserPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
