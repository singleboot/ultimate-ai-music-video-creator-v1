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

const MAX_HISTORY = 40;

function pushToUndo(nodes, edges, undoStack) {
  try {
    const snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes, (k, v) => {
        if (typeof File !== 'undefined' && v instanceof File) return undefined;
        if (typeof v === 'function') return undefined;
        return v;
      })),
      edges: JSON.parse(JSON.stringify(edges)),
    };

    if (undoStack.length > 0) {
      const last = undoStack[undoStack.length - 1];
      if (JSON.stringify(last.nodes) === JSON.stringify(snapshot.nodes) &&
          JSON.stringify(last.edges) === JSON.stringify(snapshot.edges)) {
        return;
      }
    }

    if (undoStack.length >= MAX_HISTORY) {
      undoStack.shift();
    }
    undoStack.push(snapshot);
  } catch (e) {
    // silent fallback
  }
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
      _undoStack: [],

      undo: () => {
        const stack = get()._undoStack;
        if (stack.length === 0) return;
        const prev = stack.pop();
        set({
          nodes: prev.nodes,
          edges: prev.edges,
          selectedNodeId: null,
          _undoStack: [...stack],
        });
      },

      hasUndoHistory: () => {
        return get()._undoStack.length > 0;
      },

      onNodesChange: (changes) => {
        const hasRemove = changes.some((c) => c.type === 'remove');
        if (hasRemove) {
          pushToUndo(get().nodes, get().edges, get()._undoStack);
        }
        set((state) => {
          const next = applyNodeChanges(state.nodes, changes);
          return { nodes: next };
        });
      },

      onEdgesChange: (changes) => {
        const hasStructChange = changes.some((c) => c.type === 'add' || c.type === 'remove');
        if (hasStructChange) {
          pushToUndo(get().nodes, get().edges, get()._undoStack);
        }
        set((state) => {
          const next = applyEdgeChanges(state.edges, changes);
          return { edges: next };
        });
      },

      addNode: (node) => {
        pushToUndo(get().nodes, get().edges, get()._undoStack);
        set((state) => ({
          nodes: [...state.nodes, node],
        }));
      },

      removeNode: (nodeId) => {
        pushToUndo(get().nodes, get().edges, get()._undoStack);
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
          nodes: state.nodes.map((n) => {
            if (n.id !== nodeId) return n;
            
            let extra = {};
            if (data && data.hasOwnProperty('collapsed')) {
              if (data.collapsed) {
                // Collapsing: save explicit width/height and clear them so React Flow re-measures
                extra = {
                  width: undefined,
                  height: undefined,
                  data: {
                    ...n.data,
                    ...data,
                    expandedWidth: n.width || n.measured?.width,
                    expandedHeight: n.height || n.measured?.height
                  }
                };
              } else {
                // Expanding: restore saved dimensions
                extra = {
                  width: n.data.expandedWidth || undefined,
                  height: n.data.expandedHeight || undefined,
                  data: {
                    ...n.data,
                    ...data
                  }
                };
              }
            } else {
              extra = {
                data: { ...n.data, ...data }
              };
            }
            return {
              ...n,
              ...extra
            };
          }),
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

      saveWorkflow: async () => {
        const { nodes, edges, workflowName, projectPath, savedWorkflows } = get();
        if (!nodes || nodes.length === 0) return null;
        const id = Date.now().toString();
        const entry = {
          id,
          name: workflowName,
          path: projectPath,
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          savedAt: new Date().toISOString(),
        };

        // Save to project folder if projectPath is set
        if (projectPath) {
          try {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${API}/api/projects/sync-assets`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                project_path: projectPath,
                nodes: entry.nodes,
                edges: entry.edges,
                workflow_name: workflowName
              })
            });
            if (response.ok) {
              const resData = await response.json();
              if (resData.status === 'ok' && resData.nodes) {
                const currentNodesStr = JSON.stringify(nodes);
                const newNodesStr = JSON.stringify(resData.nodes);
                if (currentNodesStr !== newNodesStr) {
                  set({ nodes: resData.nodes });
                }
              }
            } else {
              console.error('Failed to sync project assets:', response.statusText);
            }
          } catch (e) {
            console.error('Error syncing project assets:', e);
          }
        }

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

      saveWorkflowAs: async (newName) => {
        if (!newName || !newName.trim()) return null;
        const name = newName.trim();
        const { nodes, edges, projectPath, savedWorkflows } = get();
        const id = Date.now().toString();
        const entry = {
          id,
          name,
          path: projectPath,
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          savedAt: new Date().toISOString(),
        };

        if (projectPath) {
          try {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${API}/api/projects/save-as`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                project_path: projectPath,
                new_name: name,
                workflow: {
                  name,
                  nodes: entry.nodes,
                  edges: edges
                }
              })
            });
            if (response.ok) {
              const resData = await response.json();
              if (resData.status === 'ok') {
                const newProjectPath = resData.project_path;
                const newProjectName = resData.project_name;
                entry.path = newProjectPath;
                entry.name = newProjectName;
                set({
                  projectPath: newProjectPath,
                  workflowName: newProjectName
                });
              } else {
                throw new Error(resData.detail || 'Failed to Save As');
              }
            } else {
              const errData = await response.json();
              throw new Error(errData.detail || 'Failed to Save As');
            }
          } catch (e) {
            console.error('Error saving workflow as:', e);
            throw e;
          }
        } else {
          set({
            workflowName: name
          });
        }

        const exists = savedWorkflows.findIndex((w) => w.name === name);
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
        pushToUndo(get().nodes, get().edges, get()._undoStack);
        set({
          nodes: JSON.parse(JSON.stringify(wf.nodes)),
          edges: JSON.parse(JSON.stringify(wf.edges)),
          workflowName: wf.name,
          projectPath: wf.path || '',
          selectedNodeId: null,
        });
        return true;
      },

      openProjectFolder: async (path) => {
        if (!path) return null;
        try {
          const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
          const response = await fetch(`${API}/api/projects/open-folder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
          });
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'ok') {
              pushToUndo(get().nodes, get().edges, get()._undoStack);
              const wf = data.workflow;
              if (wf) {
                set({
                  nodes: wf.nodes || [],
                  edges: wf.edges || [],
                  workflowName: wf.name || 'Folder Project',
                  projectPath: path,
                  selectedNodeId: null,
                });
                return wf;
              } else {
                // Initialize clean workflow state associated with this project folder path
                set({
                  nodes: [],
                  edges: [],
                  workflowName: 'Folder Project',
                  projectPath: path,
                  selectedNodeId: null,
                });
                // Auto-save the workflow.json file to disk
                setTimeout(() => {
                  get().saveWorkflow();
                }, 200);
                return { name: 'Folder Project', nodes: [], edges: [] };
              }
            }
          }
        } catch (e) {
          console.error('Error opening project folder:', e);
        }
        return null;
      },

      clearWorkflow: () => {
        pushToUndo(get().nodes, get().edges, get()._undoStack);
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
