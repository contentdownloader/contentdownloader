// Use import.meta.env for environment variables provided by Vite
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Logger for better debugging visibility on the client side
const logger = {
  info: (...args: any[]) => console.log('[API Client INFO]', ...args),
  warn: (...args: any[]) => console.warn('[API Client WARN]', ...args),
  error: (...args: any[]) => console.error('[API Client ERROR]', ...args),
};

export interface DownloadResponse {
  success: boolean;
  downloadUrl: string;
  filename: string;
  contentType: string;
  size: string;
  thumbnail?: string;
  localPath?: string; // This path is backend-internal, might not be relevant for frontend directly
  note?: string; // Added note property from backend
}

export interface DownloadRequest {
  url: string;
  platform: 'instagram' | 'facebook' | 'test'; // Added 'test' as allowed platform for client
  contentType: 'post' | 'story' | 'reel' | 'highlight' | 'image' | 'video'; // Added 'image'/'video' for flexibility
}

export interface DownloadedFile {
  filename: string;
  size: number;
  created: string;
  downloadUrl: string; // Ensure this is also present for files from the list
}

export async function requestDownload(request: DownloadRequest): Promise<DownloadResponse> {
  logger.info('Requesting download:', request);
  try {
    const response = await fetch(`${API_BASE_URL}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.message || `Download request failed with status: ${response.status}`;
      logger.error('Backend download request failed:', errorMessage, errorData);
      throw new Error(errorMessage);
    }

    const result: DownloadResponse = await response.json();
    logger.info('Download request successful, response:', result);
    return result;
  } catch (error) {
    logger.error('API request failed (network or unexpected):', error);
    // Re-throw the error to be handled by the calling component (App.tsx)
    throw error;
  }
}

// Simplified and more focused downloadFile function
export async function downloadFile(url: string, filename: string): Promise<void> {
  logger.info(`Attempting direct browser download for: ${filename} from ${url}`);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename; // Suggests filename to browser
    // No target="_blank" needed for direct downloads, as it's not opening a new tab
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logger.info(`Browser download initiated for: ${filename}`);
  } catch (error) {
    logger.error('Direct file download failed in browser:', error);
    // Re-throw the error to be handled by the calling component (App.tsx)
    throw error;
  }
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { timeout: 5000 }); // Add a timeout for health check
    const isOnline = response.ok;
    if (isOnline) {
      logger.info('Server health check: Online');
    } else {
      logger.warn(`Server health check: Offline (Status: ${response.status})`);
    }
    return isOnline;
  } catch (error) {
    logger.error('Server health check failed (network error):', error);
    return false;
  }
}

export async function getDownloadedFiles(): Promise<DownloadedFile[]> {
  logger.info('Fetching list of downloaded files...');
  try {
    const response = await fetch(`${API_BASE_URL}/downloads`);
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.message || `Failed to fetch downloaded files with status: ${response.status}`;
      logger.error('Failed to fetch downloaded files from backend:', errorMessage, errorData);
      throw new Error(errorMessage);
    }
    const files: DownloadedFile[] = await response.json();
    logger.info('Successfully fetched downloaded files:', files);
    return files;
  } catch (error) {
    logger.error('Failed to get downloaded files (network or unexpected):', error);
    // Decide whether to throw or return empty array based on desired UI behavior
    // Returning empty array is often user-friendlier for lists
    return [];
  }
}

export async function deleteDownloadedFile(filename: string): Promise<void> {
  logger.info(`Requesting deletion of file: ${filename}`);
  try {
    const response = await fetch(`${API_BASE_URL}/downloads/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.message || `Failed to delete file with status: ${response.status}`;
      logger.error('Backend file deletion failed:', errorMessage, errorData);
      throw new Error(errorMessage);
    }
    logger.info(`File ${filename} deleted successfully on backend.`);
  } catch (error) {
    logger.error(`API request to delete file ${filename} failed:`, error);
    throw error;
  }
}
