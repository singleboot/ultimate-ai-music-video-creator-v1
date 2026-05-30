const RECENT_KEY = 'mv_project_recent';
const CURRENT_KEY = 'mv_project_current';
const SETTINGS_KEY = 'mv_settings';

const DEFAULT_SETTINGS = {
  mode: 'local',
  comfyuiHost: '127.0.0.1',
  comfyuiPort: 8188,
  comfyuiCloudUrl: '',
  comfyuiCloudKey: '',
  falApiKey: '',
  falModelEndpoint: '',
  defaultWidth: 1920,
  defaultHeight: 1080,
  defaultFps: 24,
  defaultSteps: 30,
  defaultCfg: 1.0,
};

export function getSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getRecentProjects() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentProject(project) {
  const projects = getRecentProjects().filter(p => p.path !== project.path);
  projects.unshift({
    name: project.name,
    path: project.path,
    createdAt: project.createdAt || new Date().toISOString(),
    lastOpened: new Date().toISOString(),
  });
  localStorage.setItem(RECENT_KEY, JSON.stringify(projects.slice(0, 10)));
}

export function removeRecentProject(path) {
  const projects = getRecentProjects().filter(p => p.path !== path);
  localStorage.setItem(RECENT_KEY, JSON.stringify(projects));
}

export function setCurrentProject(project) {
  if (typeof window === 'undefined') return;
  if (project) {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(project));
    addRecentProject(project);
  } else {
    localStorage.removeItem(CURRENT_KEY);
  }
}

export function getCurrentProject() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getApiBaseUrl() {
  const settings = getSettings();
  switch (settings.mode) {
    case 'comfyui_cloud':
      return settings.comfyuiCloudUrl || 'http://127.0.0.1:8000';
    case 'fal':
      return 'https://api.fal.ai';
    default:
      return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  }
}
