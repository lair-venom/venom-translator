import React from 'react';
import { Zap } from 'lucide-react';

export const Logo: React.FC = () => {
  return (
    <div className="flex items-center space-x-3 mb-8 animate-float">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full blur opacity-75 animate-pulse-custom"></div>
        <div className="relative bg-gradient-to-r from-orange-400 to-orange-600 p-3 rounded-full">
          <Zap className="w-8 h-8 text-white" />
        </div>
      </div>
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Venom
        </h1>
        <p className="text-orange-400 text-sm font-medium animate-glow">
          Translate
        </p>
      </div>
    </div>
  );
};