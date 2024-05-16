// common import style for dotenv
// require("dotenv").config({ path: "./env" });

// module import style for dotenv - allow -r dotenv/config in package.json dev or start attr
import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({ path: "./env" });

// initiate DB connection
connectDB();
