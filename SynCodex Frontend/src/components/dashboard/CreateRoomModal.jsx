import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import { X, Plus, Copy, Users, Loader, CheckCircle } from "lucide-react";
import ToggleButton from "../toggleButton";
import InterviewRecorder from "../interview/InterviewRecorder";
import axios from "axios";

export default function CreateRoomModal({ onClose }) {
  const [sessionName, setSessionName] = useState("");
  const [sessionDescription, setSessionDescription] = useState("");
  const [interviewMode, setInterviewMode] = useState(false);

  const [roomId, setRoomId] = useState("");
  const [copied, setCopied] = useState(false);
  const roomIdRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [showInterviewRecorder, setShowInterviewRecorder] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleRoomCreation = async () => {
    if (!sessionName.trim()) {
      toast.error("Session name is required.");
      return;
    }

    const sessionData = {
      token: localStorage.getItem("token"),
      email: localStorage.getItem("email"),
      roomId: roomId,
      name: sessionName,
      description: sessionDescription,
      isInterviewMode: interviewMode,
    };

    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/rooms/create-room",
        sessionData
      );

      console.log("Session Data :: ", res.data);
      if (res.status === 201) {
        toast.success("Room created successfully!");
         if (interviewMode) {
          sessionStorage.setItem("roomId", roomId);
          localStorage.setItem(
            "collabActions",
            JSON.stringify({
              ...JSON.parse(localStorage.getItem("collabActions") || "{}"),
              [roomId]: {
                action: "created",
                hostEmail: localStorage.getItem("email"),
              },
            })
          );
          setShowInterviewRecorder(true);
        } else {
          localStorage.setItem(
            "collabActions",
            JSON.stringify({
              ...JSON.parse(localStorage.getItem("collabActions") || "{}"),
              [roomId]: {
                action: "created",
                hostEmail: localStorage.getItem("email"),
              },
            })
          );
          window.open(`/collab-editor/${roomId}`, "_blank");
        }
      }
    } catch (error) {
      console.error("Room Creation Failed :", error);
      toast.error("Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const generateRoomId = useCallback(() => {
    let room = "";
    let str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 1; i <= 8; i++) {
      let char = Math.floor(Math.random() * str.length);
      room += str.charAt(char);
    }
    setRoomId(room);
  }, []);

  const copyRoomToClipBoard = useCallback(() => {
    if (roomIdRef.current) {
      roomIdRef.current.select();
      navigator.clipboard.writeText(roomId).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  }, [roomId]);

  useEffect(() => {
    generateRoomId();
  }, [generateRoomId]);

  if (showInterviewRecorder) {
    return (
      <InterviewRecorder 
        roomId={roomId}
        roomName={sessionName}
        onClose={() => {
          setShowInterviewRecorder(false);
          onClose();
        }} 
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700/50">
        
        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 border-b border-slate-700/30">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                <Plus size={24} className="text-cyan-400" />
                Create Room
              </h2>
              <p className="text-sm text-slate-400">Start a new collaboration session</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6">

          {/* Session Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Session Name
            </label>
            <input
              className={`w-full px-4 py-3 bg-slate-700/40 text-white rounded-lg border transition-all focus:outline-none ${
                focusedField === 'name' 
                  ? 'border-cyan-500/50 ring-2 ring-cyan-500/30' 
                  : 'border-slate-600/50 focus:border-cyan-500/50'
              }`}
              type="text"
              placeholder="e.g., Q2 Sprint Planning"
              value={sessionName}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              onChange={(e) => setSessionName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-3">
              Description <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={sessionDescription}
              onFocus={() => setFocusedField('desc')}
              onBlur={() => setFocusedField(null)}
              onChange={(e) => setSessionDescription(e.target.value)}
              className={`w-full px-4 py-3 bg-slate-700/40 text-white rounded-lg border transition-all focus:outline-none resize-none ${
                focusedField === 'desc'
                  ? 'border-cyan-500/50 ring-2 ring-cyan-500/30'
                  : 'border-slate-600/50 focus:border-cyan-500/50'
              }`}
              placeholder="Add context for participants..."
              rows="3"
            />
          </div>

          {/* Room ID Section */}
          <div className="bg-slate-700/20 rounded-lg p-4 border border-slate-700/50">
            <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-400" />
              Room Code
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-3 bg-slate-700/40 text-white rounded-lg border border-slate-600/50 font-mono text-center tracking-widest text-lg"
                type="text"
                value={roomId}
                ref={roomIdRef}
                readOnly
              />
              <button
                onClick={copyRoomToClipBoard}
                className={`px-4 py-3 rounded-lg transition-all flex items-center gap-2 font-semibold ${
                  copied
                    ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700/70 border border-slate-600/50'
                }`}
              >
                <Copy size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">Share this code with participants</p>
          </div>

          {/* Interview Mode Toggle */}
          <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg p-4 border border-purple-700/30 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-300 flex items-center gap-2">
                <Users size={18} className="text-purple-400" />
                Interview Mode
              </p>
              <p className="text-xs text-slate-500 mt-1">Restrict tab switching & screen access</p>
            </div>
            <ToggleButton
              isToggled={interviewMode}
              setIsToggled={setInterviewMode}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-700/30 bg-slate-800/20 space-y-3">
          <button
            onClick={handleRoomCreation}
            disabled={loading || !sessionName.trim()}
            className={`w-full px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              loading || !sessionName.trim()
                ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-400'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
            }`}
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus size={18} />
                <span>Create Room</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full px-6 py-2 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
