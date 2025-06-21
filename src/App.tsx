import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DownloadForm } from './components/DownloadForm';
import { DownloadManager } from './components/DownloadManager';
import { DownloadedFiles } from './components/DownloadedFiles';
import { Features } from './components/Features';
import { Footer } from './components/Footer';
import { ServerStatus } from './components/ServerStatus';
import { requestDownload, downloadFile, checkServerHealth } from './services/api';

export interface Download {
  id: string;
  url: string;
  platform: 'instagram' | 'facebook';
  contentType: 'post' | 'story' | 'reel' | 'highlight';
  status: 'pending' | 'processing' | 'ready' | 'downloading' | 'completed' | 'error';
  progress: number;
  filename?: string;
  downloadUrl?: string;
  size?: string;
  thumbnail?: string;
  error?: string;
  note?: string;
}

function App() {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [serverOnline, setServerOnline] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'downloader' | 'files'>('downloader');

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkServerStatus = async () => {
    const isOnline = await checkServerHealth();
    setServerOnline(isOnline);
  };

  const addDownload = async (url: string, platform: 'instagram' | 'facebook', contentType: 'post' | 'story' | 'reel' | 'highlight') => {
    const newDownload: Download = {
      id: Date.now().toString(),
      url,
      platform,
      contentType,
      status: 'pending',
      progress: 0,
    };

    setDownloads(prev => [newDownload, ...prev]);

    try {
      // Update status to processing
      setDownloads(prev => prev.map(d => 
        d.id === newDownload.id ? { ...d, status: 'processing' } : d
      ));

      // Request download from backend
      const result = await requestDownload({ url, platform, contentType });

      // Update with download information
      setDownloads(prev => prev.map(d => 
        d.id === newDownload.id 
          ? { 
              ...d, 
              status: 'ready',
              downloadUrl: result.downloadUrl,
              filename: result.filename,
              size: result.size,
              thumbnail: result.thumbnail,
              progress: 100,
              note: result.note
            }
          : d
      ));
    } catch (error) {
      setDownloads(prev => prev.map(d => 
        d.id === newDownload.id 
          ? { 
              ...d, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Download failed'
            }
          : d
      ));
    }
  };

  const handleDownload = async (download: Download) => {
    if (!download.downloadUrl || !download.filename) return;

    try {
      setDownloads(prev => prev.map(d => 
        d.id === download.id ? { ...d, status: 'downloading' } : d
      ));

      // For server-downloaded files, just trigger browser download
      const link = document.createElement('a');
      link.href = download.downloadUrl;
      link.download = download.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloads(prev => prev.map(d => 
        d.id === download.id ? { ...d, status: 'completed' } : d
      ));
    } catch (error) {
      setDownloads(prev => prev.map(d => 
        d.id === download.id 
          ? { 
              ...d, 
              status: 'error', 
              error: 'Failed to download file'
            }
          : d
      ));
    }
  };

  const removeDownload = (id: string) => {
    setDownloads(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent">
            Social Media Downloader
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Download public content from Instagram and Facebook including posts, stories, reels, and highlights
          </p>
        </div>

        <ServerStatus isOnline={serverOnline} />

        {/* Tab Navigation */}
        <div className="flex justify-center">
          <div className="bg-white rounded-xl p-1 shadow-lg border border-gray-200">
            <button
              onClick={() => setActiveTab('downloader')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'downloader'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Downloader
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'files'
                  ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Downloaded Files
            </button>
          </div>
        </div>

        {activeTab === 'downloader' ? (
          <>
            <DownloadForm onDownload={addDownload} disabled={!serverOnline} />
            
            {downloads.length > 0 && (
              <DownloadManager 
                downloads={downloads} 
                onRemove={removeDownload}
                onDownload={handleDownload}
              />
            )}
            
            <Features />
          </>
        ) : (
          <DownloadedFiles />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;