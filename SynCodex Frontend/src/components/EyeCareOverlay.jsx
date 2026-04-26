import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FaEye } from 'react-icons/fa';

const EyeCareOverlay = ({ isVisible, onResume }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-[#1e1e2e]/95 p-10 rounded-3xl border border-blue-500/30 text-center max-w-lg shadow-[0_0_50px_rgba(80,109,255,0.2)] flex flex-col items-center"
          >
            <h2 className="text-4xl font-bold mb-4 font-gradient bg-clip-text text-transparent bg-gradient-to-r from-[#94FFF2] to-[#506DFF]">
              Time for a Break!
            </h2>
            
            <p className="text-xl text-gray-300 mb-8 px-4">
              You've been coding for a while. Let's practice the 20-20-20 rule to rest your eyes.
            </p>
            
            <div className="bg-[#3D415A] p-8 rounded-2xl border border-blue-500/20 mb-8 w-full flex flex-col items-center justify-center shadow-inner">
                <FaEye className="text-7xl mb-6 text-blue-400" />
                <p className="font-semibold text-2xl text-white mb-2 text-center">Look 20 feet away.</p>
                <p className="text-[#94FFF2] font-medium tracking-wide">For at least 20 seconds.</p>
            </div>
            
            <button
              onClick={onResume}
              className="bg-gradient-to-r from-[#94FFF2] to-[#506DFF] text-[#1e1e2e] font-bold py-4 px-10 rounded-xl hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(148,255,242,0.4)] cursor-pointer text-lg"
            >
              Resume Coding
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EyeCareOverlay;
