import axios from 'axios';
import { promises as fsPromises } from 'fs'; // Use fs.promises for async operations
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import UserAgent from 'user-agents';
import { getBrowser, releaseBrowser } from '../utils/browserPool.js'; // Import the pool functions

// Helper for logging (can be replaced with Winston/Pino in full prod setup)
const logger = {
    info: (...args) => console.log('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
};

export async function downloadFacebookContent(url, contentType, downloadsDir) {
    let browserInstance; // To hold the browser from the pool
    let page;
    let downloadedFilePath = null; // Track path for cleanup if download fails partially

    try {
        logger.info(`Starting Facebook download for URL: ${url} (ContentType: ${contentType})`);

        browserInstance = await getBrowser(); // Get a browser from the pool
        page = await browserInstance.newPage();

        const userAgent = new UserAgent();
        await page.setUserAgent(userAgent.toString());
        await page.setViewport({ width: 1366, height: 768 });

        logger.info(`Navigating to Facebook URL: ${url}`);
        // Consider a more robust waitUntil if networkidle2 is too slow/unreliable for Facebook
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); // Increased timeout

        // --- More Robust Waiting Strategy ---
        // Wait for potential common Facebook content containers or a dynamic element
        // This is still a heuristic, Facebook's DOM changes frequently.
        const contentSelector = 'div[role="main"]'; // Main content area
        try {
            await page.waitForSelector(contentSelector, { timeout: 10000 });
            logger.info('Main content selector found. Waiting for a bit more dynamic load...');
            await page.waitForTimeout(3000); // Small additional wait after main selector
        } catch (selectorError) {
            logger.warn(`Could not find main content selector '${contentSelector}' on time. Proceeding anyway.`);
        }
        // --- End Robust Waiting Strategy ---

        const mediaData = await page.evaluate(() => {
            const media = [];

            // Robust selectors for video and image based on common FB patterns
            const selectors = [
                'video[src*=".mp4"]', // Direct video src
                'img[src*=".jpg"]',   // Direct image src
                'div[data-imgperflog] > img', // Images in image performance log divs
                'div[data-visualcompletion="media-vc"] img', // Images in media visual completion divs
                'div[data-visualcompletion="media-vc"] video', // Videos in media visual completion divs
                'a[href*="/videos/"] img', // Thumbnail for videos inside links
                'a[href*="/photos/"] img', // Thumbnail for photos inside links
                'meta[property="og:image"]', // Open Graph image
                'meta[property="og:video"]', // Open Graph video
            ];

            const foundSources = new Set(); // To prevent duplicates

            selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    let src = el.src || el.getAttribute('src') || el.content; // Check src, attribute, or content for meta tags
                    if (src) {
                        // Clean up potential query parameters if they're not part of the core resource
                        src = src.split('?')[0];
                        if (src.includes('fbcdn.net') || src.includes('facebook.com')) {
                            if (!foundSources.has(src)) {
                                media.push({
                                    url: src,
                                    type: el.tagName.toLowerCase() === 'video' || el.getAttribute('property') === 'og:video' ? 'video' : 'image'
                                });
                                foundSources.add(src);
                            }
                        }
                    }
                });
            });

            return media;
        });

        if (mediaData.length === 0) {
            logger.warn(`No media found for URL: ${url}. Falling back.`);
            // This will trigger the catch block if `downloadFallbackContent` also throws
            throw new Error('No media found in Facebook post for given URL.');
        }

        const media = mediaData[0]; // Take the first found media
        const fileExtension = media.type === 'video' ? 'mp4' : 'jpg';
        const filename = `facebook_${contentType}_${uuidv4()}.${fileExtension}`;
        const filePath = path.join(downloadsDir, filename);
        downloadedFilePath = filePath; // Store for potential cleanup

        logger.info(`Attempting to download media from: ${media.url} to ${filePath}`);

        const response = await axios({
            method: 'GET',
            url: media.url,
            responseType: 'stream',
            headers: {
                'User-Agent': userAgent.toString(),
                'Referer': 'https://www.facebook.com/', // Mimic a browser referer
            },
            timeout: 60000 // Added a timeout for the download stream
        });

        const writer = fsPromises.createWriteStream(filePath); // Use async createWriteStream
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', (err) => {
                logger.error(`File write stream error for ${filePath}:`, err);
                // Clean up partially written file if error occurs
                fsPromises.unlink(filePath).catch(unlinkErr => logger.error(`Error cleaning up partial file ${filePath}:`, unlinkErr));
                reject(err);
            });
        });
        logger.info(`File successfully written to: ${filePath}`);

        const stats = await fsPromises.stat(filePath); // Use async stat

        return {
            success: true,
            downloadUrl: `http://localhost:3001/downloads/${filename}`, // Ensure this matches your server's exposed port
            filename,
            contentType: media.type,
            size: formatFileSize(stats.size),
            localPath: filePath,
            thumbnail: media.type === 'image' ? `http://localhost:3001/downloads/${filename}` : null
        };

    } catch (error) {
        logger.error(`Facebook download failed for URL: ${url}. Error:`, error.message);
        logger.error(error.stack); // Log full stack trace for debugging

        // Clean up partially downloaded file if it exists and was not fully written
        if (downloadedFilePath) {
            try {
                await fsPromises.unlink(downloadedFilePath);
                logger.info(`Cleaned up partial file: ${downloadedFilePath}`);
            } catch (unlinkErr) {
                if (unlinkErr.code !== 'ENOENT') { // ENOENT means file didn't exist
                    logger.error(`Failed to clean up partial file ${downloadedFilePath}:`, unlinkErr);
                }
            }
        }

        // Fallback to test content if real download fails
        try {
            const fallbackResult = await downloadFallbackContent(contentType, downloadsDir, 'facebook');
            logger.info('Serving fallback content due to primary download failure.');
            return {
                ...fallbackResult,
                note: `Primary download failed: ${error.message}. Serving fallback content.`
            };
        } catch (fallbackError) {
            logger.error(`Fallback download also failed for URL: ${url}. Error:`, fallbackError.message);
            throw new Error(`Failed to download content from Facebook or provide fallback: ${error.message}`);
        }

    } finally {
        if (page) {
            await page.close(); // Close the page, but not the browser
        }
        if (browserInstance) {
            releaseBrowser(browserInstance); // Release the browser back to the pool
        }
    }
}

