import React, { useState } from 'react';
import { Activity, Cpu, Server, X } from 'lucide-react';
import { useSystemMetrics } from '../hooks/useSystemMetrics';
import PerformanceMonitor from './PerformanceMonitor';

/**
 * SystemHealthWidget (Decoupled Dashboard Panel & Status Bar Integration)
 * 
 * Separates the metrics polling logic from the main layout to prevent 
 * unnecessary re-renders of the Editor and Video Call components.
 */
export const SystemHealthWidget = () => {
  const { metrics, isConnected, error, isThrottled } = useSystemMetrics();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Derive current values from metrics
  const currentCPU = metrics.length > 0 ? metrics[metrics.length - 1].cpu : 0;
  const currentMem = metrics.length > 0 ? metrics[metrics.length - 1].memory : 0;

  const isCritical = currentCPU > 85;
  const isWarning = currentCPU > 70 && currentCPU <= 85;

  let statusColor = "text-green-400";
  if (isCritical) {
    statusColor = "text-red-400";
  } else if (isWarning) {
    statusColor = "text-yellow-400";
  }

  return (
    <>
      {/* 
        Dashboard Panel Overlay / Drawer 
        Toggles out from the right when the status bar item is clicked.
      */}
      <div 
        className={`fixed bottom-10 right-2 w-[26rem] h-[22rem] z-[60] transition-all duration-300 ease-in-out transform ${
          isPanelOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="absolute top-3 right-3 z-10 flex">
          <button 
            onClick={() => setIsPanelOpen(false)}
            className="p-1 rounded-md bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors backdrop-blur-sm"
            title="Close Panel"
          >
            <X size={16} />
          </button>
        </div>
        <PerformanceMonitor 
          metrics={metrics} 
          isConnected={isConnected} 
          error={error} 
          isThrottled={isThrottled} 
        />
      </div>

      {/* 
        IDE Status Bar Integration 
        Provides a compact view of system health and acts as the toggle trigger.
      */}
      <div 
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="flex items-center gap-3 px-3 h-full cursor-pointer hover:bg-white/10 transition-colors border-l border-gray-600/50 select-none"
        title="Click to toggle Performance Dashboard"
      >
        <div className="flex items-center gap-1.5">
          <Activity size={14} className={statusColor} />
        </div>
        
        <div className="flex items-center gap-3 text-xs text-gray-300 font-mono">
          <div className="flex items-center gap-1" title="CPU Usage">
            <Cpu size={12} className="text-gray-400" />
            <span className="w-8">{currentCPU.toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-1" title="Memory Usage">
            <Server size={12} className="text-gray-400" />
            <span className="w-8">{currentMem.toFixed(0)}%</span>
          </div>
        </div>

        {isThrottled && (
          <span className="text-[10px] uppercase font-bold text-orange-400 bg-orange-400/20 px-1.5 py-0.5 rounded ml-1">
            Throttled
          </span>
        )}
      </div>
    </>
  );
};

export default SystemHealthWidget;
