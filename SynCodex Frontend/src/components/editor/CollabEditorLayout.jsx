import React, { useState, useEffect, useRef, useCallback } from "react";
import EditorNav from "./EditorNav";
import { FileExplorer } from "./FileExplorer";
import { FileTabs } from "./FileTabs";
import { PanelLeft, PanelRight } from "lucide-react";
import VideoCallSection from "../video_call/VideoCallSection";
import { SocketProvider } from "../../context/SocketProvider";
import { CollabEditorPane } from "./CollabEditorPane";
import { useYjsProvider } from "../../hooks/useYjsProvider";
import CodeExecutionResult from "./CodeExecutionResult";
import HtmlPreview from "./HtmlPreview";
import { runCode } from "../../services/codeExec";
import axios from "axios";
import useEyeCareTimer from "../../hooks/useEyeCareTimer";
import EyeCareOverlay from "../EyeCareOverlay";
import EyeCareWidget from "../EyeCareWidget";
import SystemHealthWidget from "../SystemHealthWidget";
import AIAssistantSidebar from "../interview/AIAssistantSidebar";
import InterviewRecorder from "../interview/InterviewRecorder";
export default function CollabEditorLayout({ roomId, isInterviewMode }) {
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessionName, setSessionName] = useState("Loading...");
  const { yDoc, provider } = useYjsProvider(roomId);
  const collabEditorRef = useRef();
  const [output, setOutput] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [localStreamForAI, setLocalStreamForAI] = useState(null);
  const [showInterviewRecorder, setShowInterviewRecorder] = useState(false);

  // --- Eye Care Timer Integration ---
  const { 
    isBreakMode, 
    resumeCoding, 
    formattedTimeLeft, 
    isDemoMode, 
    setDemoMode 
  } = useEyeCareTimer();

  const fetchRoomDetails = useCallback(async () => {
    if (!provider) return;

    const collabActions = JSON.parse(localStorage.getItem("collabActions") || "{}");
    const { action, hostEmail } = collabActions[roomId] || {};

    try {
      const response = await axios.get(
        "http://localhost:5000/api/rooms/room-details",
        {
          headers: {
            token: localStorage.getItem("token"),
            email: action === "joined" ? hostEmail : localStorage.getItem("email"),
            roomid: roomId,
          },
        }
      );

      const name = response?.data?.name || "Untitled Project";

      provider.awareness.setLocalStateField("sessionInfo", { name });
    } catch (error) {
      console.error("Error fetching room details:", error);
    }
  }, [provider, roomId]);

  useEffect(() => {
    if (!provider) return;

    const awareness = provider.awareness;

    const updateName = () => {
      const allStates = Array.from(awareness.getStates().values());
      const name = allStates.find((s) => s.sessionInfo)?.sessionInfo?.name;
      if (name) setSessionName(name);
      else setSessionName("Unnamed Session");
    };

    awareness.on("change", updateName);
    updateName(); // Initial run
    fetchRoomDetails(); // Fetch + Broadcast name

    return () => awareness.off("change", updateName);
  }, [provider, fetchRoomDetails, setSessionName]);

  useEffect(() => {
    setShowPreview(false);
  }, [activeFile?.name]);

  useEffect(() => {
    if (!roomId) return;
    const aiKey = `ai_panel_opened_${roomId}`;
    if (!sessionStorage.getItem(aiKey)) {
      setAiOpen(true);
      sessionStorage.setItem(aiKey, "1");
    }
    const interviewKey = `interview_modal_opened_${roomId}`;
    if (!sessionStorage.getItem(interviewKey)) {
      setShowInterviewRecorder(true);
      sessionStorage.setItem(interviewKey, "1");
    }
  }, [roomId]);

  const handlePreviewClick = () => setShowPreview((prev) => !prev);
  const handleClosePreview = () => setShowPreview(false);

  const isHtmlFile = activeFile?.name?.endsWith?.(".html");

  const detectLang = (file) => {
    if (!file?.name) return "plaintext";
    if (file?.name.endsWith(".py")) return "python";
    if (file?.name.endsWith(".js")) return "js";
    if (file?.name.endsWith(".ts")) return "ts";
    if (file?.name.endsWith(".java")) return "java";
    if (file?.name.endsWith(".cpp")) return "cpp";
    if (file?.name.endsWith(".c")) return "c";
    return "plaintext";
  };

  const handleRunClick = async () => {
    if (!activeFile || !collabEditorRef.current) return;

    const code = collabEditorRef.current.getCode();
    const lang = detectLang(activeFile);
    if (!code || !lang) return;

    setShowOutput(true);
    setIsRunning(true);
    setOutput("");

    try {
      const result = await runCode(lang, code);
      setOutput(result.output || result.error || "// No output");
    } catch (err) {
      setOutput(err.message || "// Execution failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleCloseOutput = () => {
    setShowOutput(false);
    setOutput("");
  };

  return (
    <>
      {/* Eye Care Overlay will show up when isBreakMode is true */}
      <EyeCareOverlay isVisible={isBreakMode} onResume={resumeCoding} />
      
      {/* Eye Care Draggable Widget */}
      <EyeCareWidget 
        formattedTimeLeft={formattedTimeLeft}
        isDemoMode={isDemoMode}
        setDemoMode={setDemoMode}
      />

      <EditorNav
        onRunClick={handleRunClick} 
        onPreviewClick={handlePreviewClick}
        isHtmlFile={!!isHtmlFile}
      />

      {/* Main Layout Container - Changed to flex-col to accommodate Performance Monitor footer */}
      <div className="h-[calc(100vh-4rem)] flex flex-col overflow-x-clip bg-[#21232f]">
        
        {/* Editor Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div
            className={`h-full bg-[#21232f] transition-all duration-300 ease-in-out ${
              isSidebarOpen ? "w-[255px]" : "w-0 overflow-hidden"
            }`}
          >
            {isSidebarOpen && (
              <FileExplorer
                yDoc={yDoc}
                openFiles={openFiles}
                setOpenFiles={setOpenFiles}
                setActiveFile={setActiveFile}
                roomOrProjectId={roomId}
                sessionName={sessionName}
                isInterviewMode={isInterviewMode}
              />
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex flex-col flex-1 h-full">
            {/* File Tabs Header */}
            <div className="bg-[#21232f] flex items-center border-b border-[#e4e6f3ab]">
              <button
                title="toggle sidebar"
                aria-label="toggle sidebar"
                type="button"
                name="toggle sidebar"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="absolute top-16 left-2 flex z-20 bg-[#3D415A] hover:opacity-90 cursor-pointer text-white p-2 rounded-md transition-all duration-300"
              >
                {isSidebarOpen ? (
                  <PanelLeft height={20} width={20} />
                ) : (
                  <PanelRight height={20} width={20} />
                )}
              </button>
              {!isSidebarOpen && (
                <span className="ml-10 text-white text-sm font-semibold border-r px-4 py-2 border-[#e4e6f3ab]">
                  {sessionName}
                </span>
              )}

              <div className="flex items-center w-full">
                <FileTabs
                  openFiles={openFiles}
                  activeFile={activeFile}
                  setActiveFile={setActiveFile}
                  setOpenFiles={setOpenFiles}
                />
                <div className="ml-auto pr-4">
                  <button
                    onClick={() => setAiOpen((v) => !v)}
                    className={`flex items-center gap-2 text-sm ${aiOpen ? 'hidden' : 'bg-[#3D415A] text-white px-3 py-1 rounded-md ml-4'}`}
                    aria-pressed={aiOpen}
                  >
                    AI Assistant
                  </button>
                </div>
              </div>
            </div>

            {/* Editor and Video Call Section */}
            <div className="flex h-full overflow-hidden">
              {/* Editor Section */}
              <div
                className={`pt-3 pb-${
                  showOutput ? "0" : "3"
                } pr-2 h-full w-full flex flex-col justify-center`}
                style={{
                  width: isInterviewMode ? "100%" : "70%",
                  transition: isInterviewMode ? "none" : "width 0.3s ease",
                }}
              >
                <div
                  className={`h-full editor-wrapper flex-1 ${
                    isSidebarOpen ? "max-w-[calc(100%-2%)]" : "w-full"
                  }`}
                >
                  <CollabEditorPane
                    ref={collabEditorRef}
                    activeFile={activeFile}
                    yDoc={yDoc}
                    provider={provider}
                    roomId={roomId}
                    isInterviewMode={isInterviewMode}
                  />

                  {showPreview && (
                    <div className="w-1/2 border-l border-gray-600">
                      <HtmlPreview rawHtml={collabEditorRef.current.getCode()} onClose={handleClosePreview} />
                    </div>
                  )}
                </div>
                {showOutput && (
                  <CodeExecutionResult
                    output={output}
                    isRunning={isRunning}
                    onClose={handleCloseOutput}
                  />
                )}
              </div>

              {/* Video Call Section */}
              <div
                style={{
                  width: isInterviewMode ? "auto" : "30%",
                  flexShrink: 0,
                  transition: isInterviewMode ? "none" : "width 0.3s ease",
                  display: 'flex'
                }}
              >
                <div style={{flex: 1}}>
                  <SocketProvider>
                    <VideoCallSection
                      roomIdVCS={roomId}
                      isInterviewMode={isInterviewMode}
                      onLocalStreamChange={(s) => setLocalStreamForAI(s)}
                      onInterviewToggle={() => setAiOpen((v) => !v)}
                      aiOpen={aiOpen}
                    />
                  </SocketProvider>
                </div>
                <AIAssistantSidebar mediaStream={localStreamForAI} roomId={roomId} open={aiOpen} onToggle={() => setAiOpen((v) => !v)} />
              </div>
            </div>
          </div>
        </div>

        {/* IDE Bottom Status Bar */}
        <div className="h-6 shrink-0 bg-[#007ACC] flex justify-between text-white text-xs z-[50]">
          {/* Left Side Status Bar Items */}
          <div className="flex h-full">
            <div className="flex items-center px-3 hover:bg-white/10 cursor-pointer transition-colors h-full">
              <span className="font-medium mr-1">SynCodex</span>
            </div>
            {isInterviewMode && (
              <div className="flex items-center px-3 bg-red-600/80 h-full font-semibold">
                Interview Mode
              </div>
            )}
            <div className="flex items-center px-3 hover:bg-white/10 cursor-pointer transition-colors h-full border-l border-white/20">
              {activeFile ? activeFile.name : "No file selected"}
            </div>
          </div>
          
          {/* Right Side Status Bar Items */}
          <div className="flex h-full">
            <div className="flex items-center px-3 hover:bg-white/10 cursor-pointer transition-colors h-full border-l border-white/20">
              <span className="mr-1">UTF-8</span>
            </div>
            {/* Decoupled System Health Widget integrating Real-Time Metrics & Panel */}
            <SystemHealthWidget />
          </div>
        </div>
      </div>
      {showInterviewRecorder && (
        <InterviewRecorder
          onClose={() => setShowInterviewRecorder(false)}
          roomId={roomId}
          roomName={sessionName}
        />
      )}
    </>
  );
}
