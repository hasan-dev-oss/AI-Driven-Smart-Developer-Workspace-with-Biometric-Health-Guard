import { Play, PlayCircle } from "lucide-react";
import { VscOpenPreview } from "react-icons/vsc";
import HealthStatusBar from "../HealthStatusBar";

export default function EditorNav({ onRunClick, onPreviewClick, isHtmlFile, flowStatus, healthData }) {
  return (
    <header className="h-12 shrink-0 bg-[#181a1f] border-b border-[#2d2d2d] flex items-center justify-between px-5 select-none z-50 shadow-sm relative">
      
      {/* Left Region: Logo & Status */}
      <div className="flex items-center gap-6 min-w-[200px]">
        <div className="text-xl font-bold font-Chakra bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-wider">
          SynCodex
        </div>
        {flowStatus && (
          <div className="flex items-center bg-[#1e1e1e] px-2 py-1 rounded border border-[#2d2d2d] text-xs">
            {flowStatus}
          </div>
        )}
      </div>
      
      {/* Center Region: Main Actions */}
      <div className="flex items-center justify-center flex-1">
        {isHtmlFile ? (
          <button
            className="flex items-center gap-2 px-4 py-[5px] bg-[#2d2d2d]/50 hover:bg-[#2d2d2d] text-gray-300 hover:text-white border border-[#3C3C3D] hover:border-gray-500 rounded text-[13px] font-medium transition-all"
            onClick={onPreviewClick}
            title="View Preview"
            aria-label="View Preview"
            type="button"
          >
            <VscOpenPreview size={16} />
            Preview
          </button>
        ) : (
          <button
            className="flex items-center gap-2 px-6 py-[5px] bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 rounded text-[13px] font-semibold tracking-wide transition-all shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
            onClick={onRunClick}
            title="Run Code"
            aria-label="Run Code"
            type="button"
          >
            <Play fill="currentColor" size={13} className="text-indigo-400 mt-[1px]" />
            RUN
          </button>
        )}
      </div>

      {/* Right Region: Integration Hooks */}
      <div className="flex items-center justify-end min-w-[200px] gap-4">
        {healthData && (
          <div className="bg-[#161b22] border border-white/5 rounded-md px-3 py-1 flex items-center shadow-inner hover:border-white/10 transition-colors">
            <HealthStatusBar healthData={healthData} />
          </div>
        )}
      </div>
      
    </header>
  );
}
