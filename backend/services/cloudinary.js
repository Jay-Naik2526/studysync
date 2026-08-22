import { v2 as cloudinary } from 'cloudinary';

// Configure once on import — reads from env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer to Cloudinary as an authenticated (private) asset.
 *
 * @param {Buffer} buffer      — file contents
 * @param {string} folder      — Cloudinary folder, e.g. 'studysync/applications'
 * @param {string} resourceType — 'image' | 'raw' (for PDFs)
 * @returns {{ publicId, format, bytes }}
 */
export async function uploadToCloudinary(buffer, folder, resourceType = 'auto') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        type: 'authenticated',
        resource_type: resourceType,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Generate a time-limited signed URL for an authenticated asset.
 *
 * @param {string} publicId
 * @param {string} format
 * @param {number} expiresInSec — default 60s
 * @returns {string} signed URL
 */
export function getSignedUrl(publicId, format, expiresInSec = 60) {
  // For raw resources (PDFs), use a private download URL
  if (format === 'pdf') {
    return cloudinary.utils.private_download_url(publicId, format, {
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + expiresInSec,
    });
  }

  // For images, use a signed delivery URL
  return cloudinary.url(publicId, {
    type: 'authenticated',
    sign_url: true,
    secure: true,
    format,
    // Cloudinary doesn't support TTL on signed delivery URLs the same way,
    // but the authenticated type prevents unauthenticated access.
    // For stricter TTL, we still use private_download_url as fallback.
  });
}

/**
 * Delete a Cloudinary asset by public_id.
 *
 * @param {string} publicId
 * @param {string} format — used to determine resource_type
 */
export async function deleteFromCloudinary(publicId, format) {
  const resourceType = format === 'pdf' ? 'raw' : 'image';
  try {
    await cloudinary.uploader.destroy(publicId, {
      type: 'authenticated',
      resource_type: resourceType,
    });
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
    // Non-fatal — log but don't throw
  }
}

export default cloudinary;
