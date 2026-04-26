import React, { useCallback, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  File,
} from 'lucide-react';
import { useFileStore } from '../../stores/fileExplorerStore';

/**
 * FileTreeNode Component
 * Recursively renders file/folder tree with expand/collapse functionality
 * Consumes Zustand state for openFolders and activeFileId
 * Uses React.memo for performance optimization
 */
const FileTreeNode = React.memo(
  ({ node, level = 0, onFileSelect, onContextMenu, onRename }) => {
    const { openFolders, activeFileId, toggleFolder, renamingItem, setRenamingItem, renameNode, setActiveFile } =
      useFileStore();

    const isExpanded = useMemo(
      () => openFolders.includes(node.id),
      [openFolders, node.id]
    );

    const isFolder = node.type === 'folder';
    const hasChildren = isFolder && node.children && node.children.length > 0;
    const isActive = activeFileId === node.id;
    const isRenaming = renamingItem?.id === node.id;

    // Handle folder expand/collapse
    const handleToggle = useCallback(
      (e) => {
        e.stopPropagation();
        toggleFolder(node.id);
      },
      [node.id, toggleFolder]
    );

    // Handle file selection - set active file in store and call parent handler
    const handleSelect = useCallback(
      (e) => {
        e.stopPropagation();
        if (!isFolder) {
          setActiveFile(node.id); // Set active file in Zustand store
          onFileSelect?.(node);
        }
      },
      [node, isFolder, onFileSelect, setActiveFile]
    );

    // Handle context menu
    const handleContextMenu = useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu?.(e, node);
      },
      [node, onContextMenu]
    );

    // Handle rename
    const handleRenameChange = useCallback(
      (e) => {
        const newName = e.target.value;
        if (e.key === 'Enter' && newName.trim()) {
          if (onRename) {
            onRename(node, newName.trim());
          } else {
            renameNode(node.id, newName.trim());
          }
          setRenamingItem(null);
        } else if (e.key === 'Escape') {
          setRenamingItem(null);
        }
      },
      [node, onRename, renameNode, setRenamingItem]
    );

    const handleRenameBlur = useCallback(() => {
      setRenamingItem(null);
    }, [setRenamingItem]);

    // Get appropriate icon
    const IconComponent = useMemo(() => {
      if (isFolder) {
        return isExpanded ? FolderOpen : Folder;
      }
      // Determine icon based on file extension
      if (node.name?.endsWith('.js') || node.name?.endsWith('.jsx')) {
        return FileCode;
      }
      return File;
    }, [isFolder, isExpanded, node.name]);

    const paddingLeft = level * 16;

    return (
      <div className="select-none">
        {/* Node Row */}
        <div
          className={`
            flex items-center gap-1.5 px-2 py-[3px] cursor-pointer
            transition-colors duration-75 group
            ${isActive ? 'bg-[#37373D] text-white' : 'text-[#cccccc] hover:bg-[#2A2D2E] hover:text-white'}
          `}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={handleSelect}
          onContextMenu={handleContextMenu}
        >
          {/* Chevron - only show if folder with children */}
          <div className="w-4 flex items-center justify-center shrink-0">
            {isFolder && hasChildren && (
              <button
                onClick={handleToggle}
                className="p-0.5 hover:bg-[#3C3C3D] rounded-sm transition-colors opacity-80 group-hover:opacity-100"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="text-[#cccccc]" />
                ) : (
                  <ChevronRight size={14} className="text-[#cccccc]" />
                )}
              </button>
            )}
          </div>

          {/* Icon */}
          <IconComponent
            size={14}
            className={`shrink-0 ${
              isFolder ? 'text-[#dcb67a]' : 'text-[#519aba]'
            }`}
          />

          {/* Name - Editable or Static */}
          {isRenaming ? (
            <input
              type="text"
              defaultValue={node.name}
              onKeyDown={handleRenameChange}
              onBlur={handleRenameBlur}
              autoFocus
              className="
                flex-1 bg-[#1e1e1e] text-[#cccccc] px-1 py-0 rounded-sm
                outline-none border border-[#007fd4] text-[13px] leading-tight
              "
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 text-[13px] tracking-wide truncate">
              {node.name}
            </span>
          )}
        </div>

        {/* Children - Rendered only if expanded */}
        {isFolder && isExpanded && hasChildren && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.id}
                node={child}
                level={level + 1}
                onFileSelect={onFileSelect}
                onContextMenu={onContextMenu}
                onRename={onRename}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for memoization
    // Only re-render if node or level changes
    // Store state changes (openFolders, activeFileId) trigger re-renders automatically
    return (
      prevProps.node.id === nextProps.node.id &&
      prevProps.level === nextProps.level &&
      prevProps.onFileSelect === nextProps.onFileSelect &&
      prevProps.onContextMenu === nextProps.onContextMenu &&
      prevProps.onRename === nextProps.onRename
    );
  }
);

FileTreeNode.displayName = 'FileTreeNode';

export default FileTreeNode;
