import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../services/cloudinary.service.js";
import jwt from "jsonwebtoken";

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
  const options = {
    HttpOnly: true,
    Secure: true,
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
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );

  const options = {
    HttpOnly: true,
    Secure: true,
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
    const { newAccessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    // generate response and save new tokens in cookies
    const options = {
      HttpOnly: true,
      Secure: true,
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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
