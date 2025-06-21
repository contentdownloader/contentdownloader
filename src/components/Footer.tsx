import React from 'react';
import { Download, Heart, Shield, Info } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-xl">
                <Download className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold">SocialDL</span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              The most trusted platform for downloading public social media content safely and efficiently.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Features</h3>
            <ul className="space-y-2 text-gray-400">
              <li className="hover:text-white transition-colors cursor-pointer">Instagram Downloader</li>
              <li className="hover:text-white transition-colors cursor-pointer">Facebook Downloader</li>
              <li className="hover:text-white transition-colors cursor-pointer">Story Downloader</li>
              <li className="hover:text-white transition-colors cursor-pointer">Reel Downloader</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-gray-400">
              <li className="hover:text-white transition-colors cursor-pointer">How to Use</li>
              <li className="hover:text-white transition-colors cursor-pointer">FAQ</li>
              <li className="hover:text-white transition-colors cursor-pointer">Contact Us</li>
              <li className="hover:text-white transition-colors cursor-pointer">Report Issue</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-gray-400">
              <li className="hover:text-white transition-colors cursor-pointer">Privacy Policy</li>
              <li className="hover:text-white transition-colors cursor-pointer">Terms of Service</li>
              <li className="hover:text-white transition-colors cursor-pointer">DMCA</li>
              <li className="hover:text-white transition-colors cursor-pointer">Disclaimer</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4" />
                <span>Public Content Only</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-500" />
              <span>for content creators</span>
            </div>
          </div>
          
          <div className="text-center mt-6 pt-6 border-t border-gray-800">
            <p className="text-gray-400 text-sm">
              © 2024 SocialDL. All rights reserved. This tool is for downloading public content only.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};