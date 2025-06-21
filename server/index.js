import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import { downloadInstagramContent } from './services/instagram.js';
import { downloadFacebookContent } from './services/facebook.js';
import { downloadTestContent } from './services/testContent.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'http://localhost';

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(morgan('combined'));

// Serve static files
app.use('/downloads', express.static(downloadsDir));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Social Media Downloader API is running' });
});

// Download handler
app.post('/api/download', async (req, res) => {
  try {
    const { url, platform, contentType } = req.body;

    if (!url || !platform || !contentType) {
      return res.status(400).json({
        error: 'Missing required fields: url, platform, contentType'
      });
    }

    let result;

    if (url.includes('test-content') || url.includes('demo')) {
      result = await downloadTestContent(url, contentType, downloadsDir);
    } else if (platform === 'instagram') {
      result = await downloadInstagramContent(url, contentType, downloadsDir);
    } else if (platform === 'facebook') {
      result = await downloadFacebookContent(url, contentType, downloadsDir);
    } else {
      return res.status(400).json({
        error: 'Unsupported platform. Use "instagram" or "facebook"'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'Failed to process download request',
      message: error.message
    });
  }
});

// Simulated download progress (for demo only)
app.get('/api/download/:id/progress', (req, res) => {
  const { id } = req.params;
  res.json({
    id,
    progress: Math.floor(Math.random() * 100),
    status: 'downloading'
  });
});

// List downloaded files
app.get('/api/downloads', (req, res) => {
  try {
    const files = fs.readdirSync(downloadsDir).map(filename => {
      const filePath = path.join(downloadsDir, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        downloadUrl: `${HOST}:${PORT}/downloads/${filename}`
      };
    });
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list downloads' });
  }
});

// Delete downloaded file
app.delete('/api/downloads/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(downloadsDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'File deleted successfully' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at ${HOST}:${PORT}`);
  console.log(`📂 Downloads directory: ${downloadsDir}`);
});
