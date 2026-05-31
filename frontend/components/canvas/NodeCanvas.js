'use client';

import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
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

const minimapStyle = {
  height: 120,
  width: 180,
  borderRadius: 12,
  border: '1px solid rgba(176,38,255,0.3)',
  background: 'rgba(15,5,30,0.9)',
};

export default function NodeCanvas() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const addNode = useWorkflowStore((s) => s.addNode);
  const setSelectedNode = useWorkflowStore((s) => s.setSelectedNode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState(edges);

  const reactFlowWrapper = useRef(null);

  const onNodeClick = useCallback(
    (_event, node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onUpdate = useCallback(
    (nodeId, data) => {
      updateNodeData(nodeId, data);
      setFlowNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
        )
      );
    },
    [updateNodeData, setFlowNodes]
  );

  const onConnect = useCallback(
    (connection) => {
      const newEdge = {
        ...connection,
        id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'smoothstep',
        style: { stroke: '#b026ff', strokeWidth: 2 },
      };
      setFlowEdges((eds) => addEdge(newEdge, eds));
      const store = useWorkflowStore.getState();
      store.onEdgesChange([{ type: 'add', item: newEdge }]);
    },
    [setFlowEdges]
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
        data: { onUpdate },
      };

      addNode(newNode);
      setFlowNodes((nds) => [...nds, newNode]);
    },
    [addNode, setFlowNodes, onUpdate]
  );

  React.useEffect(() => {
    setFlowNodes(
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, onUpdate },
      }))
    );
  }, [nodes.length, setFlowNodes]);

  React.useEffect(() => {
    setFlowEdges(edges);
  }, [edges, setFlowEdges]);

  const combinedOnNodesChange = useCallback(
    (changes) => {
      onFlowNodesChange(changes);
      onNodesChange(changes);
    },
    [onFlowNodesChange, onNodesChange]
  );

  const combinedOnEdgesChange = useCallback(
    (changes) => {
      onFlowEdgesChange(changes);
      onEdgesChange(changes);
    },
    [onFlowEdgesChange, onEdgesChange]
  );

  return (
    <div
      ref={reactFlowWrapper}
      style={{ width: '100%', height: '100%', background: '#05010d' }}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={combinedOnNodesChange}
        onEdgesChange={combinedOnEdgesChange}
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
        <MiniMap style={minimapStyle} nodeColor="#b026ff" maskColor="rgba(5,1,13,0.8)" />
      </ReactFlow>
    </div>
  );
}
