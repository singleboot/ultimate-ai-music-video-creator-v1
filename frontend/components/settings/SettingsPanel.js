'use client';

import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://127.0.0.1:8000';

const CATEGORIES = [
  { id: 'all', label: 'All Workflows', icon: '📋' },
  { id: 'text-to-audio', label: 'Text to Audio', icon: '🎵' },
  { id: 'cover-audio', label: 'Cover Audio', icon: '🎤' },
  { id: 'image', label: 'Image', icon: '🖼️' },
  { id: 'image-to-image', label: 'Image to Image', icon: '🔄' },
  { id: 'image-to-video', label: 'Image to Video', icon: '🎬' },
  { id: 'text-to-video', label: 'Text to Video', icon: '📹' },
];

const TABS = [
  { id: 'workflows', label: 'Workflows', icon: '⚙️' },
  { id: 'nodes', label: 'Node Settings', icon: '🔧' },
  { id: 'comfyui', label: 'ComfyUI', icon: '🎨' },
];

export default function SettingsPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState('workflows');
  const [activeCategory, setActiveCategory] = useState('all');
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API}/api/workflows`);
      const data = await r.json();
      setWorkflows(data.workflows || []);
    } catch {
      setMsg('Backend not reachable');
    } finally {
      setLoading(false);
    }
  };

  const reload = async () => {
    try {
      const r = await fetch(`${API}/api/workflows/reload`, { method: 'POST' });
      const data = await r.json();
      setWorkflows(data.workflows || []);
      setMsg(`Reloaded ${data.count || 0} workflows`);
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Reload failed');
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.json'));
    if (files.length === 0) {
      setMsg('Please drop .json workflow files');
      return;
    }

    setUploading(true);
    let successCount = 0;
    
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', activeCategory === 'all' ? 'uncategorized' : activeCategory);
        
        const r = await fetch(`${API}/api/workflows/upload`, {
          method: 'POST',
          body: formData,
        });
        
        if (r.ok) {
          successCount++;
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    
    setUploading(false);
    setMsg(`Uploaded ${successCount} workflow(s)`);
    setTimeout(() => setMsg(''), 3000);
    fetchWorkflows();
  }, [activeCategory]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files).filter(f => f.name.endsWith('.json'));
    if (files.length === 0) return;

    setUploading(true);
    let successCount = 0;
    
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', activeCategory === 'all' ? 'uncategorized' : activeCategory);
        
        const r = await fetch(`${API}/api/workflows/upload`, {
          method: 'POST',
          body: formData,
        });
        
        if (r.ok) {
          successCount++;
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    
    setUploading(false);
    setMsg(`Uploaded ${successCount} workflow(s)`);
    setTimeout(() => setMsg(''), 3000);
    fetchWorkflows();
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const filteredWorkflows = activeCategory === 'all' 
    ? workflows 
    : workflows.filter(w => w.category === activeCategory);

  const groupedWorkflows = filteredWorkflows.reduce((acc, wf) => {
    const cat = wf.category || 'uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(wf);
    return acc;
  }, {});

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.tabs}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              <span style={styles.tabIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'workflows' && (
          <div style={styles.content}>
            <div style={styles.categories}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  style={{
                    ...styles.category,
                    ...(activeCategory === cat.id ? styles.categoryActive : {}),
                  }}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <span style={styles.categoryIcon}>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            <div
              style={{
                ...styles.dropZone,
                ...(dragActive ? styles.dropZoneActive : {}),
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div style={styles.dropZoneContent}>
                <div style={styles.dropZoneIcon}>📁</div>
                <div style={styles.dropZoneText}>
                  {uploading ? 'Uploading...' : 'Drag & drop workflow files here'}
                </div>
                <div style={styles.dropZoneSubtext}>or</div>
                <label style={styles.fileBtn}>
                  Browse Files
                  <input
                    type="file"
                    accept=".json"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            {msg && (
              <div style={styles.msg}>{msg}</div>
            )}

            <div style={styles.workflowHeader}>
              <h3 style={styles.workflowTitle}>
                {CATEGORIES.find(c => c.id === activeCategory)?.label || 'All Workflows'}
              </h3>
              <div style={styles.workflowActions}>
                <button style={styles.actionBtn} onClick={fetchWorkflows}>
                  🔄 Refresh
                </button>
                <button style={styles.actionBtnPrimary} onClick={reload}>
                  📥 Reload from Disk
                </button>
              </div>
            </div>

            {loading ? (
              <div style={styles.loading}>Loading workflows...</div>
            ) : (
              <div style={styles.workflowList}>
                {Object.entries(groupedWorkflows).map(([category, workflowsInCat]) => (
                  <div key={category} style={styles.categoryGroup}>
                    <div style={styles.categoryHeader}>
                      <span style={styles.categoryIcon}>
                        {CATEGORIES.find(c => c.id === category)?.icon || '📋'}
                      </span>
                      <span style={styles.categoryLabel}>
                        {CATEGORIES.find(c => c.id === category)?.label || category}
                      </span>
                      <span style={styles.categoryCount}>
                        {workflowsInCat.length} workflow{workflowsInCat.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {workflowsInCat.map((wf) => (
                      <div key={wf.name} style={styles.workflowCard}>
                        <div style={styles.workflowInfo}>
                          <div style={styles.workflowName}>
                            {wf.display_name || wf.name}
                            {wf.default && <span style={styles.defaultBadge}>DEFAULT</span>}
                          </div>
                          {wf.description && (
                            <div style={styles.workflowDescription}>{wf.description}</div>
                          )}
                          <div style={styles.workflowMeta}>
                            {wf.filename} • {wf.node_count} nodes • v{wf.version}
                          </div>
                        </div>
                        <div style={styles.workflowActions}>
                          <div style={{
                            ...styles.workflowStatus,
                            color: wf.node_count > 0 ? '#22c55e' : '#ef4444',
                          }}>
                            {wf.node_count > 0 ? 'LOADED' : 'EMPTY'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {filteredWorkflows.length === 0 && (
                  <div style={styles.empty}>No workflows in this category</div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'nodes' && (
          <div style={styles.content}>
            <div style={styles.placeholder}>
              <div style={styles.placeholderIcon}>🔧</div>
              <div style={styles.placeholderTitle}>Node Settings</div>
              <div style={styles.placeholderText}>
                Configure default settings for each node type. Select a node on the canvas to edit its specific settings.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'comfyui' && (
          <div style={styles.content}>
            <div style={styles.comfyuiSection}>
              <h3 style={styles.sectionTitle}>ComfyUI Connection</h3>
              <div style={styles.settingRow}>
                <label style={styles.settingLabel}>API URL</label>
                <input
                  type="text"
                  defaultValue="http://127.0.0.1:8188"
                  style={styles.settingInput}
                />
              </div>
              <div style={styles.settingRow}>
                <label style={styles.settingLabel}>Status</label>
                <div style={styles.statusIndicator}>
                  <div style={styles.statusDot} />
                  <span>Connected</span>
                </div>
              </div>
            </div>

            <div style={styles.comfyuiSection}>
              <h3 style={styles.sectionTitle}>Workflow Management</h3>
              <div style={styles.settingRow}>
                <label style={styles.settingLabel}>Workflows Directory</label>
                <code style={styles.code}>workflows/</code>
              </div>
              <div style={styles.settingRow}>
                <label style={styles.settingLabel}>Auto-reload on changes</label>
                <input type="checkbox" defaultChecked style={styles.checkbox} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(5,1,13,0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  panel: {
    width: '90%',
    maxWidth: 900,
    maxHeight: '85vh',
    background: '#0f0520',
    border: '1px solid rgba(176,38,255,0.3)',
    borderRadius: 16,
    boxShadow: '0 0 60px rgba(176,38,255,0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(176,38,255,0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#fff',
    margin: 0,
  },
  closeBtn: {
    background: 'rgba(176,38,255,0.1)',
    border: '1px solid rgba(176,38,255,0.3)',
    borderRadius: 8,
    width: 32,
    height: 32,
    color: '#b026ff',
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    display: 'flex',
    gap: 8,
    padding: '16px 24px',
    borderBottom: '1px solid rgba(176,38,255,0.15)',
  },
  tab: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(176,38,255,0.15)',
    borderRadius: 8,
    color: '#6b6880',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'rgba(176,38,255,0.15)',
    borderColor: 'rgba(176,38,255,0.4)',
    color: '#b026ff',
  },
  tabIcon: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: 24,
  },
  categories: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  category: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(176,38,255,0.15)',
    borderRadius: 6,
    color: '#6b6880',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    transition: 'all 0.2s',
  },
  categoryActive: {
    background: 'rgba(176,38,255,0.15)',
    borderColor: 'rgba(176,38,255,0.4)',
    color: '#b026ff',
  },
  categoryIcon: {
    fontSize: 12,
  },
  dropZone: {
    border: '2px dashed rgba(176,38,255,0.3)',
    borderRadius: 12,
    padding: 32,
    marginBottom: 20,
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  dropZoneActive: {
    borderColor: '#b026ff',
    background: 'rgba(176,38,255,0.05)',
  },
  dropZoneContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  dropZoneIcon: {
    fontSize: 40,
    opacity: 0.5,
  },
  dropZoneText: {
    fontSize: 14,
    color: '#b9b4d0',
    fontWeight: 600,
  },
  dropZoneSubtext: {
    fontSize: 11,
    color: '#6b6880',
  },
  fileBtn: {
    padding: '8px 16px',
    background: 'rgba(176,38,255,0.2)',
    border: '1px solid rgba(176,38,255,0.4)',
    borderRadius: 8,
    color: '#b026ff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
  msg: {
    padding: '10px 14px',
    background: 'rgba(176,38,255,0.1)',
    border: '1px solid rgba(176,38,255,0.3)',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 12,
    color: '#b9b4d0',
  },
  workflowHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  workflowTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    margin: 0,
  },
  workflowActions: {
    display: 'flex',
    gap: 8,
  },
  actionBtn: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(176,38,255,0.2)',
    borderRadius: 6,
    color: '#b9b4d0',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  actionBtnPrimary: {
    padding: '6px 12px',
    background: 'rgba(176,38,255,0.2)',
    border: '1px solid rgba(176,38,255,0.4)',
    borderRadius: 6,
    color: '#b026ff',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  loading: {
    padding: 20,
    textAlign: 'center',
    color: '#6b6880',
    fontSize: 13,
  },
  workflowList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  categoryGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'rgba(176,38,255,0.08)',
    borderRadius: 8,
    border: '1px solid rgba(176,38,255,0.2)',
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: '#b026ff',
    flex: 1,
  },
  categoryCount: {
    fontSize: 11,
    color: '#6b6880',
    fontWeight: 600,
  },
  workflowCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: 'rgba(15,5,30,0.6)',
    border: '1px solid rgba(176,38,255,0.15)',
    borderRadius: 8,
    marginLeft: 16,
  },
  workflowInfo: {
    flex: 1,
  },
  workflowName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    marginBottom: 2,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  defaultBadge: {
    padding: '2px 6px',
    background: 'rgba(34,197,94,0.2)',
    border: '1px solid rgba(34,197,94,0.4)',
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 700,
    color: '#22c55e',
    letterSpacing: '0.05em',
  },
  workflowDescription: {
    fontSize: 11,
    color: '#9b94b8',
    marginBottom: 4,
    lineHeight: 1.4,
  },
  workflowMeta: {
    fontSize: 10,
    color: '#6b6880',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  workflowCategory: {
    padding: '2px 6px',
    background: 'rgba(176,38,255,0.1)',
    borderRadius: 4,
    fontSize: 9,
    color: '#b026ff',
  },
  workflowActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  workflowStatus: {
    fontSize: 10,
    fontWeight: 700,
  },
  empty: {
    padding: 20,
    textAlign: 'center',
    color: '#6b6880',
    fontSize: 13,
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    textAlign: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 13,
    color: '#6b6880',
    maxWidth: 400,
  },
  comfyuiSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#b026ff',
    marginBottom: 16,
    marginTop: 0,
  },
  settingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid rgba(176,38,255,0.1)',
  },
  settingLabel: {
    fontSize: 13,
    color: '#b9b4d0',
    fontWeight: 600,
  },
  settingInput: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(176,38,255,0.2)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 12,
    width: 200,
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: '#22c55e',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 8px #22c55e',
  },
  code: {
    padding: '4px 8px',
    background: 'rgba(176,38,255,0.1)',
    border: '1px solid rgba(176,38,255,0.2)',
    borderRadius: 4,
    color: '#b026ff',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  checkbox: {
    width: 18,
    height: 18,
    cursor: 'pointer',
  },
};
