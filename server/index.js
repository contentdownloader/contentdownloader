import express from 'express';
import cors from 'cors';
import path from 'path';
import { promises as fsPromises } from 'fs'; // Use fs.promises for async operations
import { fileURLToPath } from 'url';
import { downloadInstagramContent } from './services/instagram.js'; // Ensure this is also async-ready
import { downloadFacebookContent } from './services/facebook.js';
import { downloadTestContent } from './services/testContent.js'; // Ensure this is also async-ready
import { closeAllBrowsers } from './utils/browserPool.js'; // Import closeAllBrowsers

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Helper for logging (can be replaced with Winston/Pino)
const logger = {
  info: (...args) => console.log('[SERVER INFO]', ...args),
  warn: (...args) => console.warn('[SERVER WARN]', ...args),
  error: (...args) => console.error('[SERVER ERROR]', ...args),
};

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, 'downloads');
(async () => {
  try {
    await fsPromises.access(downloadsDir); // Check if directory exists
    logger.info(`Downloads directory already exists: ${downloadsDir}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.info(`Downloads directory does not exist. Creating: ${downloadsDir}`);
      await fsPromises.mkdir(downloadsDir, { recursive: true });
      logger.info('Downloads directory created successfully.');
    } else {
      logger.error('Error checking or creating downloads directory:', error);
      // Critical error, consider exiting or handling
    }
  }
})();


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded bodies

// Serve static files from downloads directory
app.use('/downloads', express.static(downloadsDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Social Media Downloader API is running' });
});

// Download endpoint
app.post('/api/download', async (req, res, next) => { // Added next for error middleware
  try {
    const { url, platform, contentType } = req.body;

    // --- Robust Input Validation ---
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return res.status(400).json({ error: 'URL is required and must be a non-empty string.' });
    }
    // Basic URL format check (can be more rigorous with a regex or validator library)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return res.status(400).json({ error: 'Invalid URL format. Must start with http:// or https://' });
    }

    const allowedPlatforms = ['instagram', 'facebook', 'test']; // 'test' is for the test-content service
    if (!platform || typeof platform !== 'string' || !allowedPlatforms.includes(platform.toLowerCase())) {
      return res.status(400).json({ error: `Platform is required and must be one of: ${allowedPlatforms.join(', ')}.` });
    }

    const allowedContentTypes = ['image', 'video', 'reel', 'story']; // Adjust as per your actual content types
    if (!contentType || typeof contentType !== 'string' || !allowedContentTypes.includes(contentType.toLowerCase())) {
      return res.status(400).json({ error: `ContentType is required and must be one of: ${allowedContentTypes.join(', ')}.` });
    }
    // --- End Robust Input Validation ---

    let result;
    const lowerCasePlatform = platform.toLowerCase();
    const lowerCaseContentType = contentType.toLowerCase();

    // Check if it's a test URL or 'test' platform
    if (url.includes('test-content') || url.includes('demo') || lowerCasePlatform === 'test') {
      result = await downloadTestContent(url, lowerCaseContentType, downloadsDir);
    } else if (lowerCasePlatform === 'instagram') {
      result = await downloadInstagramContent(url, lowerCaseContentType, downloadsDir);
    } else if (lowerCasePlatform === 'facebook') {
      result = await downloadFacebookContent(url, lowerCaseContentType, downloadsDir);
    } else {
        // This case should ideally not be reached due to `allowedPlatforms` check
        return res.status(400).json({ error: 'Unsupported platform.' });
    }

    res.json(result);
  } catch (error) {
    logger.error('Download request processing error:', error.message);
    logger.error(error.stack); // Log full stack trace
    // Pass the error to the next error handling middleware
    next(error);
  }
});

// Get download progress (Still a placeholder)
app.get('/api/download/:id/progress', (req, res) => {
  const { id } = req.params;
  // In a real implementation, you'd track progress in a database or cache
  logger.info(`Request for download progress for ID: ${id}`);
  res.json({
    id,
    progress: Math.floor(Math.random() * 100), // Placeholder for actual progress
    status: 'downloading',
    message: 'Progress tracking not fully implemented yet.'
  });
});

// List downloaded files
app.get('/api/downloads', async (req, res, next) => { // Added next for error middleware
  try {
    const files = await fsPromises.readdir(downloadsDir);
    const filesData = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(downloadsDir, filename);
        try {
          const stats = await fsPromises.stat(filePath);
          return {
            filename,
            size: stats.size,
            created: stats.birthtime,
            downloadUrl: `http://localhost:${PORT}/downloads/${filename}`,
          };
        } catch (statError) {
          logger.warn(`Could not stat file ${filePath}:`, statError.message);
          return null; // Skip files that can't be stat-ed (e.g., deleted during processing)
        }
      })
    );
    res.json(filesData.filter(Boolean)); // Filter out nulls
  } catch (error) {
    logger.error('Failed to list downloads:', error.message);
    next(error);
  }
});

// Delete downloaded file
app.delete('/api/downloads/:filename', async (req, res, next) => { // Added next for error middleware
  try {
    const { filename } = req.params;

    // --- Filename Sanitization for Security ---
    // Prevent path traversal
    if (filename.includes('/') || filename.includes('..') || path.isAbsolute(filename)) {
        logger.warn(`Attempted malicious filename deletion: ${filename}`);
        return res.status(400).json({ error: 'Invalid filename. Path traversal attempts detected.' });
    }
    // Optional: Add regex to only allow specific characters in filenames
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) { // Example: alphanumeric, _, -, .
        logger.warn(`Filename contains disallowed characters: ${filename}`);
        return res.status(400).json({ error: 'Invalid filename characters.' });
    }
    // --- End Filename Sanitization ---

    const filePath = path.join(downloadsDir, filename);

    try {
      await fsPromises.access(filePath); // Check if file exists
      await fsPromises.unlink(filePath);
      logger.info(`File deleted successfully: ${filePath}`);
      res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`Attempted to delete non-existent file: ${filePath}`);
        res.status(404).json({ error: 'File not found' });
      } else {
        logger.error(`Failed to delete file ${filePath}:`, error.message);
        next(error); // Pass other errors to the error handling middleware
      }
    }
  } catch (error) {
    logger.error('Error processing delete request:', error.message);
    next(error);
  }
});


// --- Centralized Error Handling Middleware ---
app.use((err, req, res, next) => {
  logger.error('Unhandled error caught by middleware:', err.message);
  logger.error(err.stack); // Log stack trace for all errors

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'An unexpected error occurred on the server.' : err.message;

  res.status(statusCode).json({
    error: true,
    message: message,
    // In production, avoid sending detailed error info to client unless needed for specific debugging and secured.
    // For now, keeping error.message for dev/testing clarity.
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    code: err.code || undefined // useful for file system errors like 'ENOENT'
  });
});
// --- End Centralized Error Handling Middleware ---


const server = app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Downloads will be saved to: ${downloadsDir}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
        logger.info('HTTP server closed.');
        await closeAllBrowsers(); // Close Puppeteer browsers
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(async () => {
        logger.info('HTTP server closed.');
        await closeAllBrowsers(); // Close Puppeteer browsers
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err.message);
    logger.error(err.stack);
    // It's often recommended to exit on uncaught exceptions
    // to prevent the process from entering an inconsistent state.
    server.close(async () => {
        logger.info('HTTP server closed due to uncaught exception.');
        await closeAllBrowsers();
        process.exit(1); // Exit with a failure code
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason.message || reason);
    logger.error(reason.stack || 'No stack trace available for unhandled rejection.');
    // In production, you might want to gracefully shut down or alert
});

