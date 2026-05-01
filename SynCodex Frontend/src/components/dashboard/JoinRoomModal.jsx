import { X, LogIn, Shield, AlertCircle, CheckCircle, Loader } from "lucide-react";
import { toast } from "react-toastify";
import {useState} from "react";
import InterviewRecorder from "../interview/InterviewRecorder";
import axios from "axios";

export default function JoinRoomModal({ onClose }) {
  const [joinRoomId, setJoinRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitButton, setSubmitButton] = useState("Check Room");
  const [isInterviewMode, setIsInterviewMode] = useState(false);
  const [roomAvail, setRoomAvail] = useState(false);
  const [hostEmail, setHostEmail] = useState(null);
  const [showInterviewRecorder, setShowInterviewRecorder] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [focused, setFocused] = useState(false);

  const checkRoom = async () => {
    if (!joinRoomId.trim()) {
      toast.error("Please Enter Room ID To Join.");
      return;
    }
    
    setSubmitButton("Checking room...");
    try {
      const res = await axios.post(
        "http://localhost:5000/api/rooms/check-room",
        {roomId: joinRoomId }
      );

      if (res.status === 404) {
        setSubmitButton("Check Room");
        toast.error("Room Not Found.");
        return;
      }
      if (res.status === 200) {
        setSubmitButton("Join Room");
        setRoomAvail(true);
        setHostEmail(res.data.ownerEmail);
        setIsInterviewMode(res.data.isInterviewMode);
        setRoomName(res.data.name || joinRoomId);
        console.log("Room found :: ", res.data);
      }
    } catch (error) {
      console.error("Room Checking Failed:", error);
      toast.error("Failed to check room. It may not exist.");
      setSubmitButton("Check Room");
    } 
  };

   const joinRoom = async () => {
    if (!joinRoomId.trim()) {
      toast.error("Please Enter Room ID To Join.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:5000/api/rooms/join-room",
        {
          roomId: joinRoomId.trim(),
          email: localStorage.getItem("email"),
          creatorEmail: hostEmail,
        }
      );

      if (res.status === 200) {
        toast.success("Room Joined Successfully!");
        setSubmitButton("Check Room");
        if (isInterviewMode) {
          localStorage.setItem(
            "collabActions",
            JSON.stringify({
              ...JSON.parse(localStorage.getItem("collabActions") || "{}"),
              [joinRoomId]: { action: "joined", hostEmail: hostEmail },
            })
          );
          setShowInterviewRecorder(true);
        } else {
          localStorage.setItem(
            "collabActions",
            JSON.stringify({
              ...JSON.parse(localStorage.getItem("collabActions") || "{}"),
              [joinRoomId]: { action: "joined", hostEmail: hostEmail },
            })
          );

          window.open(`/collab-editor/${joinRoomId}`, "_blank");
        }
      }
    } catch (error) {
      console.error("Room Join Failed:", error);
      toast.error("Failed to join room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showInterviewRecorder ? (
        <InterviewRecorder 
          roomId={joinRoomId}
          roomName={roomName}
          onClose={() => {
            setShowInterviewRecorder(false);
            onClose();
          }} 
        />
      ) : (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700/50">
            
            {/* Header Section */}
            <div className="relative px-8 pt-8 pb-6 border-b border-slate-700/30">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Join Room</h2>
                  <p className="text-sm text-slate-400">Connect to an active collaboration session</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div className="px-8 py-6 space-y-6">
              
              {/* Room ID Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Shield size={16} className="text-cyan-400" />
                  Room ID
                </label>
                <div className={`relative transition-all duration-300 ${focused ? 'ring-2 ring-cyan-500/30' : ''}`}>
                  <input 
                    type="text" 
                    value={joinRoomId} 
                    onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="Enter 8-character code" 
                    className="w-full px-4 py-3 bg-slate-700/40 text-white rounded-lg border border-slate-600/50 focus:border-cyan-500/50 focus:outline-none transition-all placeholder-slate-500 text-center tracking-widest font-mono text-lg"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">Get this code from the room creator</p>
              </div>

              {/* Interview Mode Badge */}
              {roomAvail && isInterviewMode && (
                <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-700/50 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-400 mb-1">Interview Mode Enabled</p>
                    <p className="text-xs text-amber-300/80">Tab switching and screen minimization will end the session automatically.</p>
                  </div>
                </div>
              )}

              {/* Success Badge */}
              {roomAvail && !isInterviewMode && (
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="text-green-400 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-semibold text-green-400">Room Found</p>
                    <p className="text-xs text-green-300/80">{roomName} is ready for collaboration</p>
                  </div>
                </div>
              )}

            </div>

            {/* Action Section */}
            <div className="px-8 py-6 border-t border-slate-700/30 bg-slate-800/20">
              <button
                onClick={roomAvail ? joinRoom : checkRoom}
                disabled={loading || !joinRoomId.trim()}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                  roomAvail 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/20'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none`}
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    <span>{submitButton}</span>
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>{roomAvail ? 'Join Room' : 'Check Room'}</span>
                  </>
                )}
              </button>
              
              <button
                onClick={onClose}
                className="w-full mt-3 px-6 py-2 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
