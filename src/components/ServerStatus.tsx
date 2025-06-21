import React from 'react';
import { Server, AlertCircle, CheckCircle } from 'lucide-react';

interface ServerStatusProps {
  isOnline: boolean;
}

export const ServerStatus: React.FC<ServerStatusProps> = ({ isOnline }) => {
  const isDevelopment = import.meta.env.DEV; // Vite provides this env variable

  return (
    <div className={`max-w-2xl mx-auto p-4 rounded-xl border-2 ${
      isOnline 
        ? 'bg-green-50 border-green-200 text-green-800' 
        : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      <div className="flex items-center justify-center space-x-3">
        <Server className="h-5 w-5" />
        {isOnline ? (
          <>
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Server Online - Ready to download content</span>
          </>
        ) : (
          <>
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">
              {isDevelopment ? 'Server Offline - Please start the backend server' : 'Server Offline - Please try again later'}
            </span>
          </>
        )}
      </div>
      {!isOnline && isDevelopment && ( // Only show in development if offline
        <p className="text-center text-sm mt-2">
          Run <code className="bg-red-100 px-2 py-1 rounded">npm run server</code> in a separate terminal
        </p>
      )}
      {!isOnline && !isDevelopment && ( // Show a simpler message in production if offline
        <p className="text-center text-sm mt-2">
          We're experiencing technical difficulties.
        </p>
      )}
    </div>
  );
};
