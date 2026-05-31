import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'mv-workflows';

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
      partialize: (state) => ({
        savedWorkflows: state.savedWorkflows,
        workflowName: state.workflowName,
        projectPath: state.projectPath,
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
