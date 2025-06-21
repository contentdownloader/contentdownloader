const API_BASE_URL = 'http://localhost:3001/api';

export interface DownloadResponse {
  success: boolean;
  downloadUrl: string;
  filename: string;
  contentType: string;
  size: string;
  thumbnail?: string;
  localPath?: string;
}

export interface DownloadRequest {
  url: string;
  platform: 'instagram' | 'facebook';
  contentType: 'post' | 'story' | 'reel' | 'highlight';
}

export interface DownloadedFile {
  filename: string;
  url: string;
  size: number;
  created: string;
}

export async function requestDownload(request: DownloadRequest): Promise<DownloadResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Download request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    // Create a direct download link
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    
    // Add to DOM temporarily
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Also try the blob method as fallback
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        
        const blobLink = document.createElement('a');
        blobLink.href = downloadUrl;
        blobLink.download = filename;
        document.body.appendChild(blobLink);
        blobLink.click();
        document.body.removeChild(blobLink);
        
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (blobError) {
      console.log('Blob download failed, direct link should work');
    }
  } catch (error) {
    console.error('File download failed:', error);
    throw error;
  }
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function getDownloadedFiles(): Promise<DownloadedFile[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/downloads`);
    if (!response.ok) {
      throw new Error('Failed to fetch downloaded files');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to get downloaded files:', error);
    return [];
  }
}