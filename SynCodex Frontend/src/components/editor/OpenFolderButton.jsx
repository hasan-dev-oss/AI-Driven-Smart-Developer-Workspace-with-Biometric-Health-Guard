import { useCallback } from "react";
import { FolderOpen } from "lucide-react";
import { useFileStore } from "../../stores/fileExplorerStore";
import { directoryHandleToJsonTree } from "../../utils/directoryTree";

const OpenFolderButton = () => {
  const { setFileTree, setLoading, setError } = useFileStore();

  const handleOpenFolder = useCallback(async () => {
    if (typeof window === "undefined" || !window.showDirectoryPicker) {
      setError("Open Folder is not supported in this browser.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const directoryHandle = await window.showDirectoryPicker({
        mode: "read",
      });

      const tree = await directoryHandleToJsonTree(directoryHandle);
      setFileTree([tree]);
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      setError(error?.message || "Failed to open folder.");
      console.error("Open Folder failed:", error);
    } finally {
      setLoading(false);
    }
  }, [setError, setFileTree, setLoading]);

  return (
    <button
      type="button"
      onClick={handleOpenFolder}
      className="p-1 rounded-sm cursor-pointer hover:bg-[#2A2D2E] text-gray-400 hover:text-[#cccccc] transition-colors"
      aria-label="Open local folder"
      title="Open local folder..."
    >
      <FolderOpen size={16} />
    </button>
  );
};

export default OpenFolderButton;
