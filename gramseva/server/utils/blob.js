const path = require('path');
const { put, del } = require('@vercel/blob');

const randomSuffix = () => Math.random().toString(36).slice(2, 8);

const buildBlobKey = (folder, originalname) => {
  const ext = path.extname(originalname || '').toLowerCase() || '.bin';
  return `${folder}/${Date.now()}-${randomSuffix()}${ext}`;
};

const uploadBufferToBlob = async (folder, file) => {
  if (!file || !file.buffer) throw new Error('No file buffer found for upload');
  const key = buildBlobKey(folder, file.originalname);
  const blob = await put(key, file.buffer, {
    access: 'public',
    addRandomSuffix: false,
    contentType: file.mimetype || undefined,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    filename: path.basename(key),
    originalName: file.originalname,
  };
};

const uploadManyToBlob = async (folder, files = []) => {
  const uploads = [];
  for (const file of files) {
    uploads.push(await uploadBufferToBlob(folder, file));
  }
  return uploads;
};

const deleteBlobByUrl = async (url) => {
  if (!url) return;
  try {
    await del(url);
  } catch (err) {
    console.warn('Blob delete failed:', err.message);
  }
};

const fileNameFromUrl = (url, fallback = 'file') => {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(path.basename(pathname)) || fallback;
  } catch {
    return fallback;
  }
};

const sendRemoteFile = async (res, url, fallbackName, download = false) => {
  const response = await fetch(url);
  if (!response.ok) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const filename = fallbackName || fileNameFromUrl(url);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${filename}"`);
  return res.send(buffer);
};

module.exports = {
  uploadBufferToBlob,
  uploadManyToBlob,
  deleteBlobByUrl,
  sendRemoteFile,
};
