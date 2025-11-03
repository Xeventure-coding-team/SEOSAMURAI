import React, { useState, useEffect } from 'react';

export default function SubmissionComplete() {
  const [isVisible, setIsVisible] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setPulseKey(prev => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pt-36 pb-36 bg-gradient-to-br from-background via-background to-secondary/10 flex items-center justify-center p-6 rounded-2xl">
      <div
        className={`text-center max-w-6xl mx-auto transition-all duration-1000 ease-out transform ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        {/* Main Title Section */}
        <div className="mb-16 space-y-6 relative">
          <div className="relative inline-block">
            <h1 className="text-7xl sm:text-8xl md:text-9xl font-bold lg:text-[11rem] text-foreground tracking-tighter leading-none select-none">
              Submission
            </h1>
            <div
              key={pulseKey}
              className="absolute -top-4 -right-4 w-4 h-4 bg-emerald-500 rounded-full animate-ping"
            />
            <div className="absolute -top-4 -right-4 w-4 h-4 bg-emerald-500 rounded-full" />
          </div>

          <div className="relative">
            <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-muted-foreground/70 tracking-tighter leading-none">
              Complete
            </h2>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent blur-3xl -z-10" />
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-2 px-4 py-2 rounded-full border border-slate-200 bg-white shadow-sm">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-slate-700">Received</span>
          </div>
        </div>

        {/* Decorative Separator */}
        <div className="relative flex items-center justify-center mb-12">
          <div className="w-48 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
          <div className="absolute w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
        </div>

        {/* Success Message */}
        <div className="mt-4 inline-flex items-center space-x-2 text-slate-400 text-xs tracking-widest uppercase">
          <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
          <span>Your submission has been received</span>
          <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
