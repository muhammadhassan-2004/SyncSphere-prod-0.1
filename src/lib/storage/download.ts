/**
 * File Download Helper
 * Downloads remote files (Cloudinary URLs, Blob URLs, or external assets) directly to the user's computer.
 */

export async function triggerFileDownload(url: string, fileName: string): Promise<void> {
  if (!url || url === '#') {
    console.warn('Cannot download empty URL');
    return;
  }

  // If already a valid blob URL
  if (url.startsWith('blob:')) {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  try {
    // Attempt CORS blob fetch for direct download attribution
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 2000);
  } catch (err) {
    // Fallback: direct window or anchor navigation
    console.info('Direct fetch download fallback for:', url, err);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'download';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
