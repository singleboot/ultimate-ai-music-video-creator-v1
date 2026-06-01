import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'mv-workflows';
const AUTOSAVE_KEY = 'mv-autosave';
const TEXT_BACKUP_KEY = 'mv-text-backups';

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function safeSerialize(state) {
  try {
    return JSON.stringify(state, (key, val) => {
      if (typeof File !== 'undefined' && val instanceof File) return undefined;
      if (typeof val === 'function') return undefined;
      return val;
    });
  } catch {
    return JSON.stringify({ nodes: [], edges: [], savedWorkflows: [] });
  }
}

function safeDeserialize(str) {
  const parsed = safeJsonParse(str);
  if (!parsed || typeof parsed !== 'object' || !parsed.state) return null;
  return parsed;
}

const useWorkflowStore = create(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      workflowName: 'Untitled Workflow',
      projectPath: '',
      savedWorkflows: [],

      onNodesChange: (changes) => {
        set((state) => {
          const next = applyNodeChanges(state.nodes, changes);
          return { nodes: next };
        });
      },

      onEdgesChange: (changes) => {
        set((state) => {
          const next = applyEdgeChanges(state.edges, changes);
          return { edges: next };
        });
      },

      addNode: (node) => {
        set((state) => ({
          nodes: [...state.nodes, node],
        }));
      },

      removeNode: (nodeId) => {
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== nodeId),
          edges: state.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
          selectedNodeId:
            state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        }));
      },

      updateNodeData: (nodeId, data) => {
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
          ),
        }));
      },

      resizeNodeCentered: (nodeId, newWidth, newHeight) => {
        set((state) => ({
          nodes: state.nodes.map((n) => {
            if (n.id !== nodeId) return n;
            const oldW = n.width || n.measured?.width || 200;
            const oldH = n.height || n.measured?.height || 80;
            const dw = newWidth - oldW;
            const dh = newHeight - oldH;
            return {
              ...n,
              width: newWidth,
              height: newHeight,
              position: {
                x: n.position.x - dw / 2,
                y: n.position.y - dh / 2,
              },
            };
          }),
        }));
      },

      setSelectedNode: (nodeId) => {
        set({ selectedNodeId: nodeId });
      },

      setWorkflowName: (name) => {
        set({ workflowName: name });
      },

      setProjectPath: (path) => {
        set({ projectPath: path });
      },

      saveWorkflow: () => {
        const { nodes, edges, workflowName, projectPath, savedWorkflows } = get();
        const id = Date.now().toString();
        const entry = {
          id,
          name: workflowName,
          path: projectPath,
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          savedAt: new Date().toISOString(),
        };
        const exists = savedWorkflows.findIndex((w) => w.name === workflowName);
        let next;
        if (exists >= 0) {
          next = savedWorkflows.map((w, i) => (i === exists ? entry : w));
        } else {
          next = [...savedWorkflows, entry];
        }
        set({ savedWorkflows: next });
        return entry;
      },

      autoSaveWorkflow: () => {
        const { nodes, edges, workflowName } = get();
        if (nodes.length === 0) return;
        try {
          const snapshot = {
            nodes: JSON.parse(JSON.stringify(nodes, (k, v) => {
              if (typeof File !== 'undefined' && v instanceof File) return undefined;
              if (typeof v === 'function') return undefined;
              return v;
            })),
            edges: JSON.parse(JSON.stringify(edges)),
            workflowName,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
        } catch (e) { /* silent */ }
      },

      backupTextContent: () => {
        const { nodes } = get();
        const texts = {};
        nodes.forEach((n) => {
          const d = n.data || {};
          const id = n.id;
          if (d.lyrics && typeof d.lyrics === 'string' && d.lyrics.trim()) texts[id + '|lyrics'] = d.lyrics;
          if (d.prompts) texts[id + '|prompts'] = typeof d.prompts === 'string' ? d.prompts : JSON.stringify(d.prompts);
          if (d.theme && typeof d.theme === 'string' && d.theme.trim()) texts[id + '|theme'] = d.theme;
          if (d.prompt && typeof d.prompt === 'string' && d.prompt.trim()) texts[id + '|prompt'] = d.prompt;
          if (d.text && typeof d.text === 'string' && d.text.trim()) texts[id + '|text'] = d.text;
        });
        if (Object.keys(texts).length === 0) return;
        try {
          const existing = safeJsonParse(localStorage.getItem(TEXT_BACKUP_KEY)) || { backups: [] };
          const backups = Array.isArray(existing.backups) ? existing.backups : [];
          backups.push({ savedAt: new Date().toISOString(), content: texts });
          if (backups.length > 20) backups.shift();
          localStorage.setItem(TEXT_BACKUP_KEY, JSON.stringify({ backups }));
        } catch (e) { /* silent */ }
      },

      restoreAutoSave: () => {
        try {
          const raw = localStorage.getItem(AUTOSAVE_KEY);
          if (!raw) return null;
          const data = safeJsonParse(raw);
          if (!data || !data.nodes || data.nodes.length === 0) return null;
          return data;
        } catch { return null; }
      },

      applyAutoSave: (data) => {
        if (!data || !data.nodes) return false;
        set({
          nodes: data.nodes,
          edges: data.edges || [],
          workflowName: data.workflowName || 'Restored Workflow',
        });
        return true;
      },

      loadWorkflow: (workflowId) => {
        const { savedWorkflows } = get();
        const wf = savedWorkflows.find((w) => w.id === workflowId);
        if (!wf) return false;
        set({
          nodes: JSON.parse(JSON.stringify(wf.nodes)),
          edges: JSON.parse(JSON.stringify(wf.edges)),
          workflowName: wf.name,
          projectPath: wf.path || '',
          selectedNodeId: null,
        });
        return true;
      },

      clearWorkflow: () => {
        set({
          nodes: [],
          edges: [],
          selectedNodeId: null,
          workflowName: 'Untitled Workflow',
          projectPath: '',
        });
      },

      listSavedWorkflows: () => {
        return get().savedWorkflows;
      },

      deleteSavedWorkflow: (workflowId) => {
        set((state) => ({
          savedWorkflows: state.savedWorkflows.filter((w) => w.id !== workflowId),
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      serialize: safeSerialize,
      deserialize: safeDeserialize,
      partialize: (state) => ({
        savedWorkflows: state.savedWorkflows,
        workflowName: state.workflowName,
        projectPath: state.projectPath,
        nodes: state.nodes,
        edges: state.edges,
        selectedNodeId: state.selectedNodeId,
      }),
    }
  )
);

function applyNodeChanges(nodes, changes) {
  let next = [...nodes];
  for (const change of changes) {
    if (change.type === 'position' && change.position) {
      const idx = next.findIndex((n) => n.id === change.id);
      if (idx >= 0) {
        next[idx] = { ...next[idx], position: change.position };
      }
    } else if (change.type === 'dimensions' && change.dimensions) {
      const idx = next.findIndex((n) => n.id === change.id);
      if (idx >= 0) {
        next[idx] = {
          ...next[idx],
          measured: { ...next[idx].measured, ...change.dimensions },
          width: change.dimensions.width || next[idx].width,
          height: change.dimensions.height || next[idx].height,
        };
      }
    } else if (change.type === 'remove') {
      next = next.filter((n) => n.id !== change.id);
    } else if (change.type === 'select') {
      const idx = next.findIndex((n) => n.id === change.id);
      if (idx >= 0) {
        next[idx] = { ...next[idx], selected: change.selected };
      }
    }
  }
  return next;
}

function applyEdgeChanges(edges, changes) {
  let next = [...edges];
  for (const change of changes) {
    if (change.type === 'remove') {
      next = next.filter((e) => e.id !== change.id);
    } else if (change.type === 'select') {
      const idx = next.findIndex((e) => e.id === change.id);
      if (idx >= 0) {
        next[idx] = { ...next[idx], selected: change.selected };
      }
    } else if (change.type === 'add' && change.item) {
      next.push(change.item);
    }
  }
  return next;
}

export default useWorkflowStore;
