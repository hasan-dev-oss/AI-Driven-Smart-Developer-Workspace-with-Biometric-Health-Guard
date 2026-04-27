import React, { useState, useEffect, useCallback, useRef } from "react";
import { FileTabs } from "../components/editor/FileTabs";
import { FileExplorer } from "../components/editor/FileExplorer";
import { EditorPane } from "../components/editor/EditorPane";
import EditorNav from "../components/editor/EditorNav";
import { PanelLeft, PanelRight } from "lucide-react";
import { runCode } from "../services/codeExec";
import HtmlPreview from "../components/editor/HtmlPreview";
import { useParams } from "react-router-dom";
import API from "../services/api";
import useMeta from "../hooks/useMeta";
import TerminalComponent from "../components/terminal/TerminalComponent";
import { useFlowTracker } from "../hooks/useFlowTracker";
import { useHealthTracker } from "../hooks/useHealthTracker";
import ProximityDetectionProvider from "../components/editor/ProximityDetectionProvider";

export default function EditorPage() {
  useMeta();
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [projectName, setProjectName] = useState("Loading...");
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isTerminalVisible, setIsTerminalVisible] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(260);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(0);
  const editorRef = useRef(null);
  const editorContainerRef = useRef(null);

  const { projectId } = useParams();

  const { statusIcon } = useFlowTracker(editorRef);
  const healthData = useHealthTracker(editorRef);

  const fetchProjectDetails = useCallback(async () => {
    try {
      const response = await API.get(
        "/api/projects/project-details",
        {
          headers: {
            token: localStorage.getItem("token"),
            email: localStorage.getItem("email"),
            projectid: projectId,
          },
        }
      );

      setProjectName(response.data.name || "Untitled Project");
    } catch (error) {
      console.error("Error fetching project details:", error);
    }
  }, [projectId]);

  useEffect(() => {
    setShowPreview(false);
  }, [activeFile?.name]);

  const handlePreviewClick = () => setShowPreview((prev) => !prev);
  const handleClosePreview = () => setShowPreview(false);

  const isHtmlFile = activeFile?.name?.endsWith?.(".html");

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

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
    if (!code || !activeFile) return;
    const lang = detectLang(activeFile);
    setIsRunning(true);
    setIsTerminalVisible(true);
    setOutput("");
    try {
      const res = await runCode(lang, code);
      setOutput(res.output || res.error || "// No output");
    } catch (err) {
      setOutput(err.message || "// Execution failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleTerminalResizeStart = (event) => {
    event.preventDefault();
    resizeStartYRef.current = event.clientY;
    resizeStartHeightRef.current = terminalHeight;
    setIsResizingTerminal(true);
  };

  useEffect(() => {
    if (!isResizingTerminal) return;

    const handleMouseMove = (event) => {
      const delta = resizeStartYRef.current - event.clientY;
      const nextHeight = Math.min(460, Math.max(180, resizeStartHeightRef.current + delta));
      setTerminalHeight(nextHeight);
    };

    const handleMouseUp = () => setIsResizingTerminal(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingTerminal]);

  return (
    <ProximityDetectionProvider containerRef={editorContainerRef}>
      <div className="editor-container" ref={editorContainerRef}>
        <EditorNav
          onRunClick={handleRunClick}
          onPreviewClick={handlePreviewClick}
          isHtmlFile={!!isHtmlFile}
          flowStatus={statusIcon}
          healthData={healthData}
        />

        <div className="editor-main">
          <nav className={`editor-sidebar ${isSidebarOpen ? "open" : "closed"}`}>
          {isSidebarOpen && (
            <FileExplorer
              openFiles={openFiles}
              setOpenFiles={setOpenFiles}
              setActiveFile={setActiveFile}
              sessionName={projectName}
              roomOrProjectId={projectId}
            />
          )}
        </nav>

        <div className="editor-content">
          <div className="editor-tabs-bar">
            <button
              title="toggle sidebar"
              aria-label="toggle sidebar"
              type="button"
              name="toggle sidebar"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="btn btn-icon sidebar-toggle"
            >
              {isSidebarOpen ? (
                <PanelLeft size={18} />
              ) : (
                <PanelRight size={18} />
              )}
            </button>
            {!isSidebarOpen && (
              <span className="project-label">{projectName}</span>
            )}

            <FileTabs
              openFiles={openFiles}
              activeFile={activeFile}
              setActiveFile={setActiveFile}
              setOpenFiles={setOpenFiles}
            />
          </div>

          <div className="editor-pane-container">
            <div className="editor-pane-wrapper">
              <div
                className={`editor-pane-main ${
                  showPreview ? "split-view" : "full-width"
                }`}
              >
                <EditorPane ref={editorRef} activeFile={activeFile} onCodeChange={setCode} projectId={projectId}/>
              </div>

              {showPreview && (
                <div className="editor-preview-pane">
                  <HtmlPreview rawHtml={code} onClose={handleClosePreview} />
                </div>
              )}
            </div>

            {isTerminalVisible && (
              <>
                <div
                  role="separator"
                  aria-label="Resize terminal pane"
                  onMouseDown={handleTerminalResizeStart}
                  className="panel-resize-handle"
                />
                <div className="editor-terminal" style={{ height: `${terminalHeight}px` }}>
                  <TerminalComponent
                    projectId={projectId}
                    output={output}
                    isRunning={isRunning}
                    onClose={() => setIsTerminalVisible(false)}
                  />
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      </div>
    </ProximityDetectionProvider>
  );
}
