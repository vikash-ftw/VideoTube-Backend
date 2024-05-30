import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isValidObjectId } from "mongoose";

// toggle subscription of channel by logged in user
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!(channelId && isValidObjectId(channelId))) {
    throw new ApiError(400, "Valid channelId is required!");
  }

  let deleteSubscriptionIfExist;
  try {
    deleteSubscriptionIfExist = await Subscription.findOneAndDelete({
      channel: channelId,
      subscriber: req.user,
    });
  } catch (error) {
    throw new ApiError(
      500,
      "Server Error: Something went wrong while toggling subscription!"
    );
  }
  if (!deleteSubscriptionIfExist) {
    await Subscription.create({
      subscriber: req.user,
      channel: channelId,
    });
  }
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { subscriberId: req.user._id, channelId: channelId },
        `User has ${deleteSubscriptionIfExist ? "Unsubscribed" : "Subscribed"} to given channel`
      )
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!(channelId && isValidObjectId(channelId))) {
    throw new ApiError(400, "Valid channelId is required!");
  }

  const subscriberList = await Subscription.find({ channel: channelId });
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriberList,
        `Successfully fetched ${subscriberList.length} Subscribers`
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!(subscriberId && isValidObjectId(subscriberId))) {
    throw new ApiError(400, "Valid subscriberId is required!");
  }

  const channelList = await Subscription.find({ subscriber: subscriberId });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelList,
        `Successfully fetched ${channelList.length} Channels`
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
