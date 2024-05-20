import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../services/cloudinary.service.js";

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

export { registerUser };
