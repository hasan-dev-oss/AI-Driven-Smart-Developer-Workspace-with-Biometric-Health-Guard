import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, LogOut, ClipboardList, UserRound, Bell } from "lucide-react";
import { toast } from "react-toastify";
import useMeta from "../hooks/useMeta";

import UserAvatar from "../components/userAvatar";
import DashboardView from "../components/dashboard/DashboardView";
import AccountView from "../components/dashboard/AccountView";
import { useUser } from "../context/UserContext";

export default function Dashboard() { 
  useMeta();
  const [activeTab, setActiveTab] = useState("sessions");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [Box, setBox] = useState(false);
  const { userName } = useUser();
  const avatarUrl = `https://robohash.org/${userName}?set=set5&size=50x50`;
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    toast.success("Logged out!");
    navigate("/");
  };

  const CustomButton = ({ children, onClick, className }) => (
    <button
      type="button"
      name="button"
      title="button"
      aria-label="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-md transition-all duration-300 ${className}`}
    >
      {children}
    </button>
  );

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleBox = () => setBox(!Box);

  return (
    <div className="flex h-screen bg-[#0d1117] text-gray-200 font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "hidden"
        } p-6 bg-[#161b22] flex flex-col justify-between border-r border-white/10 shadow-2xl z-20`}
      >
        <div>
          <h1 className="text-[40px] font-bold font-Chakra bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 drop-shadow-md mb-8 tracking-wider">
            SynCodex
          </h1>
          <div className="mb-8">
            <UserAvatar />
          </div>
          <nav className="space-y-3">
            <CustomButton
              className={`w-full flex items-center justify-start px-4 py-3 cursor-pointer text-base font-medium rounded-xl border border-transparent transition-all duration-200 ${
                activeTab === "sessions"
                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("sessions")}
            >
              <ClipboardList size={20} className="mr-3" />
              Activities
            </CustomButton>
            <CustomButton
              className={`w-full flex items-center justify-start px-4 py-3 cursor-pointer text-base font-medium rounded-xl border border-transparent transition-all duration-200 ${
                activeTab === "account"
                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`}
              onClick={() => setActiveTab("account")}
            >
              <UserRound size={20} className="mr-3" />
              Account
            </CustomButton>
            <CustomButton
              className="w-full flex items-center justify-start px-4 py-3 mt-4 text-base font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200 border border-transparent cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut size={20} className="mr-3" /> Logout
            </CustomButton>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#0d1117] relative">
        {/* Top Bar - Glassmorphism */}
        <div className="flex items-center px-8 py-4 border-b border-white/5 max-md:justify-between sticky top-0 bg-[#0d1117]/80 backdrop-blur-xl z-10 shadow-sm">
          <CustomButton
            onClick={toggleSidebar}
            className="p-2.5 mr-4 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg cursor-pointer max-md:hidden transition-colors"
          >
            ☰
          </CustomButton>
          <h1 className="text-3xl font-bold font-Chakra bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 md:hidden w-[60%]">
            SynCodex
          </h1>
          
          <div className="flex-1 max-w-2xl mx-auto flex items-center max-md:hidden group relative">
            <Search
              className="absolute left-4 text-gray-400 group-focus-within:text-indigo-400 transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Search projects, files or sessions..."
              className="w-full bg-[#161b22] border border-white/10 hover:border-white/20 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 focus:bg-[#1c2128] text-gray-200 placeholder-gray-500 pl-11 pr-4 py-2.5 rounded-xl outline-none transition-all duration-300 shadow-inner"
            />
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <CustomButton className="p-2.5 text-gray-400 bg-[#161b22] border border-white/10 hover:border-white/20 hover:text-white rounded-xl shadow-sm transition-all cursor-pointer">
              <Bell size={20} />
            </CustomButton>
            <img
              src={avatarUrl}
              alt={userName}
              className="w-10 h-10 rounded-full md:hidden border-2 border-indigo-500/50 shadow-md cursor-pointer"
              onClick={toggleBox}
            />
          </div>
          <div
            className={`${
              Box ? "" : "hidden"
            } p-4 bg-[#21232f] flex flex-col shadow-xl rounded-xl justify-between absolute top-25 right-15`}
          >
            <nav className="mt-6 space-y-2">
              <CustomButton
                className={`w-full flex items-center justify-center cursor-pointer text-xl ${
                  activeTab === "sessions"
                    ? "bg-[#3D415A]"
                    : "bg-[#21232f] hover:bg-[#3D415A]"
                }`}
                onClick={() => setActiveTab("sessions")}
              >
                <ClipboardList size={25} className="mr-2" />
                Activities
              </CustomButton>
              <CustomButton
                className={`w-full flex items-center justify-center cursor-pointer text-xl ${
                  activeTab === "account"
                    ? "bg-[#3D415A]"
                    : "bg-[#21232f] hover:bg-[#3D415A]"
                }`}
                onClick={() => setActiveTab("account")}
              >
                <UserRound size={25} className="mr-2" />
                Account
              </CustomButton>
              <CustomButton
                className="w-full flex items-center justify-center text-xl  text-red-400 hover:bg-[#3D415A] cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut size={25} className="mr-2" /> Logout
              </CustomButton>
            </nav>
          </div>
        </div>

        {/* Content Switcher */}
        {activeTab === "sessions" ? <DashboardView /> : <AccountView />}
      </main>
    </div>
  );
}
