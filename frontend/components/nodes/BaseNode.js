'use client';

import React, { useState } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';

const spinnerKeyframes = `
@keyframes bv-spinner {
  to { transform: rotate(360deg); }
}
`;

function SpinnerSmall() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 12, height: 12,
        border: '2px solid rgba(255,255,255,0.25)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'bv-spinner 0.7s linear infinite',
      }}
    />
  );
}

function handleTopOffset(count, index) {
  const headerH = 36;
  const spacing = 24;
  return `${headerH + spacing * index + 8}px`;
}

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
  const useLabeled = !!(inputHandles || outputHandles);

  return (
    <>
      <style>{spinnerKeyframes}</style>
      <NodeResizer
        minWidth={180}
        minHeight={60}
        isVisible={selected}
        handleStyle={{
          width: 8, height: 8, borderRadius: 2,
          background: color,
          border: '2px solid rgba(15,5,30,0.95)',
        }}
        lineStyle={{
          borderColor: 'rgba(176,38,255,0.2)',
        }}
      />
      <div
        data-nodeid={nodeId}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: 'rgba(15,5,30,0.95)',
          border: `1px solid ${selected ? color : isRunning ? color : 'rgba(176,38,255,0.2)'}`,
          borderRadius: 12,
          color: '#fff',
          minWidth: 180,
          fontFamily: 'inherit',
          boxShadow: selected
            ? `0 0 20px ${color}40, 0 2px 12px rgba(0,0,0,0.4)`
            : isRunning ? `0 0 16px ${color}30` : '0 2px 12px rgba(0,0,0,0.4)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          position: 'relative',
          ...overrideStyle,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '7px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isRunning ? color : '#4ade80',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>
            {title}
          </span>
          {isRunning && <SpinnerSmall />}
          {(selected || hovered) && nodeId && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                data.onDelete?.(nodeId);
              }}
              style={{
                width: 18, height: 18, borderRadius: 4,
                background: 'rgba(239,68,68,0.12)',
                color: '#ef4444',
                fontSize: 10, fontWeight: 700,
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
        <div style={{ padding: '8px 10px 10px' }}>{children}</div>

        {/* Input handles */}
        {useLabeled && inputHandles
          ? inputHandles.map((h, i) => (
              <div key={h.id}>
                <Handle
                  type="target"
                  position={Position.Left}
                  id={h.id}
                  style={{
                    background: color,
                    width: 8, height: 8,
                    border: '2px solid rgba(15,5,30,0.95)',
                    top: handleTopOffset(inputHandles.length, i),
                    left: -4,
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: handleTopOffset(inputHandles.length, i),
                    transform: 'translateX(10px) translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    fontSize: 9,
                    color: '#b9b4d0',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontSize: 10 }}>{h.icon}</span>
                  <span style={{ marginLeft: 1 }}>{h.label}</span>
                </div>
              </div>
            ))
          : hasInput && !useLabeled &&
            Array.from({ length: inputCount }).map((_, i) => (
              <Handle
                key={`in-${i}`}
                type="target"
                position={Position.Top}
                id={`input-${i}`}
                style={{
                  background: '#b026ff',
                  width: 8, height: 8,
                  border: '2px solid rgba(15,5,30,0.95)',
                  top: -4,
                  left: inputCount === 1 ? '50%' : `${((i + 1) / (inputCount + 1)) * 100}%`,
                }}
              />
            ))}

        {/* Output handles */}
        {useLabeled && outputHandles
          ? outputHandles.map((h, i) => (
              <div key={h.id}>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={h.id}
                  style={{
                    background: '#63d4ff',
                    width: 8, height: 8,
                    border: '2px solid rgba(15,5,30,0.95)',
                    top: handleTopOffset(outputHandles.length, i),
                    right: -4,
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: handleTopOffset(outputHandles.length, i),
                    transform: 'translateX(-10px) translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    fontSize: 9,
                    color: '#b9b4d0',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    flexDirection: 'row-reverse',
                  }}
                >
                  <span style={{ fontSize: 10 }}>{h.icon}</span>
                  <span>{h.label}</span>
                </div>
              </div>
            ))
          : hasOutput && !useLabeled &&
            Array.from({ length: outputCount }).map((_, i) => (
              <Handle
                key={`out-${i}`}
                type="source"
                position={Position.Bottom}
                id={`output-${i}`}
                style={{
                  background: '#63d4ff',
                  width: 8, height: 8,
                  border: '2px solid rgba(15,5,30,0.95)',
                  bottom: -4,
                  left: outputCount === 1 ? '50%' : `${((i + 1) / (outputCount + 1)) * 100}%`,
                }}
              />
            ))}
      </div>
    </>
  );
}

const inputBase = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 8,
  border: '1px solid rgba(176,38,255,0.15)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  fontSize: 11,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

const selectBase = {
  ...inputBase,
  appearance: 'none',
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23b9b4d0' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  paddingRight: 26,
};

const labelBase = {
  display: 'block',
  fontSize: 10,
  fontWeight: 500,
  color: '#b9b4d0',
  marginBottom: 3,
};

const btnBase = {
  width: '100%',
  padding: '6px 12px',
  borderRadius: 8,
  border: 'none',
  background: '#b026ff',
  color: '#fff',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.15s, opacity 0.15s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
};

export { inputBase, selectBase, labelBase, btnBase };
