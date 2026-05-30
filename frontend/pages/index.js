import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  FaPlus, FaFolderOpen, FaFolder, FaClock, FaTrash, FaCog,
  FaMusic, FaFilm, FaArrowRight, FaTimes, FaExclamationTriangle,
} from 'react-icons/fa';
import GlassCard from '../components/shared/GlassCard';
import GlowButton from '../components/shared/GlowButton';
import SettingsPanel from '../components/shared/SettingsPanel';
import {
  getRecentProjects, removeRecentProject, setCurrentProject,
} from '../lib/projectStore';
import { openProject, createProject, getHealth } from '../lib/api';

function getErrorDetail(err) {
  if (!err.response) return 'Cannot reach the API server. Make sure the backend (Python/FastAPI) is running.';
  return err.response.data?.detail || err.message || 'An unknown error occurred';
}

export default function Welcome() {
  const router = useRouter();
  const [recentProjects, setRecentProjects] = useState([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showOpenProject, setShowOpenProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
  const [openPath, setOpenPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    setRecentProjects(getRecentProjects());
    getHealth().then(r => setHealth(r.data)).catch(() => setHealth(null));
  }, []);

  const refreshRecent = () => setRecentProjects(getRecentProjects());

  const handleCreateProject = async () => {
    if (!newName.trim()) { toast.error('Enter a project name'); return; }
    if (!newPath.trim()) { toast.error('Enter a parent folder path'); return; }
    setLoading(true);
    try {
      const parentPath = newPath.trim().replace(/[/\\]+$/, '');
      const res = await createProject(parentPath, newName.trim());
      const project = res.data.project;
      setCurrentProject(project);
      toast.success(`Project "${project.name}" created!`);
      refreshRecent();
      router.push('/workspace');
    } catch (err) {
      toast.error(getErrorDetail(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProject = async () => {
    if (!openPath.trim()) { toast.error('Enter the project folder path'); return; }
    setLoading(true);
    try {
      const path = openPath.trim().replace(/[/\\]+$/, '');
      const res = await openProject(path);
      const project = res.data.project;
      setCurrentProject(project);
      toast.success(`Opened "${project.name}"`);
      refreshRecent();
      router.push('/workspace');
    } catch (err) {
      toast.error(getErrorDetail(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecent = async (project) => {
    setLoading(true);
    try {
      const res = await openProject(project.path);
      setCurrentProject(res.data.project);
      refreshRecent();
      router.push('/workspace');
    } catch (err) {
      toast.error(getErrorDetail(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRecent = (e, path) => {
    e.stopPropagation();
    removeRecentProject(path);
    refreshRecent();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      {/* Backend status indicator */}
      <div className="fixed top-6 left-6 z-50 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${health ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'}`} />
        <span className="text-[#b9b4d0] text-xs">{health ? 'API Connected' : 'API Offline'}</span>
      </div>

      {/* Settings button */}
      <button
        onClick={() => setShowSettings(true)}
        className="fixed top-6 right-6 z-50 p-3 rounded-xl glass hover:bg-white/5 text-[#b9b4d0] hover:text-white border border-[rgba(176,38,255,0.2)] hover:border-[#b026ff] transition-all group"
        title="Settings"
      >
        <FaCog size={18} className="group-hover:rotate-90 transition-transform duration-500" />
      </button>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-5xl relative z-10"
      >
        {/* Hero */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FaFilm className="text-[#ff3bd4] text-3xl" />
            <FaMusic className="text-[#63d4ff] text-2xl" />
          </div>
          <h1 className="font-bebas text-6xl md:text-8xl leading-none tracking-wider text-white neon-text mb-2">
            ULTIMATE
          </h1>
          <h1 className="font-bebas text-4xl md:text-6xl leading-none tracking-wider text-gradient-purple-pink mb-4">
            MUSIC VIDEO CREATOR
          </h1>
          <p className="text-[#b9b4d0] text-sm md:text-base max-w-lg mx-auto">
            Where Music Meets Cinema — AI-powered platform for generating music, voiceovers, concepts, and cinematic videos
          </p>
        </motion.div>

        {/* Backend offline warning */}
        {!health && (
          <motion.div variants={itemVariants} className="mb-6">
            <div className="glass rounded-xl p-4 border border-red-500/30 flex items-start gap-3">
              <FaExclamationTriangle className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-300 text-sm font-semibold">API Server Not Reachable</p>
                <p className="text-[#b9b4d0] text-xs mt-1">
                  The Python backend at port 8000 is not responding. Start it with LAUNCH.bat or run{' '}
                  <code className="text-[#63d4ff]">uvicorn app.main:app --port 8000</code> from the project root.
                  Without it, creating/opening projects will fail.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Actions */}
        <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6 mb-10">
          {/* New Project */}
          <GlassCard glow="purple" className="cursor-pointer group" onClick={() => setShowNewProject(true)}>
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-[rgba(176,38,255,0.15)] border border-[rgba(176,38,255,0.3)] flex items-center justify-center mb-4 group-hover:shadow-[0_0_30px_rgba(176,38,255,0.3)] transition-all duration-500">
                <FaPlus className="text-[#b026ff] text-2xl" />
              </div>
              <h3 className="text-white text-lg font-semibold mb-1">New Project</h3>
              <p className="text-[#b9b4d0] text-sm">Create a fresh project with a new folder structure</p>
            </div>
          </GlassCard>

          {/* Open Project */}
          <GlassCard glow="blue" className="cursor-pointer group" onClick={() => setShowOpenProject(true)}>
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-[rgba(99,212,255,0.15)] border border-[rgba(99,212,255,0.3)] flex items-center justify-center mb-4 group-hover:shadow-[0_0_30px_rgba(99,212,255,0.3)] transition-all duration-500">
                <FaFolderOpen className="text-[#63d4ff] text-2xl" />
              </div>
              <h3 className="text-white text-lg font-semibold mb-1">Open Project</h3>
              <p className="text-[#b9b4d0] text-sm">Browse and open an existing project folder</p>
            </div>
          </GlassCard>
        </motion.div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-2 mb-5">
              <FaClock className="text-[#b9b4d0] text-sm" />
              <h2 className="text-[#b9b4d0] text-sm font-medium tracking-wide uppercase">Recent Projects</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-[rgba(176,38,255,0.3)] to-transparent ml-3" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects.map((project) => (
                <motion.button
                  key={project.path}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectRecent(project)}
                  className="glass rounded-xl p-4 text-left group border border-[rgba(176,38,255,0.15)] hover:border-[rgba(176,38,255,0.4)] transition-all duration-300 relative"
                  disabled={loading}
                >
                  <button
                    onClick={(e) => handleRemoveRecent(e, project.path)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-[#b9b4d0] hover:text-red-400 transition-all"
                    title="Remove from recent"
                  >
                    <FaTrash size={10} />
                  </button>
                  <div className="flex items-center gap-3 mb-2">
                    <FaFolder className="text-[#b026ff] text-lg shrink-0" />
                    <span className="text-white text-sm font-semibold truncate">{project.name}</span>
                  </div>
                  <p className="text-[#b9b4d0] text-xs truncate mb-2">{project.path}</p>
                  <p className="text-[#b9b4d0] text-xs opacity-60">
                    {new Date(project.lastOpened).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.p variants={itemVariants} className="text-center text-[#b9b4d0] text-xs mt-12 opacity-40">
          Ultimate Music Video Creator v2 &copy; {new Date().getFullYear()}
        </motion.p>
      </motion.div>

      {/* ===== New Project Modal ===== */}
      <AnimatePresence>
        {showNewProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowNewProject(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg glass-strong rounded-2xl p-8 border border-[rgba(176,38,255,0.3)]"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <FaPlus className="text-[#b026ff]" />
                  <h2 className="text-xl font-bebas tracking-wider text-white">New Project</h2>
                </div>
                <button onClick={() => setShowNewProject(false)} className="p-2 rounded-xl hover:bg-white/5 text-[#b9b4d0] hover:text-white transition-all">
                  <FaTimes size={16} />
                </button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2">Project Name</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="input-neon"
                    placeholder="e.g. My Music Video"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2">
                    Parent Folder <span className="text-[#b9b4d0] opacity-50">(where the project folder will be created)</span>
                  </label>
                  <input
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    className="input-neon"
                    placeholder="D:/Videos"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowNewProject(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm text-[#b9b4d0] border border-[rgba(176,38,255,0.3)] hover:border-[#b026ff] transition-all"
                  >
                    Cancel
                  </button>
                  <GlowButton color="purple" size="md" fullWidth onClick={handleCreateProject} loading={loading}>
                    <FaArrowRight className="inline mr-2" /> Create Project
                  </GlowButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Open Project Modal ===== */}
      <AnimatePresence>
        {showOpenProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowOpenProject(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg glass-strong rounded-2xl p-8 border border-[rgba(176,38,255,0.3)]"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <FaFolderOpen className="text-[#63d4ff]" />
                  <h2 className="text-xl font-bebas tracking-wider text-white">Open Project</h2>
                </div>
                <button onClick={() => setShowOpenProject(false)} className="p-2 rounded-xl hover:bg-white/5 text-[#b9b4d0] hover:text-white transition-all">
                  <FaTimes size={16} />
                </button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#b9b4d0] mb-2">Project Folder Path</label>
                    <input
                      value={openPath}
                      onChange={(e) => setOpenPath(e.target.value)}
                      className="input-neon"
                      placeholder="D:/Videos/my-project"
                    />
                    <p className="text-[#b9b4d0] text-xs mt-1.5 leading-relaxed">
                    Point to a folder that already contains a <code className="text-[#63d4ff]">project.json</code> file (made by this app when you create a new project).
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowOpenProject(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm text-[#b9b4d0] border border-[rgba(176,38,255,0.3)] hover:border-[#b026ff] transition-all"
                  >
                    Cancel
                  </button>
                  <GlowButton color="blue" size="md" fullWidth onClick={handleOpenProject} loading={loading}>
                    <FaArrowRight className="inline mr-2" /> Open Project
                  </GlowButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Settings Panel ===== */}
      <SettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}