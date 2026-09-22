/**
 * Cloudinary Storage Client Helper
 * Proxies file uploads to /api/upload to securely persist documents, media, and attachments to Cloudinary.
 */

export interface CloudinaryUploadResponse {
  success: boolean;
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  resourceType?: string;
  originalFilename?: string;
  error?: string;
}

export async function uploadFileToCloudinary(
  file: File | Blob,
  options: {
    folder?: string;
    fileName?: string;
    projectId?: string;
  } = {}
): Promise<CloudinaryUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  if (options.fileName) {
    formData.append('fileName', options.fileName);
  } else if (file instanceof File) {
    formData.append('fileName', file.name);
  }

  const targetFolder = options.folder || (options.projectId ? `syncsphere/projects/${options.projectId}` : 'syncsphere/uploads');
  formData.append('folder', targetFolder);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  let responseText = '';
  try {
    responseText = await response.text();
  } catch (readErr: any) {
    throw new Error(`Failed to read server upload response: ${readErr?.message || 'Network error'}`);
  }

  let data: any = null;
  try {
    data = JSON.parse(responseText);
  } catch {
    // If response was HTML (e.g. 500/502 server error or 404), extract clean message
    if (responseText.includes('<title>') && responseText.includes('</title>')) {
      const match = responseText.match(/<title>(.*?)<\/title>/i);
      const title = match ? match[1] : 'Server Error';
      throw new Error(`Server error (${response.status}): ${title}`);
    }
    throw new Error(`Upload failed (HTTP ${response.status}). Server returned non-JSON response.`);
  }

  if (!response.ok || !data?.success || !data?.url) {
    throw new Error(data?.error || `Upload failed with status HTTP ${response.status}`);
  }

  return data as CloudinaryUploadResponse;
}

export async function uploadBase64ToCloudinary(
  base64Data: string,
  options: {
    folder?: string;
    fileName?: string;
  } = {}
): Promise<CloudinaryUploadResponse> {
  const response = await fetch('/api/upload-base64', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base64Data,
      fileName: options.fileName || 'upload',
      folder: options.folder || 'syncsphere/uploads',
    }),
  });

  const responseText = await response.text().catch(() => '');
  let data: any = null;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Upload error (${response.status}): Unable to process server response.`);
  }

  if (!response.ok || !data?.success || !data?.url) {
    throw new Error(data?.error || `Upload failed with status HTTP ${response.status}`);
  }

  return data as CloudinaryUploadResponse;
}
