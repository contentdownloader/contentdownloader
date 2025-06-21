import React, { useState, useEffect } from 'react';
import { Folder, Download, Trash2, Eye, RefreshCw, HardDrive } from 'lucide-react';

interface DownloadedFile {
  filename: string;
  size: number;
  created: string;
  downloadUrl: string;
}

export const DownloadedFiles: React.FC = () => {
  const [files, setFiles] = useState<DownloadedFile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/downloads');
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (filename: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/downloads/${filename}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setFiles(files.filter(f => f.filename !== filename));
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const downloadFile = (file: DownloadedFile) => {
    const link = document.createElement('a');
    link.href = file.downloadUrl;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  if (files.length === 0 && !loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <HardDrive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Downloaded Files</h3>
          <p className="text-gray-500">Files you download will appear here for easy access</p>
          <button
            onClick={fetchFiles}
            className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Folder className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">Downloaded Files</h2>
                <p className="text-green-100 text-sm">Files saved to your device</p>
              </div>
            </div>
            <button
              onClick={fetchFiles}
              disabled={loading}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {files.map((file) => (
            <div key={file.filename} className="p-6 hover:bg-gray-50 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="bg-green-100 p-2 rounded-lg">
                      {file.filename.includes('.mp4') ? (
                        <div className="w-5 h-5 bg-red-500 rounded flex items-center justify-center">
                          <div className="w-0 h-0 border-l-2 border-l-white border-y-1 border-y-transparent ml-0.5"></div>
                        </div>
                      ) : (
                        <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                          <div className="w-3 h-2 bg-white rounded-sm"></div>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 truncate max-w-md">
                        {file.filename}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>{formatDate(file.created)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => window.open(file.downloadUrl, '_blank')}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                    title="Preview file"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => downloadFile(file)}
                    className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors duration-200"
                    title="Download file"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => deleteFile(file.filename)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                    title="Delete file"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{files.length} file{files.length !== 1 ? 's' : ''} total</span>
            <span>
              Total size: {formatFileSize(files.reduce((total, file) => total + file.size, 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};