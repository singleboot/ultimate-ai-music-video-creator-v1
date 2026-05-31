'use client';

import React, { useState, useRef, useEffect } from 'react';
import useWorkflowStore from '../../store/workflowStore';

export default function WorkflowControls({ onRun }) {
  const workflowName = useWorkflowStore((s) => s.workflowName);
  const setWorkflowName = useWorkflowStore((s) => s.setWorkflowName);
  const saveWorkflow = useWorkflowStore((s) => s.saveWorkflow);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const clearWorkflow = useWorkflowStore((s) => s.clearWorkflow);
  const savedWorkflows = useWorkflowStore((s) => s.savedWorkflows);
  const deleteSavedWorkflow = useWorkflowStore((s) => s.deleteSavedWorkflow);
  const nodes = useWorkflowStore((s) => s.nodes);

  const [showDropdown, setShowDropdown] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(workflowName);
  const dropdownRef = useRef(null);

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
    saveWorkflow();
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

      {/* Save */}
      <ToolbarButton onClick={handleSave} label="Save" />

      {/* Load dropdown */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <ToolbarButton
          onClick={() => setShowDropdown(!showDropdown)}
          label="Load"
          active={showDropdown}
        />
        {showDropdown && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              width: 280,
              background: 'rgba(15,5,30,0.98)',
              border: '1px solid rgba(176,38,255,0.3)',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              zIndex: 100,
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid rgba(176,38,255,0.15)',
                fontSize: 11,
                fontWeight: 700,
                color: '#b026ff',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Saved Workflows
            </div>
            {savedWorkflows.length === 0 ? (
              <div
                style={{
                  padding: '20px 14px',
                  textAlign: 'center',
                  color: '#6b6880',
                  fontSize: 12,
                }}
              >
                No saved workflows
              </div>
            ) : (
              savedWorkflows.map((wf) => (
                <div
                  key={wf.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom: '1px solid rgba(176,38,255,0.08)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(176,38,255,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => {
                      loadWorkflow(wf.id);
                      setShowDropdown(false);
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                      {wf.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#6b6880', marginTop: 2 }}>
                      {new Date(wf.savedAt).toLocaleDateString()} &middot;{' '}
                      {wf.nodes?.length || 0} nodes
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete "${wf.name}"?`)) {
                        deleteSavedWorkflow(wf.id);
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'rgba(239,68,68,0.15)',
                      color: '#ef4444',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Clear */}
      <ToolbarButton onClick={handleClear} label="Clear" variant="danger" />

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
    </div>
  );
}

function ToolbarButton({ onClick, label, variant = 'default', active = false }) {
  const isDanger = variant === 'danger';
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 8,
        border: `1px solid ${active ? '#b026ff' : 'rgba(176,38,255,0.2)'}`,
        background: active ? 'rgba(176,38,255,0.15)' : 'rgba(255,255,255,0.04)',
        color: isDanger ? '#ef4444' : '#b9b4d0',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isDanger
          ? 'rgba(239,68,68,0.15)'
          : 'rgba(176,38,255,0.12)';
        e.currentTarget.style.borderColor = isDanger
          ? 'rgba(239,68,68,0.4)'
          : 'rgba(176,38,255,0.4)';
        e.currentTarget.style.color = isDanger ? '#ef4444' : '#fff';
      }}
      onMouseLeave={(e) => {
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
