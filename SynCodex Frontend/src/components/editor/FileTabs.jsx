import { X } from "lucide-react";
import "./FileTabs.css";

export const FileTabs = ({
  openFiles,
  activeFile,
  setActiveFile,
  setOpenFiles,
}) => {
  const closeTab = (e, fileToClose) => {
    e.stopPropagation();
    const updatedTabs = openFiles.filter(
      (f) =>
        f.name !== fileToClose.name || f.folderName !== fileToClose.folderName
    );
    setOpenFiles(updatedTabs);
    if (activeFile?.name === fileToClose.name && 
        activeFile?.folderName === fileToClose.folderName) {
      setActiveFile(updatedTabs[0] || null);
    }
  };

  return (
    <div className="editor-tabs">
      {openFiles.map((file) => (
        <div
          key={`${file.folderName}-${file.name}`}
          className={`editor-tab ${activeFile === file ? "active" : ""}`}
          onClick={() => setActiveFile(file)}
        >
          <span className="tab-label">{file.name}</span>
          <button
            onClick={(e) => closeTab(e, file)}
            className="tab-close"
            aria-label="Close tab"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
