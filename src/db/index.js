import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

// async approach
/*
const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );
    console.log(
      `\nMongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MongoDB connection error: ", error);
    process.exit(1);
  }
};
*/

// promise (resolve-reject) approach
// mongoose.connect return a promise - so we do not need to create a promise
// we just use .then and .catch to handle the response
// create a function - inside it handle the promise and then export the function
const connectDB = async () => {
  mongoose
    .connect(`${process.env.MONGODB_URL}/${DB_NAME}`) // .connect() returns promise
    .then((connectionInstance) => {
      console.log(
        `\nMongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
      );
    })
    .catch((error) => {
      console.log("MongoDB connection error: ", error);
      process.exit(1);
    });
};

export default connectDB;
