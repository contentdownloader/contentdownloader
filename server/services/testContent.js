import axios from 'axios';
import { promises as fsPromises } from 'fs'; // Use fs.promises for async operations
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Helper for logging (can be replaced with Winston/Pino in full prod setup)
const logger = {
    info: (...args) => console.log('[INFO][TestContent]', ...args),
    warn: (...args) => console.warn('[WARN][TestContent]', ...args),
    error: (...args) => console.error('[ERROR][TestContent]', ...args),
};

export async function downloadTestContent(url, contentType, downloadsDir) {
  let downloadedFilePath = null; // Track path for cleanup if download fails partially

  try {
    logger.info(`Downloading test content for contentType: ${contentType} (URL: ${url})`);
    
    // Sample content URLs for testing
    // Using more robust sample video links that are less likely to change
    const testContent = {
      post: {
        image: 'https://picsum.photos/800/600?random=1',
        video: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' // Public domain video
      },
      story: {
        image: 'https://picsum.photos/600/800?random=2',
        video: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' // Public domain video
      },
      reel: {
        video: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' // Public domain video
      },
      highlight: {
        image: 'https://picsum.photos/600/600?random=3',
        video: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' // Public domain video
      }
    };

    // Determine media type and URL based on requested contentType
    let mediaType, mediaUrl;
    
    // Ensure contentType is valid before accessing testContent
    const validContentTypes = Object.keys(testContent);
    if (!validContentTypes.includes(contentType)) {
      logger.error(`Invalid contentType for test content: ${contentType}. Falling back to 'post'.`);
      contentType = 'post'; // Default to 'post' if invalid
    }

    if (contentType === 'reel' || contentType === 'highlight' ) {
      // Reels and Highlights are typically videos
      mediaType = 'video';
      mediaUrl = testContent[contentType].video;
    } else {
      // For 'post' or 'story', randomly choose between image and video
      mediaType = Math.random() > 0.5 ? 'video' : 'image';
      mediaUrl = testContent[contentType][mediaType];
    }

    if (!mediaUrl) {
      // Fallback if somehow mediaUrl is not determined
      logger.error(`Could not determine test media URL for contentType: ${contentType}, mediaType: ${mediaType}. Using default image.`);
      mediaType = 'image';
      mediaUrl = testContent.post.image;
    }

    const fileExtension = mediaType === 'video' ? 'mp4' : 'jpg';
    const filename = `test_${contentType}_${uuidv4()}.${fileExtension}`;
    const filePath = path.join(downloadsDir, filename);
    downloadedFilePath = filePath; // Store for potential cleanup

    logger.info(`Downloading test file from: ${mediaUrl} to ${filePath}`);
    const response = await axios({
      method: 'GET',
      url: mediaUrl,
      responseType: 'stream',
      timeout: 60000 // Increased timeout for external download
    });

    const writer = fsPromises.createWriteStream(filePath); // Use async createWriteStream
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', (err) => {
        logger.error(`Test content file write stream error for ${filePath}:`, err);
        // Clean up partially written file if error occurs
        fsPromises.unlink(filePath).catch(unlinkErr => logger.error(`Error cleaning up partial test file ${filePath}:`, unlinkErr));
        reject(err);
      });
    });
    logger.info(`Test file successfully written to: ${filePath}`);

    const stats = await fsPromises.stat(filePath); // Use async stat
    
    return {
      success: true,
      downloadUrl: `http://localhost:3001/downloads/${filename}`,
      filename,
      contentType: mediaType,
      size: formatFileSize(stats.size),
      localPath: filePath,
      // Provide a generic video thumbnail if it's a video, otherwise the image itself
      thumbnail: mediaType === 'image' ? `http://localhost:3001/downloads/${filename}` : `https://via.placeholder.com/300x300?text=Video+Test`,
      note: 'Test content for demonstration and development purposes'
    };

  } catch (error) {
    logger.error('Test content download error:', error.message);
    logger.error(error.stack); // Log full stack trace for debugging

    // Clean up partially downloaded file if it exists and was not fully written
    if (downloadedFilePath) {
        try {
            await fsPromises.unlink(downloadedFilePath);
            logger.info(`Cleaned up partial test file: ${downloadedFilePath}`);
        } catch (unlinkErr) {
            if (unlinkErr.code !== 'ENOENT') { // ENOENT means file didn't exist
                logger.error(`Failed to clean up partial test file ${downloadedFilePath}:`, unlinkErr);
            }
        }
    }
    // Re-throw the error so the main API endpoint catches it and returns a 500
    throw new Error(`Test download failed: ${error.message}`);
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
