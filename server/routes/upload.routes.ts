import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { cloudinary } from "../cloudinary";
import { requireAuth } from "../middleware/auth";

export const uploadRouter = Router();

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv", ".json", ".zip"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("File type not allowed. Supported formats: images (JPG, PNG, WebP, GIF) and documents (PDF, DOC/X, XLS/X, PPT/X, TXT, CSV, JSON, ZIP)."));
    }
    cb(null, true);
  },
});

const uploadsDir = path.join(process.cwd(), "public", "uploads");

// Helper to save locally as fallback with collision-free naming
function saveBufferLocally(buffer: Buffer, originalName: string): { url: string; publicId: string; fileName: string } {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const ext = path.extname(originalName).toLowerCase() || ".bin";
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9._-]/g, "_");
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const fileName = `${Date.now()}_${randomSuffix}_${baseName}${ext}`;
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return {
    url: `/uploads/${fileName}`,
    publicId: fileName,
    fileName,
  };
}

// 1. Multipart Form Upload
uploadRouter.post("/", requireAuth, upload.single("file") as any, async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: "No file provided in upload request." });
    }

    const folder = req.body.folder || "syncsphere/general";
    const customFileName = req.body.fileName || file.originalname || "document";
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const cleanPublicId = `${Date.now()}_${randomSuffix}_${customFileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

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
uploadRouter.post("/base64", requireAuth, async (req: Request, res: Response) => {
  try {
    const { base64Data, fileName, folder = "syncsphere/general" } = req.body;
    if (!base64Data) {
      return res.status(400).json({ success: false, error: "No base64 data provided" });
    }
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const cleanPublicId = `${Date.now()}_${randomSuffix}_${(fileName || "file").replace(/[^a-zA-Z0-9._-]/g, "_")}`;

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

