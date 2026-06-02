'use client';

import React, { useState, useRef, useEffect } from 'react';
import useWorkflowStore from '../../store/workflowStore';
import SettingsPanel from '../settings/SettingsPanel';

export default function WorkflowControls({ onRun }) {
  const workflowName = useWorkflowStore((s) => s.workflowName);
  const setWorkflowName = useWorkflowStore((s) => s.setWorkflowName);
  const projectPath = useWorkflowStore((s) => s.projectPath);
  const setProjectPath = useWorkflowStore((s) => s.setProjectPath);
  const saveWorkflow = useWorkflowStore((s) => s.saveWorkflow);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const clearWorkflow = useWorkflowStore((s) => s.clearWorkflow);
  const openProjectFolder = useWorkflowStore((s) => s.openProjectFolder);
  const savedWorkflows = useWorkflowStore((s) => s.savedWorkflows);
  const deleteSavedWorkflow = useWorkflowStore((s) => s.deleteSavedWorkflow);
  const nodes = useWorkflowStore((s) => s.nodes);

  const [showDropdown, setShowDropdown] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(workflowName);
  const [showSettings, setShowSettings] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const dropdownRef = useRef(null);

  const handleOpenFolder = async () => {
    const newPath = window.prompt('Enter project folder path:', projectPath || '');
    if (newPath && newPath.trim()) {
      const cleanPath = newPath.trim();
      const loaded = await openProjectFolder(cleanPath);
      if (loaded) {
        try {
          const raw = localStorage.getItem('mv_recent_folders') || '[]';
          const list = JSON.parse(raw);
          const updated = [cleanPath, ...list.filter(x => x !== cleanPath)].slice(0, 8);
          localStorage.setItem('mv_recent_folders', JSON.stringify(updated));
        } catch (e) {}
      }
    }
  };
  const handleRevealFolder = async () => {
    if (!projectPath) return;
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      await fetch(`${API}/api/projects/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: projectPath })
      });
    } catch (e) {
      console.error('Failed to reveal project folder:', e);
    }
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = () => {
    try {
      saveWorkflow();
      setSaveMsg('Saved!');
    } catch {
      setSaveMsg('Save failed');
    }
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleClear = () => {
    if (window.confirm('Clear the entire canvas? This cannot be undone.')) {
      clearWorkflow();
    }
  };

  const handleNameSubmit = () => {
    setWorkflowName(nameInput.trim() || 'Untitled Workflow');
    setEditing(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 280,
        right: 0,
        height: 56,
        background: 'rgba(10,3,20,0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(176,38,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
        zIndex: 50,
        boxSizing: 'border-box',
      }}
    >
      {/* Home button */}
      <a
        href="/"
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid rgba(176,38,255,0.2)',
          background: 'rgba(255,255,255,0.04)',
          color: '#b9b4d0',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(176,38,255,0.12)';
          e.currentTarget.style.borderColor = 'rgba(176,38,255,0.4)';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          e.currentTarget.style.borderColor = 'rgba(176,38,255,0.2)';
          e.currentTarget.style.color = '#b9b4d0';
        }}
      >
        {'\u2190'} Home
      </a>

      {/* Logo */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: '#b026ff',
          letterSpacing: '-0.02em',
          marginRight: 8,
          whiteSpace: 'nowrap',
        }}
      >
        MV Creator
      </div>

      {/* Separator */}
      <div
        style={{
          width: 1,
          height: 24,
          background: 'rgba(176,38,255,0.2)',
          flexShrink: 0,
        }}
      />

      {/* Workflow name */}
      {editing ? (
        <input
          autoFocus
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onBlur={handleNameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNameSubmit();
            if (e.key === 'Escape') {
              setNameInput(workflowName);
              setEditing(false);
            }
          }}
          style={{
            padding: '5px 10px',
            borderRadius: 8,
            border: '1px solid rgba(176,38,255,0.4)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            outline: 'none',
            fontFamily: 'inherit',
            width: 200,
          }}
        />
      ) : (
        <div
          onClick={() => {
            setNameInput(workflowName);
            setEditing(true);
          }}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
            cursor: 'pointer',
            padding: '5px 10px',
            borderRadius: 8,
            border: '1px solid transparent',
            transition: 'border-color 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(176,38,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          {workflowName}
        </div>
      )}

      {/* Project folder selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {projectPath ? (
          <>
            <div
              style={{
                fontSize: 11,
                color: '#6b6880',
                padding: '4px 8px',
                borderRadius: 6,
                background: 'rgba(176,38,255,0.05)',
                border: '1px solid rgba(176,38,255,0.1)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 200,
              }}
              title={projectPath}
            >
              📁 {projectPath}
            </div>
            <button
              onClick={handleOpenFolder}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid rgba(176,38,255,0.2)',
                background: 'rgba(255,255,255,0.04)',
                color: '#b9b4d0',
                fontSize: 10,
                cursor: 'pointer',
                fontWeight: 600,
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(176,38,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#b9b4d0'; }}
            >
              Change
            </button>
            <button
              onClick={handleRevealFolder}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid rgba(34,197,94,0.2)',
                background: 'rgba(255,255,255,0.04)',
                color: '#b9b4d0',
                fontSize: 10,
                cursor: 'pointer',
                fontWeight: 600,
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.15)'; e.currentTarget.style.borderColor = 'rgba(34,197,94,0.4)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(34,197,94,0.2)'; e.currentTarget.style.color = '#b9b4d0'; }}
            >
              Reveal
            </button>
          </>
        ) : (
          <button
            onClick={handleOpenFolder}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid rgba(99,212,255,0.3)',
              background: 'rgba(99,212,255,0.08)',
              color: '#63d4ff',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,212,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(99,212,255,0.5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99,212,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(99,212,255,0.3)'; }}
          >
            📂 Open Project
          </button>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Node count */}
      <div
        style={{
          fontSize: 11,
          color: '#b9b4d0',
          whiteSpace: 'nowrap',
        }}
      >
        {nodes.length} node{nodes.length !== 1 ? 's' : ''}
      </div>

      {/* Undo */}
      <ToolbarButton onClick={() => useWorkflowStore.getState().undo()} label="↩ Undo" />

      {/* Save */}
        <ToolbarButton onClick={handleSave} label={saveMsg || 'Save'} variant={saveMsg ? 'success' : 'default'} />



      {/* Clear */}
      <ToolbarButton onClick={handleClear} label="Clear" variant="danger" />

      {/* Settings */}
      <ToolbarButton 
        onClick={() => setShowSettings(true)} 
        label="⚙️ Settings" 
        active={showSettings}
      />

      {/* Run */}
      <button
        onClick={onRun}
        style={{
          padding: '8px 20px',
          borderRadius: 10,
          border: 'none',
          background: 'linear-gradient(135deg, #b026ff, #7c3aed)',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          letterSpacing: '0.02em',
          transition: 'all 0.2s',
          boxShadow: '0 0 20px rgba(176,38,255,0.3)',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 0 30px rgba(176,38,255,0.5)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(176,38,255,0.3)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {'\u25B6'} Run Workflow
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

function ToolbarButton({ onClick, label, variant = 'default', active = false }) {
  const isDanger = variant === 'danger';
  const isSuccess = variant === 'success';
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 8,
        border: `1px solid ${isSuccess ? '#22c55e' : active ? '#b026ff' : 'rgba(176,38,255,0.2)'}`,
        background: isSuccess ? 'rgba(34,197,94,0.15)' : active ? 'rgba(176,38,255,0.15)' : 'rgba(255,255,255,0.04)',
        color: isSuccess ? '#22c55e' : isDanger ? '#ef4444' : '#b9b4d0',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => { if (isSuccess) return;
        e.currentTarget.style.background = isDanger
          ? 'rgba(239,68,68,0.15)'
          : 'rgba(176,38,255,0.12)';
        e.currentTarget.style.borderColor = isDanger
          ? 'rgba(239,68,68,0.4)'
          : 'rgba(176,38,255,0.4)';
        e.currentTarget.style.color = isDanger ? '#ef4444' : '#fff';
      }}
      onMouseLeave={(e) => { if (isSuccess) return;
        e.currentTarget.style.background = active
          ? 'rgba(176,38,255,0.15)'
          : 'rgba(255,255,255,0.04)';
        e.currentTarget.style.borderColor = active
          ? '#b026ff'
          : 'rgba(176,38,255,0.2)';
        e.currentTarget.style.color = isDanger ? '#ef4444' : '#b9b4d0';
      }}
    >
      {label}
    </button>
  );
}
