import React from 'react';
import { motion } from 'motion/react';
import { FaEye } from 'react-icons/fa';

/**
 * EyeCareWidget Component
 * A draggable floating widget to control the Eye Care timer.
 */
const EyeCareWidget = ({ formattedTimeLeft, isDemoMode, setDemoMode }) => {
  return (
    <motion.div
      drag
      dragMomentum={false}
      // Keeps the component from flying completely off screen
      dragConstraints={{ left: -500, right: 500, top: -700, bottom: 100 }}
      whileDrag={{ scale: 1.05, cursor: "grabbing" }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[50] flex items-center gap-4 bg-[#1e1e2e]/90 px-5 py-2.5 rounded-full shadow-[0_0_15px_rgba(80,109,255,0.3)] border border-blue-500/30 text-white text-sm backdrop-blur-md group hover:border-blue-400 transition-colors cursor-grab"
    >
      <div className="flex items-center gap-2 select-none pointer-events-none">
        <FaEye className="text-lg text-[#94FFF2] animate-pulse" title="Eye Care Timer" />
        <span className="font-mono font-bold text-[#94FFF2] tracking-wider text-base">
          {formattedTimeLeft}
        </span>
      </div>
      
      <div className="w-px h-5 bg-gray-500/50"></div>
      
      <button 
        onClick={(e) => {
          e.stopPropagation(); // prevent drag from triggering click optionally
          setDemoMode(!isDemoMode);
        }}
        title={isDemoMode ? "Switch to 20-minute mode" : "Switch to 2-second demo"}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer select-none ${
          isDemoMode 
            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' 
            : 'bg-transparent border border-blue-500/50 hover:bg-blue-500/20 text-gray-300'
        }`}
      >
        {isDemoMode ? 'Demo active' : 'Try Demo'}
      </button>
    </motion.div>
  );
};

export default EyeCareWidget;
