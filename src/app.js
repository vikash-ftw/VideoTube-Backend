import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// configure the cors
// app.use(cors()) // normal configured
// prod based configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // to manage req origin source ex- origin: 'http://example.com'
    credentials: true, // allow cookies on cross-origin requests
  })
);

// configure the data type we receive in request
app.use(
  express.json({
    limit: "25kb", // limit data size
  })
);

// configure the url encoder for url data like %20 and +
app.use(
  express.urlencoded({
    extended: true, // allow objects in objects - nested objects - not used mostly
    limit: "25kb",
  })
);

// configure the file local storage on server - local asset storage on public folder
app.use(express.static("public")); // here public is the folder name

// configure the cookie handling
app.use(cookieParser());

// import routes
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";

// user routes
app.use("/api/v1/users", userRouter);
// video routes
app.use("/api/v1/videos", videoRouter);
// subscription based routes
app.use("/api/v1/subscriptions", subscriptionRouter);

export { app };
