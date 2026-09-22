import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { cloudinary } from "../cloudinary";

export const uploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const uploadsDir = path.join(process.cwd(), "public", "uploads");

// Helper to save locally as fallback
function saveBufferLocally(buffer: Buffer, originalName: string): { url: string; publicId: string; fileName: string } {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const ext = path.extname(originalName) || ".bin";
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}_${baseName}${ext}`;
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return {
    url: `/uploads/${fileName}`,
    publicId: fileName,
    fileName,
  };
}

// 1. Multipart Form Upload
uploadRouter.post("/", upload.single("file") as any, async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: "No file provided in upload request." });
    }

    const folder = req.body.folder || "syncsphere/general";
    const customFileName = req.body.fileName || file.originalname || "document";
    const cleanPublicId = `${Date.now()}_${customFileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    // Attempt Cloudinary upload
    try {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: "auto",
            public_id: cleanPublicId,
            use_filename: true,
            unique_filename: true,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      return res.json({
        success: true,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        bytes: uploadResult.bytes || file.size,
        format: uploadResult.format || file.mimetype,
        resourceType: uploadResult.resource_type,
        originalFilename: file.originalname,
      });
    } catch (cloudErr: any) {
      console.warn("[Upload Service] Cloudinary storage notice (falling back to local server storage):", cloudErr?.message || cloudErr);
      const local = saveBufferLocally(file.buffer, file.originalname || customFileName);
      return res.json({
        success: true,
        url: local.url,
        publicId: local.publicId,
        bytes: file.size,
        format: file.mimetype,
        resourceType: "local",
        originalFilename: file.originalname,
        localFallback: true,
      });
    }
  } catch (error: any) {
    console.error("Upload handler failed:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to process file upload",
    });
  }
});

// 2. Base64 Upload
uploadRouter.post("/base64", async (req: Request, res: Response) => {
  try {
    const { base64Data, fileName, folder = "syncsphere/general" } = req.body;
    if (!base64Data) {
      return res.status(400).json({ success: false, error: "No base64 data provided" });
    }
    const cleanPublicId = `${Date.now()}_${(fileName || "file").replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    try {
      const result = await cloudinary.uploader.upload(base64Data, {
        folder,
        resource_type: "auto",
        public_id: cleanPublicId,
      });
      return res.json({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        bytes: result.bytes,
        format: result.format,
        originalFilename: fileName,
      });
    } catch (cloudErr: any) {
      console.warn("[Upload Service] Cloudinary base64 notice (falling back to local buffer storage):", cloudErr?.message || cloudErr);
      const pureBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(pureBase64, "base64");
      const local = saveBufferLocally(buffer, fileName || "upload.png");
      return res.json({
        success: true,
        url: local.url,
        publicId: local.publicId,
        bytes: buffer.length,
        format: "base64",
        originalFilename: fileName,
        localFallback: true,
      });
    }
  } catch (error: any) {
    console.error("Cloudinary base64 upload error:", error);
    return res.status(500).json({ success: false, error: error?.message || "Upload failed" });
  }
});

