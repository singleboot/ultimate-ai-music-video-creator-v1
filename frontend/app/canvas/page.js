'use client';

import React, { useEffect, useCallback, useState, Suspense } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useSearchParams } from 'next/navigation';
import NodeCanvas from '../../components/canvas/NodeCanvas';
import NodeSidebar from '../../components/canvas/NodeSidebar';
import WorkflowControls from '../../components/canvas/WorkflowControls';
import { executeWorkflow } from '../../lib/executor';
import useWorkflowStore from '../../store/workflowStore';

function CanvasInner() {
  const searchParams = useSearchParams();
  const loadId = searchParams.get('load');
  const newName = searchParams.get('name');
  const newPath = searchParams.get('path');
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const setWorkflowName = useWorkflowStore((s) => s.setWorkflowName);
  const setProjectPath = useWorkflowStore((s) => s.setProjectPath);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const clearWorkflow = useWorkflowStore((s) => s.clearWorkflow);
  const openProjectFolder = useWorkflowStore((s) => s.openProjectFolder);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (loadId) {
        loadWorkflow(loadId);
      } else if (newName) {
        clearWorkflow();
        setWorkflowName(newName);
        if (newPath) {
          setProjectPath(newPath);
          // Wait briefly for state update to complete, then initialize workflow.json on disk
          setTimeout(() => {
            useWorkflowStore.getState().saveWorkflow();
          }, 200);
        }
      } else if (newPath) {
        await openProjectFolder(newPath);
      }
    };
    init();
  }, [loadId, newName, newPath, loadWorkflow, setWorkflowName, setProjectPath, clearWorkflow, openProjectFolder]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          useWorkflowStore.getState().undo();
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          useWorkflowStore.getState().saveWorkflow();
        } else if (e.key.toLowerCase() === 'o') {
          e.preventDefault();
          const path = useWorkflowStore.getState().projectPath;
          if (path) {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            fetch(`${API}/api/projects/reveal`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path })
            }).catch(err => console.error("Failed to reveal folder via hotkey:", err));
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRun = useCallback(async () => {
    if (executing) return;
    setExecuting(true);
    try {
      const result = await executeWorkflow(nodes, edges, updateNodeData);
      if (!result.success) {
        console.error('Workflow execution failed:', result.error);
      }
    } catch (err) {
      console.error('Workflow execution error:', err);
    } finally {
      setExecuting(false);
    }
  }, [nodes, edges, updateNodeData, executing]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#05010d',
        position: 'relative',
      }}
    >
      <WorkflowControls onRun={handleRun} />
      <NodeSidebar />
      <div
        style={{
          position: 'absolute',
          top: 56,
          left: 280,
          right: 0,
          bottom: 0,
        }}
      >
        <NodeCanvas />
      </div>

      {executing && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 24px',
            borderRadius: 12,
            background: 'rgba(15,5,30,0.95)',
            border: '1px solid rgba(176,38,255,0.4)',
            backdropFilter: 'blur(16px)',
            color: '#b026ff',
            fontSize: 13,
            fontWeight: 600,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 0 30px rgba(176,38,255,0.2)',
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '2px solid rgba(176,38,255,0.3)',
              borderTopColor: '#b026ff',
              animation: 'spin 0.7s linear infinite',
              display: 'inline-block',
            }}
          />
          Executing workflow...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}

export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <Suspense
        fallback={
          <div
            style={{
              width: '100vw',
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#05010d',
              color: '#b026ff',
              fontSize: 14,
            }}
          >
            Loading canvas...
          </div>
        }
      >
        <CanvasInner />
      </Suspense>
    </ReactFlowProvider>
  );
}
