import React from 'react';
import { Download, Shield, Zap } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-xl">
              <Download className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              SocialDL
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex items-center space-x-2 text-gray-600">
              <Shield className="h-4 w-4" />
              <span className="text-sm">Safe & Secure</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Zap className="h-4 w-4" />
              <span className="text-sm">Fast Downloads</span>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};