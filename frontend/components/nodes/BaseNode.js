'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import useWorkflowStore from '../../store/workflowStore';

export default function BaseNode({
  children,
  title = 'Node',
  color = '#b026ff',
  isRunning = false,
  selected = false,
  hasInput = false,
  hasOutput = true,
  inputCount = 1,
  outputCount = 1,
  inputHandles,
  outputHandles,
  style: overrideStyle = {},
  nodeId = null,
  data = {},
}) {
  const [hovered, setHovered] = useState(false);
  const [resizing, setResizing] = useState(false);
  const useLabeled = !!(inputHandles || outputHandles);
  const startPos = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const resizeNodeCentered = useWorkflowStore((s) => s.resizeNodeCentered);
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === nodeId));

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const nodeEl = e.currentTarget.parentElement;
    if (!nodeEl) return;
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      w: nodeEl.offsetWidth,
      h: nodeEl.offsetHeight,
    };
    setResizing(true);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!resizing) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const newW = Math.max(180, startPos.current.w + dx);
    const newH = Math.max(60, startPos.current.h + dy);
    resizeNodeCentered(nodeId, newW, newH);
  }, [resizing, nodeId, resizeNodeCentered]);

  const handlePointerUp = useCallback(() => {
    setResizing(false);
  }, []);

  useEffect(() => {
    if (!resizing) return;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [resizing, handlePointerMove, handlePointerUp]);

  const nodeW = node?.width || undefined;
  const nodeH = node?.height || undefined;

  return (
    <div
      data-nodeid={nodeId}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(15,5,30,0.95)',
        border: `1px solid ${selected ? color : isRunning ? color : 'rgba(176,38,255,0.2)'}`,
        borderRadius: 10,
        color: '#fff',
        minWidth: 150,
        width: nodeW,
        height: nodeH,
        fontFamily: 'inherit',
        boxShadow: selected
          ? `0 0 16px ${color}35, 0 2px 8px rgba(0,0,0,0.4)`
          : isRunning ? `0 0 12px ${color}25` : '0 2px 8px rgba(0,0,0,0.4)',
        transition: resizing ? 'none' : 'border-color 0.2s, box-shadow 0.2s',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        ...overrideStyle,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '5px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 5, height: 5, borderRadius: '50%',
            background: isRunning ? color : '#4ade80',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 600, flex: 1, lineHeight: 1.3 }}>
          {title}
        </span>
        {(selected || hovered) && nodeId && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              data.onDelete?.(nodeId);
            }}
            style={{
              width: 16, height: 16, borderRadius: 3,
              background: 'rgba(239,68,68,0.12)',
              color: '#ef4444',
              fontSize: 9, fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
          >
            x
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '5px 8px 8px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>

      {/* Resize handle (bottom-right corner) */}
      {(selected || hovered) && (
        <div
          onPointerDown={handlePointerDown}
          style={{
            position: 'absolute',
            bottom: 0, right: 0,
            width: 16, height: 16,
            cursor: 'nwse-resize',
            zIndex: 20,
            touchAction: 'none',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ position: 'absolute', bottom: 2, right: 2 }}>
            <line x1="12" y1="4" x2="12" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="12" x2="4" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9" y1="7" x2="9" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9" y1="9" x2="7" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {/* Input handles */}
      {useLabeled && inputHandles
        ? inputHandles.map((h, i) => {
            const top = `${26 + 22 * i + 6}px`;
            return (
              <div key={h.id}>
                <Handle
                  type="target"
                  position={Position.Left}
                  id={h.id}
                  style={{
                    background: color,
                    width: 7, height: 7,
                    border: '2px solid rgba(15,5,30,0.95)',
                    top, left: -4, zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: 'absolute', left: 0, top,
                    transform: 'translateX(8px) translateY(-50%)',
                    display: 'flex', alignItems: 'center', gap: 2,
                    fontSize: 8, color: '#b9b4d0',
                    pointerEvents: 'none', whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontSize: 9 }}>{h.icon}</span>
                  <span>{h.label}</span>
                </div>
              </div>
            );
          })
        : hasInput && !useLabeled &&
            Array.from({ length: inputCount }).map((_, i) => (
              <Handle
                key={`in-${i}`}
                type="target"
                position={Position.Top}
                id={`input-${i}`}
                style={{
                  background: '#b026ff',
                  width: 7, height: 7,
                  border: '2px solid rgba(15,5,30,0.95)',
                  top: -4,
                  left: inputCount === 1 ? '50%' : `${((i + 1) / (inputCount + 1)) * 100}%`,
                }}
              />
            ))}

      {/* Output handles */}
      {useLabeled && outputHandles
        ? outputHandles.map((h, i) => {
            const top = `${26 + 22 * i + 6}px`;
            return (
              <div key={h.id}>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={h.id}
                  style={{
                    background: '#63d4ff',
                    width: 7, height: 7,
                    border: '2px solid rgba(15,5,30,0.95)',
                    top, right: -4, zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: 'absolute', right: 0, top,
                    transform: 'translateX(-8px) translateY(-50%)',
                    display: 'flex', alignItems: 'center', gap: 2,
                    fontSize: 8, color: '#b9b4d0',
                    pointerEvents: 'none', whiteSpace: 'nowrap',
                    flexDirection: 'row-reverse',
                  }}
                >
                  <span style={{ fontSize: 9 }}>{h.icon}</span>
                  <span>{h.label}</span>
                </div>
              </div>
            );
          })
        : hasOutput && !useLabeled &&
            Array.from({ length: outputCount }).map((_, i) => (
              <Handle
                key={`out-${i}`}
                type="source"
                position={Position.Bottom}
                id={`output-${i}`}
                style={{
                  background: '#63d4ff',
                  width: 7, height: 7,
                  border: '2px solid rgba(15,5,30,0.95)',
                  bottom: -4,
                  left: outputCount === 1 ? '50%' : `${((i + 1) / (outputCount + 1)) * 100}%`,
                }}
              />
            ))}
    </div>
  );
}

const inputBase = {
  width: '100%',
  padding: '4px 6px',
  borderRadius: 6,
  border: '1px solid rgba(176,38,255,0.15)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  fontSize: 10,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

const selectBase = {
  ...inputBase,
  appearance: 'none',
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='%23b9b4d0' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 6px center',
  paddingRight: 20,
};

const labelBase = {
  display: 'block',
  fontSize: 9,
  fontWeight: 500,
  color: '#b9b4d0',
  marginBottom: 2,
};

const btnBase = {
  width: '100%',
  padding: '2px 5px',
  borderRadius: 4,
  border: 'none',
  background: '#b026ff',
  color: '#fff',
  fontSize: 9,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.15s, opacity 0.15s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
};

export { inputBase, selectBase, labelBase, btnBase };
