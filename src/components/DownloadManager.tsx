import React from 'react';
import { Download, CheckCircle, AlertCircle, X, ExternalLink, FileDown, Eye, Info } from 'lucide-react';
import { Download as DownloadType } from '../App';

interface DownloadManagerProps {
  downloads: DownloadType[];
  onRemove: (id: string) => void;
  onDownload: (download: DownloadType) => void;
}

export const DownloadManager: React.FC<DownloadManagerProps> = ({ downloads, onRemove, onDownload }) => {
  const getStatusIcon = (status: DownloadType['status']) => {
    switch (status) {
      case 'pending':
        return <Download className="h-5 w-5 text-gray-500 animate-pulse" />;
      case 'processing':
        return <Download className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'downloading':
        return <FileDown className="h-5 w-5 text-blue-500 animate-bounce" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = (status: DownloadType['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'ready':
        return 'Ready to Download';
      case 'downloading':
        return 'Downloading';
      case 'completed':
        return 'Downloaded';
      case 'error':
        return 'Error';
    }
  };

  const getPlatformColor = (platform: 'instagram' | 'facebook') => {
    return platform === 'instagram' 
      ? 'bg-pink-100 text-pink-800 border-pink-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Download Manager</h2>
          <p className="text-purple-100 text-sm">Track your download progress</p>
        </div>

        <div className="divide-y divide-gray-100">
          {downloads.map((download) => (
            <div key={download.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-3">
                    {getStatusIcon(download.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPlatformColor(download.platform)}`}>
                      {download.platform}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                      {download.contentType}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {getStatusText(download.status)}
                    </span>
                    {download.size && (
                      <span className="text-xs text-gray-500">
                        {download.size}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-3">
                    <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <p className="text-sm text-gray-600 truncate">{download.url}</p>
                  </div>

                  {download.note && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-700">{download.note}</span>
                      </div>
                    </div>
                  )}

                  {download.thumbnail && (
                    <div className="mb-3">
                      <img 
                        src={download.thumbnail} 
                        alt="Content preview" 
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}

                  {download.status === 'ready' && download.downloadUrl && (
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onDownload(download)}
                        className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center space-x-2"
                      >
                        <FileDown className="h-4 w-4" />
                        <span>Download File</span>
                      </button>
                      {download.downloadUrl && (
                        <a
                          href={download.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 flex items-center space-x-1 text-sm"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Preview</span>
                        </a>
                      )}
                    </div>
                  )}

                  {download.status === 'completed' && download.filename && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-700 font-medium">
                        Downloaded: {download.filename}
                      </span>
                    </div>
                  )}

                  {download.status === 'error' && download.error && (
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-700">{download.error}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onRemove(download.id)}
                  className="ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
                  title="Remove download"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};