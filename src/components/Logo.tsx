import React from 'react';
import { Zap } from 'lucide-react';

export const Logo: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center mb-12">
      {/* Animated Logo Container */}
      <div className="relative mb-6">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-orange-400 border-opacity-30 animate-spin-slow"></div>
        
        {/* Middle pulsing ring */}
        <div className="absolute inset-2 w-20 h-20 rounded-full border border-orange-500 border-opacity-50 animate-pulse-ring"></div>
        
        {/* Inner glowing core */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full blur-lg opacity-60 animate-glow-pulse"></div>
          <div className="relative bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 p-4 rounded-full shadow-2xl animate-float-gentle">
            <Zap className="w-8 h-8 text-white animate-lightning" />
          </div>
        </div>
        
        {/* Orbiting particles */}
        <div className="absolute top-0 left-1/2 w-2 h-2 bg-orange-400 rounded-full animate-orbit-1 opacity-80"></div>
        <div className="absolute top-1/2 right-0 w-1.5 h-1.5 bg-orange-300 rounded-full animate-orbit-2 opacity-60"></div>
        <div className="absolute bottom-0 left-1/2 w-1 h-1 bg-orange-500 rounded-full animate-orbit-3 opacity-70"></div>
      </div>
      
      {/* Logo Text */}
      <div className="text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-orange-100 to-orange-200 bg-clip-text text-transparent mb-2 animate-text-shimmer">
          Venom
        </h1>
        <div className="relative">
          <p className="text-orange-400 text-lg font-medium tracking-wider animate-glow-text">
            TRANSLATOR
          </p>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent animate-line-expand"></div>
        </div>
      </div>
    </div>
  );
};