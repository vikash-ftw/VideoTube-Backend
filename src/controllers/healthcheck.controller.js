import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// controller to healthcheck application services are running fine
const healthCheck = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      {
        status: "OK",
        uptime: `${process.uptime()} seconds`,
        databaseStatus: `${mongoose.connection.readyState == 1 ? "Connected" : "Not Connected!"}`,
      },
      "Application is running"
    )
  );
});

export { healthCheck };
