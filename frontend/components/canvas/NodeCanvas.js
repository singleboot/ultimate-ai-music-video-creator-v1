'use client';

import React, { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useWorkflowStore from '../../store/workflowStore';

import { GenreNode, LanguageNode, ThemeNode, BPMNode, DurationNode, AudioFileNode, LyricsInputNode } from '../nodes/inputNodes';
import { LyricsGeneratorNode, MusicGeneratorNode, CoverGeneratorNode, TTSGeneratorNode, PromptCreatorNode, VideoGeneratorNode, ImageGeneratorNode } from '../nodes/processingNodes';
import { AudioPlayerNode, VideoPlayerNode, ImagePreviewNode, TextPreviewNode } from '../nodes/outputNodes';

const nodeTypes = {
  GenreNode,
  LanguageNode,
  ThemeNode,
  BPMNode,
  DurationNode,
  AudioFileNode,
  LyricsInputNode,
  LyricsGeneratorNode,
  MusicGeneratorNode,
  CoverGeneratorNode,
  TTSGeneratorNode,
  PromptCreatorNode,
  VideoGeneratorNode,
  ImageGeneratorNode,
  AudioPlayerNode,
  VideoPlayerNode,
  ImagePreviewNode,
  TextPreviewNode,
};

const NODE_LABELS = {
  GenreNode: 'Genre', LanguageNode: 'Language', ThemeNode: 'Theme',
  BPMNode: 'BPM', DurationNode: 'Duration', AudioFileNode: 'Audio File',
  LyricsInputNode: 'Lyrics Input',
  LyricsGeneratorNode: 'Lyrics Generator', MusicGeneratorNode: 'Music Generator',
  CoverGeneratorNode: 'Cover Generator', TTSGeneratorNode: 'TTS Voiceover',
  PromptCreatorNode: 'Prompt Creator', VideoGeneratorNode: 'Video Generator',
  ImageGeneratorNode: 'Image Generator',
  AudioPlayerNode: 'Audio Player', VideoPlayerNode: 'Video Player',
  ImagePreviewNode: 'Image Preview', TextPreviewNode: 'Text Preview',
};

// Maps (nodeType → handleId → dataKey)
const HANDLE_KEY = {
  GenreNode: { 'output-0': 'genre' },
  LanguageNode: { 'output-0': 'language' },
  ThemeNode: { 'output-0': 'theme' },
  BPMNode: { 'output-0': 'bpm' },
  DurationNode: { 'output-0': 'duration' },
  AudioFileNode: { 'output-0': 'audio', 'output-1': 'file' },
  LyricsInputNode: { 'output-0': 'lyrics' },
  LyricsGeneratorNode: { 'input-0': 'theme', 'input-1': 'genre', 'output-0': 'lyrics' },
  MusicGeneratorNode: { 'input-0': 'lyrics', 'input-1': 'settings', 'output-0': 'audio' },
  CoverGeneratorNode: { 'input-0': 'audio', 'input-1': 'genre', 'input-2': 'bpm', 'output-0': 'audio' },
  TTSGeneratorNode: { 'input-0': 'text', 'input-1': 'language', 'input-2': 'voice', 'output-0': 'audio' },
  PromptCreatorNode: { 'input-0': 'lyrics', 'input-1': 'theme', 'input-2': 'story', 'output-0': 'prompts' },
  VideoGeneratorNode: { 'input-0': 'prompts', 'input-1': 'image', 'output-0': 'video' },
  ImageGeneratorNode: { 'input-0': 'prompts', 'input-1': 'params', 'output-0': 'image' },
  AudioPlayerNode: { 'input-0': 'audio' },
  VideoPlayerNode: { 'input-0': 'video' },
  ImagePreviewNode: { 'input-0': 'image' },
  TextPreviewNode: { 'input-0': 'text/lyrics' },
};

// Output dataKey → compatible target suggestions
const SUGGESTIONS = {
  genre: [
    { type: 'LyricsGeneratorNode', handle: 'input-1', label: 'Lyrics Generator' },
    { type: 'CoverGeneratorNode', handle: 'input-1', label: 'Cover Generator' },
    { type: 'MusicGeneratorNode', handle: 'input-1', label: 'Music Generator' },
  ],
  language: [
    { type: 'TTSGeneratorNode', handle: 'input-1', label: 'TTS Voiceover' },
  ],
  theme: [
    { type: 'LyricsGeneratorNode', handle: 'input-0', label: 'Lyrics Generator' },
    { type: 'PromptCreatorNode', handle: 'input-1', label: 'Prompt Creator' },
  ],
  bpm: [
    { type: 'CoverGeneratorNode', handle: 'input-2', label: 'Cover Generator' },
    { type: 'MusicGeneratorNode', handle: 'input-1', label: 'Music Generator' },
  ],
  duration: [],
  audio: [
    { type: 'CoverGeneratorNode', handle: 'input-0', label: 'Cover Generator' },
    { type: 'AudioPlayerNode', handle: 'input-0', label: 'Audio Player' },
  ],
  file: [],
  lyrics: [
    { type: 'MusicGeneratorNode', handle: 'input-0', label: 'Music Generator' },
    { type: 'PromptCreatorNode', handle: 'input-0', label: 'Prompt Creator' },
  ],
  text: [
    { type: 'TTSGeneratorNode', handle: 'input-0', label: 'TTS Voiceover' },
  ],
  prompts: [
    { type: 'VideoGeneratorNode', handle: 'input-0', label: 'Video Generator' },
    { type: 'ImageGeneratorNode', handle: 'input-0', label: 'Image Generator' },
  ],
  video: [
    { type: 'VideoPlayerNode', handle: 'input-0', label: 'Video Player' },
  ],
  image: [
    { type: 'ImagePreviewNode', handle: 'input-0', label: 'Image Preview' },
    { type: 'VideoGeneratorNode', handle: 'input-1', label: 'Video (I2V)' },
  ],
  'text/lyrics': [
    { type: 'TextPreviewNode', handle: 'input-0', label: 'Text Preview' },
  ],
};

// Input dataKey → compatible source suggestions (reverse)
const INPUT_SUGGESTIONS = {
  theme: [
    { type: 'ThemeNode', handle: 'output-0', label: 'Theme' },
    { type: 'LyricsGeneratorNode', handle: 'output-0', label: 'Lyrics Generator' },
  ],
  genre: [
    { type: 'GenreNode', handle: 'output-0', label: 'Genre' },
  ],
  language: [
    { type: 'LanguageNode', handle: 'output-0', label: 'Language' },
  ],
  bpm: [
    { type: 'BPMNode', handle: 'output-0', label: 'BPM' },
  ],
  audio: [
    { type: 'AudioFileNode', handle: 'output-0', label: 'Audio File' },
    { type: 'MusicGeneratorNode', handle: 'output-0', label: 'Music Generator' },
    { type: 'CoverGeneratorNode', handle: 'output-0', label: 'Cover Generator' },
    { type: 'TTSGeneratorNode', handle: 'output-0', label: 'TTS Voiceover' },
  ],
  lyrics: [
    { type: 'LyricsInputNode', handle: 'output-0', label: 'Lyrics Input' },
    { type: 'LyricsGeneratorNode', handle: 'output-0', label: 'Lyrics Generator' },
  ],
  text: [
    { type: 'LyricsInputNode', handle: 'output-0', label: 'Lyrics Input' },
  ],
  prompts: [
    { type: 'PromptCreatorNode', handle: 'output-0', label: 'Prompt Creator' },
  ],
  video: [
    { type: 'VideoGeneratorNode', handle: 'output-0', label: 'Video Generator' },
  ],
  image: [
    { type: 'ImageGeneratorNode', handle: 'output-0', label: 'Image Generator' },
  ],
  story: [
    { type: 'ThemeNode', handle: 'output-0', label: 'Theme' },
  ],
  voice: [],
};

let nodeIdCounter = 0;
function getNodeId() {
  nodeIdCounter += 1;
  return `node_${Date.now()}_${nodeIdCounter}`;
}

export default function NodeCanvas() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const addNode = useWorkflowStore((s) => s.addNode);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const setSelectedNode = useWorkflowStore((s) => s.setSelectedNode);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const reactFlowWrapper = useRef(null);

  const [suggestions, setSuggestions] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [connectMenu, setConnectMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const mouseRef = useRef({ x: 0, y: 0 });
  const connectStartRef = useRef(null);
  const edgeCountRef = useRef(0);

  // Track edge count to detect if a connection was actually made
  useEffect(() => {
    edgeCountRef.current = edges.length;
  }, [edges]);

  const onUpdate = useCallback((nodeId, data) => updateNodeData(nodeId, data), [updateNodeData]);
  const onDelete = useCallback((nodeId) => removeNode(nodeId), [removeNode]);

  const enrichedNodes = useMemo(() => {
    return nodes.map((n) => ({ ...n, data: { ...n.data, onUpdate, onDelete } }));
  }, [nodes, onUpdate, onDelete]);

  const onNodeClick = useCallback((_event, node) => setSelectedNode(node.id), [setSelectedNode]);
  const onPaneClick = useCallback(() => setSelectedNode(null), [setSelectedNode]);

  // Keyboard delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        removeNode(selectedNodeId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, removeNode]);

  // Track mouse for suggestion panel position
  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const onConnectStart = useCallback((_event, { nodeId, handleId, handleType }) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const keys = HANDLE_KEY[node.type];
    if (!keys) return;
    const dataKey = keys[handleId];
    if (!dataKey) return;

    connectStartRef.current = { nodeId, handleId, handleType, dataKey, nodeType: node.type };
    edgeCountRef.current = edges.length;

    // Show quick suggestions while dragging
    if (handleType === 'source') {
      const list = SUGGESTIONS[dataKey];
      if (list && list.length > 0) {
        setSuggestions({ items: list, sourceNodeId: nodeId, sourceHandle: handleId, type: 'output', dataKey });
      }
    } else {
      const list = INPUT_SUGGESTIONS[dataKey];
      if (list && list.length > 0) {
        setSuggestions({ items: list, targetNodeId: nodeId, targetHandle: handleId, type: 'input', dataKey });
      }
    }
  }, [nodes, edges.length]);

  const onConnectEnd = useCallback(() => {
    setSuggestions(null);

    // If no edge was added (connection released in empty space), open the persistent menu
    const store = useWorkflowStore.getState();
    const info = connectStartRef.current;
    if (!info) return;

    // Check if a new edge appeared after this drag ended
    setTimeout(() => {
      const currentEdges = useWorkflowStore.getState().edges.length;
      if (currentEdges > edgeCountRef.current) return; // connection was made
      if (!connectStartRef.current) return;

      // Open persistent connect menu
      const items = info.handleType === 'source'
        ? (SUGGESTIONS[info.dataKey] || [])
        : (INPUT_SUGGESTIONS[info.dataKey] || []);

      if (items.length === 0) return;

      setConnectMenu({
        items,
        sourceNodeId: info.handleType === 'source' ? info.nodeId : null,
        sourceHandle: info.handleType === 'source' ? info.handleId : null,
        targetNodeId: info.handleType === 'target' ? info.nodeId : null,
        targetHandle: info.handleType === 'target' ? info.handleId : null,
        type: info.handleType,
        dataKey: info.dataKey,
      });
      setSearchQuery('');
    }, 50);
  }, []);

  const handleMenuSuggestionClick = useCallback((item) => {
    if (!connectMenu) return;

    const id = getNodeId();
    const newNode = {
      id,
      type: item.type,
      position: { x: mouseRef.current.x - 280 - 140, y: mouseRef.current.y - 56 - 40 },
      data: {},
    };
    addNode(newNode);

    if (connectMenu.type === 'source') {
      const edge = {
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        source: connectMenu.sourceNodeId,
        sourceHandle: connectMenu.sourceHandle,
        target: id,
        targetHandle: item.handle,
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      };
      useWorkflowStore.getState().onEdgesChange([{ type: 'add', item: edge }]);
    } else {
      const edge = {
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        source: id,
        sourceHandle: item.handle,
        target: connectMenu.targetNodeId,
        targetHandle: connectMenu.targetHandle,
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      };
      useWorkflowStore.getState().onEdgesChange([{ type: 'add', item: edge }]);
    }

    setConnectMenu(null);
    connectStartRef.current = null;
  }, [connectMenu, addNode]);

  const onConnect = useCallback((connection) => {
    useWorkflowStore.getState().onEdgesChange([{
      type: 'add',
      item: {
        ...connection,
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      },
    }]);
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const nodeType = event.dataTransfer.getData('application/reactflow');
    if (!nodeType) return;
    addNode({ id: getNodeId(), type: nodeType, position: { x: event.clientX - 280, y: event.clientY - 56 }, data: {} });
  }, [addNode]);

  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%', background: '#05010d', position: 'relative' }}>
      <ReactFlow
        nodes={enrichedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ style: { stroke: '#b026ff', strokeWidth: 2 }, type: 'smoothstep' }}
        style={{ background: '#05010d' }}
        deleteKeyCode={null}
      >
        <Background color="rgba(176,38,255,0.15)" gap={24} size={1} />
        <Controls style={{ borderRadius: 12, border: '1px solid rgba(176,38,255,0.3)', overflow: 'hidden', background: 'rgba(15,5,30,0.95)' }} />
        <MiniMap style={{ height: 120, width: 180, borderRadius: 12, border: '1px solid rgba(176,38,255,0.3)', background: 'rgba(15,5,30,0.9)' }} nodeColor="#b026ff" maskColor="rgba(5,1,13,0.8)" />
      </ReactFlow>

      {/* Suggestion overlay during drag */}
      {suggestions && (
        <div
          style={{
            position: 'fixed',
            left: mouseRef.current.x + 16,
            top: mouseRef.current.y - 10,
            zIndex: 1000,
            background: 'rgba(15,5,30,0.98)',
            border: '1px solid rgba(176,38,255,0.4)',
            borderRadius: 12,
            padding: 6,
            minWidth: 200,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ padding: '6px 10px 4px', fontSize: 10, fontWeight: 700, color: '#6b6880', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {suggestions.type === 'output' ? 'Release to add...' : 'Release to add...'}
          </div>
          {suggestions.items.slice(0, 4).map((item, i) => (
            <div key={`${item.type}-${i}`} style={{ padding: '7px 10px', fontSize: 11, color: '#b9b4d0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: suggestions.type === 'output' ? '#b026ff' : '#63d4ff', display: 'inline-block' }} />
              {item.label}
            </div>
          ))}
          {suggestions.items.length > 4 && (
            <div style={{ padding: '4px 10px', fontSize: 10, color: '#6b6880' }}>
              +{suggestions.items.length - 4} more
            </div>
          )}
        </div>
      )}

      {/* Persistent connect menu */}
      {connectMenu && (
        <React.Fragment>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => { setConnectMenu(null); connectStartRef.current = null; }}
          />
          <div
          style={{
            position: 'fixed',
            left: mouseRef.current.x - 140,
            top: mouseRef.current.y - 20,
            zIndex: 1000,
            background: 'rgba(10,3,20,0.98)',
            border: '1px solid rgba(176,38,255,0.3)',
            borderRadius: 16,
            padding: 8,
            minWidth: 280,
            maxWidth: 320,
            backdropFilter: 'blur(24px)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '4px 10px 8px', fontSize: 11, fontWeight: 700, color: '#b026ff' }}>
            {connectMenu.type === 'source' ? 'Add node to receive' : 'Add node that provides'} <span style={{ color: '#b9b4d0', textTransform: 'lowercase' }}>{connectMenu.dataKey}</span>
          </div>
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter nodes..."
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setConnectMenu(null); connectStartRef.current = null; }
            }}
            style={{
              width: '100%', padding: '8px 10px', marginBottom: 6, boxSizing: 'border-box',
              borderRadius: 8, border: '1px solid rgba(176,38,255,0.2)',
              background: 'rgba(176,38,255,0.06)',
              color: '#fff', fontSize: 12, outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {(searchQuery
              ? connectMenu.items.filter((item) =>
                  item.label.toLowerCase().includes(searchQuery.toLowerCase())
                )
              : connectMenu.items
            ).length === 0 ? (
              <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 11, color: '#6b6880' }}>
                No compatible nodes found
              </div>
            ) : (
              (searchQuery
                ? connectMenu.items.filter((item) =>
                    item.label.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : connectMenu.items
              ).map((item, i) => (
                <div
                  key={`${item.type}-${i}`}
                  onClick={() => handleMenuSuggestionClick(item)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(176,38,255,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: connectMenu.type === 'source' ? '#b026ff' : '#63d4ff',
                    flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: '#6b6880', marginTop: 1 }}>
                      {item.type.replace('Node', '').replace(/([A-Z])/g, ' $1').trim() || 'node'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ borderTop: '1px solid rgba(176,38,255,0.1)', marginTop: 4, padding: '6px 10px 2px', fontSize: 10, color: '#6b6880', display: 'flex', justifyContent: 'space-between' }}>
            <span>Click to add & connect</span>
            <span>Esc to cancel</span>
          </div>
        </div>
        </React.Fragment>
      )}

      {/* Floating + button */}
      <div
        onClick={() => setShowQuickAdd(!showQuickAdd)}
        style={{
          position: 'absolute',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #b026ff, #7c3aed)',
          border: 'none',
          color: '#fff',
          fontSize: 24,
          fontWeight: 300,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px rgba(176,38,255,0.4)',
          transition: 'transform 0.2s',
          transform: showQuickAdd ? 'translateX(-50%) rotate(45deg)' : 'translateX(-50%)',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = showQuickAdd ? 'translateX(-50%) rotate(45deg) scale(1.1)' : 'translateX(-50%) scale(1.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = showQuickAdd ? 'translateX(-50%) rotate(45deg)' : 'translateX(-50%)'; }}
      >
        +
      </div>

      {/* Quick-add menu */}
      {showQuickAdd && (
        <div
          style={{
            position: 'absolute',
            bottom: 158,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: 'rgba(15,5,30,0.98)',
            border: '1px solid rgba(176,38,255,0.3)',
            borderRadius: 16,
            padding: 8,
            minWidth: 260,
            maxHeight: 360,
            overflowY: 'auto',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
          }}
        >
          {QUICK_ADD_SECTIONS.map((section) => (
            <div key={section.title} style={{ marginBottom: 4 }}>
              <div style={{ padding: '6px 10px 4px', fontSize: 10, fontWeight: 700, color: '#6b6880', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {section.title}
              </div>
              {section.nodes.map((n) => (
                <div
                  key={n.type}
                  onClick={() => {
                    addNode({ id: getNodeId(), type: n.type, position: centerPos(nodes.length), data: {} });
                    setShowQuickAdd(false);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${n.color}15`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: `${n.color}20`, border: `1px solid ${n.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                  }}>
                    {n.icon}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{n.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const QUICK_ADD_SECTIONS = [
  {
    title: 'INPUTS',
    nodes: [
      { type: 'ThemeNode', label: 'Theme', icon: '\uD83C\uDFAD', color: '#ff3bd4' },
      { type: 'GenreNode', label: 'Genre', icon: '\uD83C\uDFB6', color: '#b026ff' },
      { type: 'LanguageNode', label: 'Language', icon: '\uD83C\uDF10', color: '#63d4ff' },
      { type: 'BPMNode', label: 'BPM', icon: '\u2699\uFE0F', color: '#f59e0b' },
      { type: 'DurationNode', label: 'Duration', icon: '\u23F1\uFE0F', color: '#22c55e' },
      { type: 'AudioFileNode', label: 'Audio File', icon: '\uD83C\uDFB5', color: '#ec4899' },
      { type: 'LyricsInputNode', label: 'Lyrics', icon: '\uD83D\uDCDD', color: '#a855f7' },
    ],
  },
  {
    title: 'PROCESSING',
    nodes: [
      { type: 'LyricsGeneratorNode', label: 'Lyrics Generator', icon: '\u270D\uFE0F', color: '#a855f7' },
      { type: 'MusicGeneratorNode', label: 'Music Generator', icon: '\uD83C\uDFB5', color: '#b026ff' },
      { type: 'CoverGeneratorNode', label: 'Cover Generator', icon: '\uD83C\uDFA4', color: '#ec4899' },
      { type: 'TTSGeneratorNode', label: 'TTS Generator', icon: '\uD83D\uDDE3\uFE0F', color: '#06b6d4' },
      { type: 'PromptCreatorNode', label: 'Prompt Creator', icon: '\u2728', color: '#f59e0b' },
      { type: 'VideoGeneratorNode', label: 'Video Generator', icon: '\uD83C\uDFAC', color: '#6366f1' },
      { type: 'ImageGeneratorNode', label: 'Image Generator', icon: '\uD83D\uDDBC\uFE0F', color: '#14b8a6' },
    ],
  },
  {
    title: 'OUTPUTS',
    nodes: [
      { type: 'AudioPlayerNode', label: 'Audio Player', icon: '\u25B6\uFE0F', color: '#b026ff' },
      { type: 'VideoPlayerNode', label: 'Video Player', icon: '\uD83C\uDFAC', color: '#6366f1' },
      { type: 'ImagePreviewNode', label: 'Image Preview', icon: '\uD83D\uDDBC\uFE0F', color: '#14b8a6' },
      { type: 'TextPreviewNode', label: 'Text Preview', icon: '\uD83D\uDCC4', color: '#b9b4d0' },
    ],
  },
];

function centerPos(count) {
  const x = 300 + Math.random() * 200;
  const y = 60 + count * 40 + Math.random() * 100;
  return { x, y };
}
