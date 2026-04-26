import { useState, useEffect, useCallback } from "react";
import CreateRoomModal from "./CreateRoomModal";
import CreateProjectModal from "./CreateProjectModal";
import JoinRoomModal from "./JoinRoomModal";
import axios from "axios";
import { Trash } from "lucide-react";
import DeleteRoomProjectModal from "./card_pop_menu/DeleteRoomProjectModal";

export default function DashboardView() {
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [joinRoomModalOpen, setJoinRoomModalOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [projects, setProjects] = useState([]);

  const [showDeleteModalOpen, setShowDeleteModalOpen] = useState(false);
  const [deleteItemData, setDeleteItemData] = useState({
    name: "",
    type: "",
    id: "",
  });
  const formatDate = (isoDateString) => {
    const date = new Date(isoDateString);

    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" }); // "May"
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0"); // 24hr format
    const minutes = date.getMinutes().toString().padStart(2, "0");

    return `${day} ${month} ${year} ${hours}:${minutes}`;
  };

  const fetchUserSessions = useCallback(async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/rooms/my-rooms",
        {
          headers: {
            token: localStorage.getItem("token"),
            email: localStorage.getItem("email"),
          },
        }
      );
      console.log("User Sessions :", response.data);
      setSessions(response.data); // ✅ Store in state
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  }, []);

  const fetchUserProjects = useCallback(async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/projects/my-projects",
        {
          headers: {
            token: localStorage.getItem("token"),
            email: localStorage.getItem("email"),
          },
        }
      );
      console.log("User Projects:", response.data);
      setProjects(response.data); // ✅ Store in state
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }, []);

  useEffect(() => {
    fetchUserProjects();
    fetchUserSessions();
  }, [fetchUserProjects, fetchUserSessions]);

  return (
    <div className="flex flex-col gap-8 text-gray-200 p-8 font-sans max-w-7xl mx-auto">
      {/* Top Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
        {["Create Room", "Join Room", "Start Coding"].map((text, index) => (
          <div
            key={index}
            onClick={() => {
              if (text === "Create Room") setRoomModalOpen(true);
              if (text === "Start Coding") setProjectModalOpen(true);
              if (text === "Join Room") setJoinRoomModalOpen(true);
            }}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#161b22] to-[#0d1117] p-6 shadow-lg transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 flex flex-col items-center justify-center gap-4 h-full">
              <div className="w-14 h-14 flex items-center justify-center bg-indigo-500/10 text-indigo-400 rounded-full group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-all duration-300 shadow-inner">
                <span className="text-3xl font-light mb-1">+</span>
              </div>
              <span className="text-lg font-semibold tracking-wide text-gray-200 group-hover:text-white transition-colors">{text}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Sessions Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">Recent Sessions</h2>
          <button className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white transition-all shadow-sm">
            View All Sessions
          </button>
        </div>
      {sessions.length === 0 ? (
        <div className="border border-dashed border-white/20 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-white/5">
          <p className="text-gray-400 text-lg">
            No sessions found. Click <span className="font-semibold text-indigo-400 tracking-wide">"Create Room"</span> to start a new session, <br />
            or <span className="font-semibold text-indigo-400 tracking-wide">"Join Room"</span> to collaborate.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sessions.map((session, index) => (
            <div
              key={index}
              className="group bg-[#161b22] border border-white/5 p-5 rounded-2xl h-44 flex flex-col justify-start cursor-pointer hover:border-white/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
              onClick={() => {
                if (session.isInterviewMode) return;
                else {
                  window.open(`/collab-editor/${session.roomId}`, "_blank");
                }
              }}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-start mb-3">
                <h3 className={`text-lg font-bold truncate pr-3 leading-tight ${session.isInterviewMode ? 'bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-400' : 'text-gray-100 group-hover:text-white transition-colors'}`}> 
                  {session.name} 
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteItemData({
                      name: session.name,
                      type: "room",
                      id: session.roomId,
                    });
                    setShowDeleteModalOpen(true);
                  }}
                  className="bg-red-500/10 text-red-400 p-2 rounded-lg cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
                  title="Delete Session"
                >
                  <Trash size={16} />
                </button>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 overflow-hidden mb-auto">
                {session.description?.trim()
                  ? session.description
                  : "No description provided"}
              </p>
              <div className="flex flex-col mt-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span className="font-mono bg-white/5 px-2 py-1 rounded truncate max-w-[60%]">ID: {session.roomId}</span>
                  <span>{formatDate(session.createdAt).split(' ')[0]} {formatDate(session.createdAt).split(' ')[1]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* My Files (Fetched Projects) */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">My Files</h2>
          <button className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white transition-all shadow-sm">
            View All Files
          </button>
        </div>
        
        {projects.length === 0 ? (
          <div className="border border-dashed border-white/20 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-white/5">
            <p className="text-gray-400 text-lg">
              No projects found. Click <span className="font-semibold text-purple-400 tracking-wide">"Start Coding"</span> to create a new project.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {projects.map((project, index) => (
              <div
                key={index}
                className="group bg-[#161b22] border border-white/5 p-5 rounded-2xl h-44 flex flex-col justify-start cursor-pointer hover:border-white/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                onClick={() =>
                  window.open(`/editor/${project.projectId}`, "_blank")
                }
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold truncate pr-3 leading-tight text-gray-100 group-hover:text-white transition-colors">
                    {project.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteItemData({
                        name: project.name,
                        type: "project",
                        id: project.projectId,
                      });
                      setShowDeleteModalOpen(true);
                    }}
                    className="bg-red-500/10 text-red-400 p-2 rounded-lg cursor-pointer opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
                    title="Delete Project"
                  >
                    <Trash size={16} />
                  </button>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 overflow-hidden mb-auto">
                  {project.description?.trim()
                    ? project.description
                    : "No description provided"}
                </p>
                <div className="flex flex-col mt-4 pt-4 border-t border-white/5">
                  <div className="flex justify-start items-center text-xs text-gray-400">
                    <span>{formatDate(project.createdAt).split(' ')[0]} {formatDate(project.createdAt).split(' ')[1]} {formatDate(project.createdAt).split(' ')[2]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {roomModalOpen && (
        <CreateRoomModal onClose={() => setRoomModalOpen(false)} />
      )}
      {projectModalOpen && (
        <CreateProjectModal onClose={() => setProjectModalOpen(false)} />
      )}
      {joinRoomModalOpen && (
        <JoinRoomModal onClose={() => setJoinRoomModalOpen(false)} />
      )}
      {showDeleteModalOpen && (
        <DeleteRoomProjectModal
          onClose={() => setShowDeleteModalOpen(false)}
          name={deleteItemData.name}
          type={deleteItemData.type}
          roomOrProjectId={deleteItemData.id}
          fetchProjects={fetchUserProjects}
          fetchSessions={fetchUserSessions}
        />
      )}
    </div>
  );
}
