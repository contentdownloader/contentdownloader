import React, { useState } from 'react';
import { Download, Link, Instagram, Facebook } from 'lucide-react'; // Removed TestTube icon

// Updated interface: 'platform' no longer includes 'test'
interface DownloadFormProps {
  onDownload: (url: string, platform: 'instagram' | 'facebook', contentType: 'post' | 'story' | 'reel' | 'highlight') => void;
  disabled?: boolean;
}

export const DownloadForm: React.FC<DownloadFormProps> = ({ onDownload, disabled = false }) => {
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<'instagram' | 'facebook'>('instagram'); // 'platform' state no longer includes 'test'
  const [contentType, setContentType] = useState<'post' | 'story' | 'reel' | 'highlight'>('post');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Only proceed if URL is valid and form is not disabled
    if (url.trim() && isValidUrl(url) && !disabled) {
      // Always pass the selected platform, no 'test' routing here
      onDownload(url.trim(), platform, contentType);
      setUrl(''); // Clear URL field after submission
    }
  };

  // Simplified isValidUrl: no longer checks for test/demo URLs
  const isValidUrl = (inputUrl: string): boolean => {
    try {
      const parsedUrl = new URL(inputUrl);
      const hostname = parsedUrl.hostname;
      
      const instagramRegex = /^(www\.)?instagram\.com$/i;
      const facebookRegex = /^(www\.)?facebook\.com$|^(web\.)?facebook\.com$|^fb\.watch$/i;

      return instagramRegex.test(hostname) || facebookRegex.test(hostname);
    } catch {
      return false; // Invalid URL format
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 p-8 transition-opacity ${
        disabled ? 'opacity-50' : ''
      }`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Select Platform
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Instagram Button */}
                <button
                  type="button"
                  onClick={() => setPlatform('instagram')}
                  disabled={disabled}
                  className={`flex items-center justify-center space-x-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                    platform === 'instagram'
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Instagram className="h-5 w-5" />
                  <span className="font-medium">Instagram</span>
                </button>
                {/* Facebook Button */}
                <button
                  type="button"
                  onClick={() => setPlatform('facebook')}
                  disabled={disabled}
                  className={`flex items-center justify-center space-x-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                    platform === 'facebook'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Facebook className="h-5 w-5" />
                  <span className="font-medium">Facebook</span>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="contentType" className="block text-sm font-semibold text-gray-700 mb-3">
                Content Type
              </label>
              <select
                id="contentType"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as 'post' | 'story' | 'reel' | 'highlight')}
                disabled={disabled}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 disabled:cursor-not-allowed"
              >
                <option value="post">Post</option>
                <option value="story">Story</option>
                <option value="reel">Reel</option>
                <option value="highlight">Highlight</option>
              </select>
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-semibold text-gray-700 mb-3">
                Content URL
              </label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={`Paste ${platform} URL here...`} // Placeholder still uses selected platform
                  disabled={disabled}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 disabled:cursor-not-allowed"
                  required
                  pattern="https?://.+" title="Please enter a valid URL (starting with http:// or https://)"
                />
              </div>
              {url.trim() && !isValidUrl(url) && (
                <p className="mt-2 text-sm text-red-600">
                  Please enter a valid Instagram or Facebook URL.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={!url.trim() || !isValidUrl(url) || disabled}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 focus:ring-4 focus:ring-purple-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Download className="h-5 w-5" />
              <span>{disabled ? 'Server Offline' : 'Download Content'}</span>
            </button>

            {/* REMOVED: Test Download Button */}
            {/* <button
              type="button"
              onClick={handleTestDownload}
              disabled={disabled}
              className="..."
            >
              <TestTube className="h-5 w-5" />
              <span>Try Test Download</span>
            </button> */}
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">How to use:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Select a platform (Instagram or Facebook).</li>
            <li>• Choose the content type (Post, Story, Reel, Highlight).</li>
            <li>• Copy a public content URL (e.g., a photo, video, or reel link).</li>
            <li>• Paste it in the URL field above.</li>
            <li>• Click "Download Content" to start.</li>
            {/* REMOVED: Test download instruction */}
            {/* <li>• Use "Try Test Download" to test with sample content without a real URL.</li> */}
          </ul>
        </div>
      </div>
    </div>
  );
};
