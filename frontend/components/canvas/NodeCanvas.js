'use client';

import React, { useCallback, useRef, useMemo } from 'react';
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
  const setSelectedNode = useWorkflowStore((s) => s.setSelectedNode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const reactFlowWrapper = useRef(null);

  const onUpdate = useCallback(
    (nodeId, data) => {
      updateNodeData(nodeId, data);
    },
    [updateNodeData]
  );

  const enrichedNodes = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: { ...n.data, onUpdate },
    }));
  }, [nodes, onUpdate]);

  const onNodeClick = useCallback(
    (_event, node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onConnect = useCallback(
    (connection) => {
      const store = useWorkflowStore.getState();
      store.onEdgesChange([{
        type: 'add',
        item: {
          ...connection,
          id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'smoothstep',
          style: { stroke: '#b026ff', strokeWidth: 2 },
        },
      }]);
    },
    []
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;

      const position = {
        x: event.clientX - 280,
        y: event.clientY - 56,
      };

      const newNode = {
        id: getNodeId(),
        type: nodeType,
        position,
        data: {},
      };

      addNode(newNode);
    },
    [addNode]
  );

  return (
    <div
      ref={reactFlowWrapper}
      style={{ width: '100%', height: '100%', background: '#05010d' }}
    >
      <ReactFlow
        nodes={enrichedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          style: { stroke: '#b026ff', strokeWidth: 2 },
          type: 'smoothstep',
        }}
        style={{ background: '#05010d' }}
      >
        <Background color="rgba(176,38,255,0.15)" gap={24} size={1} />
        <Controls
          style={{
            borderRadius: 12,
            border: '1px solid rgba(176,38,255,0.3)',
            overflow: 'hidden',
            background: 'rgba(15,5,30,0.95)',
          }}
        />
        <MiniMap
          style={{
            height: 120,
            width: 180,
            borderRadius: 12,
            border: '1px solid rgba(176,38,255,0.3)',
            background: 'rgba(15,5,30,0.9)',
          }}
          nodeColor="#b026ff"
          maskColor="rgba(5,1,13,0.8)"
        />
      </ReactFlow>
    </div>
  );
}
