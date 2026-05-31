'use client';

import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';

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
        width: 14, height: 14,
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'bv-spinner 0.7s linear infinite',
      }}
    />
  );
}

function handleTopOffset(count, index) {
  const headerH = 41;
  const spacing = 26;
  return `${headerH + spacing * index + 10}px`;
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

      <div
        data-nodeid={nodeId}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: 'rgba(15,5,30,0.95)',
          border: `1px solid ${selected ? color : isRunning ? color : 'rgba(176,38,255,0.3)'}`,
          borderRadius: 16,
          color: '#fff',
          minWidth: 220,
          maxWidth: 300,
          fontFamily: 'inherit',
          boxShadow: selected
            ? `0 0 24px ${color}50, 0 4px 20px rgba(0,0,0,0.4)`
            : isRunning
              ? `0 0 20px ${color}40`
              : '0 4px 20px rgba(0,0,0,0.4)',
          transition: 'border-color 0.3s, box-shadow 0.3s',
          position: 'relative',
          ...overrideStyle,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '10px 14px',
            borderBottom: '1px solid rgba(176,38,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: `linear-gradient(135deg, ${color}18, transparent)`,
            borderRadius: '16px 16px 0 0',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isRunning ? color : '#4ade80',
              boxShadow: isRunning ? `0 0 8px ${color}` : '0 0 6px #4ade8080',
              animation: isRunning ? 'bv-spinner 1s linear infinite' : 'none',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.03em', flex: 1 }}>
            {title}
          </span>
          {isRunning && <SpinnerSmall />}

          {/* Delete button */}
          {(selected || hovered) && nodeId && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                data.onDelete?.(nodeId);
              }}
              style={{
                width: 20, height: 20, borderRadius: 6,
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444',
                fontSize: 11, fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                lineHeight: 1,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
            >
              x
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '12px 14px' }}>{children}</div>

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
                    width: 10, height: 10,
                    border: '2px solid rgba(15,5,30,0.95)',
                    top: handleTopOffset(inputHandles.length, i),
                    left: -5,
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: handleTopOffset(inputHandles.length, i),
                    transform: 'translateX(12px) translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 10,
                    color: '#b9b4d0',
                    fontWeight: 500,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ fontSize: 11 }}>{h.icon}</span>
                  <span>{h.label}</span>
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
                  width: 10, height: 10,
                  border: '2px solid rgba(15,5,30,0.95)',
                  top: -5,
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
                    width: 10, height: 10,
                    border: '2px solid rgba(15,5,30,0.95)',
                    top: handleTopOffset(outputHandles.length, i),
                    right: -5,
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: handleTopOffset(outputHandles.length, i),
                    transform: 'translateX(-12px) translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 10,
                    color: '#b9b4d0',
                    fontWeight: 500,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    flexDirection: 'row-reverse',
                  }}
                >
                  <span style={{ fontSize: 11 }}>{h.icon}</span>
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
                  width: 10, height: 10,
                  border: '2px solid rgba(15,5,30,0.95)',
                  bottom: -5,
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
  padding: '7px 10px',
  borderRadius: 10,
  border: '1px solid rgba(176,38,255,0.2)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const selectBase = {
  ...inputBase,
  appearance: 'none',
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23b9b4d0' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: 30,
};

const labelBase = {
  display: 'block',
  fontSize: 11,
  fontWeight: 500,
  color: '#b9b4d0',
  marginBottom: 4,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};

const btnBase = {
  width: '100%',
  padding: '8px 14px',
  borderRadius: 10,
  border: 'none',
  background: '#b026ff',
  color: '#fff',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.2s, opacity 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
};

export { inputBase, selectBase, labelBase, btnBase };
