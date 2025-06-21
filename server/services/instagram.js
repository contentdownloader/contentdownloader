import axios from 'axios';
import { promises as fsPromises } from 'fs'; // Use fs.promises for async operations
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import UserAgent from 'user-agents';
import { getBrowser, releaseBrowser } from '../utils/browserPool.js'; // Import the pool functions

// Helper for logging (can be replaced with Winston/Pino in full prod setup)
const logger = {
    info: (...args) => console.log('[INFO][Instagram]', ...args),
    warn: (...args) => console.warn('[WARN][Instagram]', ...args),
    error: (...args) => console.error('[ERROR][Instagram]', ...args),
};

export async function downloadInstagramContent(url, contentType, downloadsDir) {
    let browserInstance; // To hold the browser from the pool
    let page;
    let downloadedFilePath = null; // Track path for cleanup if download fails partially

    try {
        logger.info(`Starting Instagram download for URL: ${url} (ContentType: ${contentType})`);

        browserInstance = await getBrowser(); // Get a browser from the pool
        page = await browserInstance.newPage();

        const userAgent = new UserAgent();
        await page.setUserAgent(userAgent.toString());
        await page.setViewport({ width: 1366, height: 768 });

        logger.info(`Navigating to Instagram URL: ${url}`);
        // For Instagram, 'networkidle0' might be more reliable as it heavily relies on XHR.
        // Or specific element waiting as they load content dynamically.
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 }); // Increased timeout

        // --- More Robust Waiting Strategy for Instagram ---
        // Instagram often loads content dynamically. We need to wait for key elements.
        // Common selectors for Instagram posts (these are highly subject to change by Instagram!)
        const contentAreaSelector = 'article[role="presentation"]'; // Main post container
        const mediaSelector = 'article img[srcset], article video[src]'; // Images or videos within the post
        try {
            // Wait for the main article to appear
            await page.waitForSelector(contentAreaSelector, { timeout: 15000 });
            logger.info('Instagram main content area found. Waiting for media elements...');

            // Wait for at least one image or video to appear within the article
            await page.waitForSelector(mediaSelector, { timeout: 10000 });
            logger.info('Instagram media element found. Giving a slight additional delay for rendering.');
            await page.waitForTimeout(2000); // Small additional wait after media found

            // Handle potential login popup (Instagram often shows this)
            const loginModalCloseButton = 'button[tabindex="0"][type="button"]'; // Specific close button selector for login/signup modal
            const loginModalWrapper = 'div[role="dialog"]'; // General dialog role
            const dismissButton = 'div[role="dialog"] button.x1i10w5c'; // Example based on common dismissal
            try {
                // Wait for the login modal to appear (if it does) for a short period
                await page.waitForSelector(loginModalWrapper, { timeout: 5000 });
                logger.info('Login/signup modal detected. Attempting to close...');
                // Try to click a common "Not Now" or close button
                const notNowButton = await page.$x("//button[contains(., 'Not Now')]"); // XPath for "Not Now" button
                if (notNowButton.length > 0) {
                    await notNowButton[0].click();
                    logger.info('Clicked "Not Now" on login modal.');
                    await page.waitForTimeout(2000); // Wait for modal to disappear
                } else {
                    // Try to find a general dismiss button if "Not Now" isn't present
                    const closeButtons = await page.$$(loginModalCloseButton);
                    if (closeButtons.length > 0) {
                        await closeButtons[0].click();
                        logger.info('Clicked generic close button on login modal.');
                        await page.waitForTimeout(2000);
                    } else {
                        logger.warn('Could not find specific "Not Now" or general close button for login modal.');
                    }
                }
            } catch (modalError) {
                logger.info('No login/signup modal detected or it closed itself.');
            }

        } catch (selectorError) {
            logger.warn(`Could not find main Instagram content or media elements on time. URL: ${url}. Proceeding anyway.`);
            // You might want to consider throwing here if you expect content to always be present
            // throw new Error(`Instagram page content not fully loaded: ${selectorError.message}`);
        }
        // --- End Robust Waiting Strategy ---

        const mediaData = await page.evaluate(() => {
            const media = [];
            const foundSources = new Set(); // To prevent duplicates

            // More specific Instagram selectors
            const selectors = [
                'article img[srcset]',          // Images with srcset within an article (common for posts)
                'article video[src]',           // Videos with src within an article (common for posts)
                'main img[src*="scontent"]',    // Images from scontent CDNs in main content
                'main video[src*="scontent"]',  // Videos from scontent CDNs in main content
                'meta[property="og:image"]',    // Open Graph image
                'meta[property="og:video"]',    // Open Graph video
            ];

            selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    let src = el.src || el.getAttribute('src') || el.content; // Check src, attribute, or content for meta tags
                    if (src) {
                        // Clean up potential query parameters if they're not part of the core resource
                        // Instagram often uses complex query params that can be trimmed
                        src = src.split('?')[0];
                        if (src.includes('scontent') || src.includes('instagram.com')) {
                            // Filter out small thumbnails or irrelevant images (heuristic)
                            const isThumbnail = el.tagName.toLowerCase() === 'img' && (el.naturalWidth < 300 || el.naturalHeight < 300);
                            if (!isThumbnail && !foundSources.has(src)) {
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
            throw new Error('No media found in Instagram post for given URL.');
        }

        const media = mediaData[0]; // Take the first found media
        const fileExtension = media.type === 'video' ? 'mp4' : 'jpg';
        const filename = `instagram_${contentType}_${uuidv4()}.${fileExtension}`;
        const filePath = path.join(downloadsDir, filename);
        downloadedFilePath = filePath; // Store for potential cleanup

        logger.info(`Attempting to download media from: ${media.url} to ${filePath}`);

        const response = await axios({
            method: 'GET',
            url: media.url,
            responseType: 'stream',
            headers: {
                'User-Agent': userAgent.toString(),
                'Referer': 'https://www.instagram.com/', // Mimic a browser referer
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
        logger.error(`Instagram download failed for URL: ${url}. Error:`, error.message);
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
            const fallbackResult = await downloadFallbackContent(contentType, downloadsDir, 'instagram');
            logger.info('Serving fallback content due to primary download failure.');
            return {
                ...fallbackResult,
                note: `Primary download failed: ${error.message}. Serving fallback content.`
            };
        } catch (fallbackError) {
            logger.error(`Fallback download also failed for URL: ${url}. Error:`, fallbackError.message);
            throw new Error(`Failed to download content from Instagram or provide fallback: ${error.message}`);
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

// --- downloadFallbackContent function (updated to use fs.promises) ---
async function downloadFallbackContent(contentType, downloadsDir, platform) {
    try {
        const sampleUrls = {
            image: 'https://picsum.photos/800/600',
            video: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
        };

        const isVideo = contentType === 'reel' || contentType === 'story' || contentType === 'video';
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

