import "./env";
import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    console.log(`[Cloudinary] Successfully configured for cloud: ${cloudName}`);
  } catch (err) {
    console.warn("[Cloudinary] Configuration notice:", err);
  }
} else if (process.env.CLOUDINARY_URL) {
  try {
    cloudinary.config({
      secure: true,
    });
    console.log(`[Cloudinary] Successfully configured via CLOUDINARY_URL`);
  } catch (err) {
    console.warn("[Cloudinary] Configuration notice:", err);
  }
} else {
  console.log("[Cloudinary] Notice: Cloudinary credentials not configured in environment variables.");
}

export { cloudinary };

