// common import style for dotenv
// require("dotenv").config({ path: "./env" });

// module import style for dotenv - allow -r dotenv/config in package.json dev or start attr
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({ path: "./env" });

// initiate DB connection
connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB connection failed!! : ", error);
  });
