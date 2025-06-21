import React, { useState, useEffect } from 'react';
import { Folder, Download, Trash2, Eye, RefreshCw, HardDrive } from 'lucide-react';
import { 
  getDownloadedFiles, 
  deleteDownloadedFile, 
  downloadFile as triggerBrowserDownload, // Rename to avoid conflict with local function
  DownloadedFile 
} from '../services/api'; // Adjust path as necessary
import { toast } from 'react-hot-toast'; // Assuming you've installed react-hot-toast

// Interface is already defined in api.ts, so we can import it
// interface DownloadedFile {
//   filename: string;
//   size: number;
//   created: string;
//   downloadUrl: string;
// }

export const DownloadedFiles: React.FC = () => {
  const [files, setFiles] = useState<DownloadedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null); // Track file being deleted

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const fetchedFiles = await getDownloadedFiles(); // Use the API function
      setFiles(fetchedFiles);
      toast.success('Files refreshed successfully!', { duration: 2000 });
    } catch (error) {
      console.error('Failed to fetch files:', error);
      toast.error('Failed to load files. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This cannot be undone.`)) {
      return; // User cancelled
    }

    setDeletingFile(filename); // Indicate that this file is being deleted
    try {
      await deleteDownloadedFile(filename); // Use the API function
      setFiles(prevFiles => prevFiles.filter(f => f.filename !== filename));
      toast.success(`File "${filename}" deleted successfully!`);
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error(`Failed to delete "${filename}". Please try again.`);
    } finally {
      setDeletingFile(null); // Reset deleting state
    }
  };

  const handleDownloadFile = (file: DownloadedFile) => {
    try {
      triggerBrowserDownload(file.downloadUrl, file.filename); // Use the API function
      toast.success(`Downloading "${file.filename}"...`);
    } catch (error) {
      console.error('Failed to initiate browser download:', error);
      toast.error(`Failed to start download for "${file.filename}".`);
    }
  };

  const handlePreviewFile = (file: DownloadedFile) => {
    // Open in new tab, allowing browser to handle it (e.g., play video, display image)
    window.open(file.downloadUrl, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    // Add null/undefined check for dateString
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      console.error("Invalid date string:", dateString, e);
      return 'Invalid Date';
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []); // Empty dependency array means this runs once on mount

  // Conditional rendering for no files/loading state
  if (files.length === 0 && !loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <HardDrive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Downloaded Files</h3>
          <p className="text-gray-500">Files you download will appear here for easy access.</p>
          <button
            onClick={fetchFiles}
            className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
            disabled={loading} // Disable button while loading
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && files.length === 0 && ( // Show full-page spinner only if no files are loaded yet
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin mb-4 text-blue-500" />
            <p>Loading files...</p>
          </div>
        )}

        {!loading && files.length === 0 && ( // Display message if no files after loading
          <div className="p-8 text-center text-gray-500">
             <HardDrive className="h-12 w-12 text-gray-300 mx-auto mb-3" />
             <p>No files found.</p>
          </div>
        )}

        {files.length > 0 && ( // Only render file list if there are files
            <div className="divide-y divide-gray-100">
            {files.map((file) => (
                <div key={file.filename} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="bg-green-100 p-2 rounded-lg flex-shrink-0"> {/* flex-shrink-0 to prevent shrinking */}
                        {file.filename.includes('.mp4') || file.filename.includes('.webm') || file.filename.includes('.mov') ? ( // More robust video check
                            <div className="w-5 h-5 bg-red-500 rounded flex items-center justify-center">
                            <div className="w-0 h-0 border-l-2 border-l-white border-y-1 border-y-transparent ml-0.5"></div>
                            </div>
                        ) : (
                            <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                            <div className="w-3 h-2 bg-white rounded-sm"></div>
                            </div>
                        )}
                        </div>
                        <div className="min-w-0"> {/* Ensure text can truncate */}
                            <h3 className="font-semibold text-gray-900 truncate max-w-xs sm:max-w-md md:max-w-lg"> {/* Added responsive max-width */}
                                {file.filename}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-4 text-sm text-gray-500"> {/* Use gap for spacing */}
                                <span>Size: {formatFileSize(file.size)}</span>
                                <span>Date: {formatDate(file.created)}</span>
                            </div>
                        </div>
                    </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4 flex-shrink-0"> {/* flex-shrink-0 for buttons */}
                    <button
                        onClick={() => handlePreviewFile(file)}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                        title="Preview file"
                    >
                        <Eye className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => handleDownloadFile(file)}
                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors duration-200"
                        title="Download file"
                    >
                        <Download className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => handleDeleteFile(file.filename)}
                        disabled={deletingFile === file.filename} // Disable while deleting
                        className={`p-2 rounded-lg transition-colors duration-200 ${
                        deletingFile === file.filename 
                            ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                            : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                        }`}
                        title={deletingFile === file.filename ? 'Deleting...' : 'Delete file'}
                    >
                        {deletingFile === file.filename ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                    </button>
                    </div>
                </div>
                </div>
            ))}
            </div>
        )}


        {files.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{files.length} file{files.length !== 1 ? 's' : ''} total</span>
              <span>
                Total size: {formatFileSize(files.reduce((total, file) => total + file.size, 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
