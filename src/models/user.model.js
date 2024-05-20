import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudinary or aws url
      required: true,
    },
    coverImage: {
      type: String, // cloudinary or aws url
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required!"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// using mongoose hook provided to do some logic before saving data to mongo
// using pre hook to do something before data getting saved
// pre hook accepts two param - 1. event hook 2. callback func
// and using "save" event among many events provided to just do something before saving data
// *IMP* - never use arrow fun as callback bcz we need to use this ref in callback functions so
// use normal function with async as its time consuming process

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    // to check if password is modified or not - if not then next()
    return next();
  }
  // hash() takes two args - 1. data to be encrypted?
  // 2. then num of rounds or salt to use for encryption
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// mongoose schema user-defined function to check password - use async as its time taking
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password); // return boolean flag if matched or not
};

// schema user-defined function to generate access token - it is fast so no use of async
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

// function to generate refresh token - it is fast so no use of async
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