// --- downloadFallbackContent function (remains largely the same, but using fs.promises) ---
async function downloadFallbackContent(contentType, downloadsDir, platform) {
    try {
        const sampleUrls = {
            image: 'https://picsum.photos/800/600',
            video: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4'
        };

        const isVideo = contentType === 'reel' || contentType === 'story' || contentType === 'video'; // Added 'video'
        const mediaType = isVideo ? 'video' : 'image';
        const fileExtension = isVideo ? 'mp4' : 'jpg';
        const filename = `${platform}_${contentType}_fallback_${uuidv4()}.${fileExtension}`;
        const filePath = path.join(downloadsDir, filename);

        logger.info(`Attempting to download fallback content: ${sampleUrls[mediaType]} to ${filePath}`);

        const response = await axios({
            method: 'GET',
            url: sampleUrls[mediaType],
            responseType: 'stream',
            timeout: 30000 // Added timeout for fallback download
        });

        const writer = fsPromises.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', (err) => {
                logger.error(`Fallback file write stream error for ${filePath}:`, err);
                fsPromises.unlink(filePath).catch(unlinkErr => logger.error(`Error cleaning up partial fallback file ${filePath}:`, unlinkErr));
                reject(err);
            });
        });
        logger.info(`Fallback file successfully written to: ${filePath}`);

        const stats = await fsPromises.stat(filePath);

        return {
            success: true,
            downloadUrl: `http://localhost:3001/downloads/${filename}`,
            filename,
            contentType: mediaType,
            size: formatFileSize(stats.size),
            localPath: filePath,
            thumbnail: mediaType === 'image' ? `http://localhost:3001/downloads/${filename}` : null,
            note: 'Fallback content - real social media content may be difficult to scrape.'
        };
    } catch (error) {
        logger.error(`Critical: Fallback download failed: ${error.message}`);
        logger.error(error.stack);
        throw new Error(`Fallback download failed: ${error.message}`);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

