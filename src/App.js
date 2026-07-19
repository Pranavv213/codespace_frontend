import React, { useState, useEffect, useRef } from 'react';
import { 
  FiUploadCloud, FiMessageSquare, FiDatabase, FiTrash2, 
  FiCpu, FiSend, FiHardDrive, FiCheckCircle, FiAlertCircle 
} from 'react-icons/fi';
import './App.css';

const API_BASE = 'http://localhost:8000';

function App() {
  // Application State
  const [indices, setIndices] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState('');
  const [newIndexName, setNewIndexName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  // UI Panels State
  const [showSteps, setShowSteps] = useState(false);
  
  // Loading & Processing States
  const [isUploading, setIsUploading] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // Chat History State
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  
  const chatEndRef = useRef(null);

  // Auto-scroll chat window
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatting]);

  // Fetch available indices on mount
  useEffect(() => {
    fetchIndices();
  }, []);

  const fetchIndices = async () => {
    try {
      const res = await fetch(`${API_BASE}/indices`);
      const data = await res.json();
      setIndices(data.indices || []);
      if (data.indices?.length > 0 && !selectedIndex) {
        setSelectedIndex(data.indices[0]);
      }
    } catch (err) {
      showStatus('Failed to connect to backend API', 'error');
    }
  };

  const showStatus = (text, type) => {
    setStatusMessage({ text, type });
    if (type !== 'loading') {
      setTimeout(() => setStatusMessage({ text: '', type: '' }), 6000);
    }
  };

  // Handle Zip Upload Pipeline
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !newIndexName.trim()) {
      showStatus('Please provide both a ZIP file and a unique Index Name.', 'error');
      return;
    }

    setIsUploading(true);
    showStatus('Processing architecture metrics and storing vectors...', 'loading');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('index_name', newIndexName);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        showStatus(`Success: ${data.message} (${data.files_processed} files processed)`, 'success');
        setNewIndexName('');
        setSelectedFile(null);
        fetchIndices();
        setSelectedIndex(data.index_name);
      } else {
        showStatus(data.detail || data.message || 'Ingestion failed.', 'error');
      }
    } catch (err) {
      showStatus('Network failure during ingestion process.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle RAG Chat Pipeline
  const handleChat = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;
    if (!selectedIndex) {
      showStatus('Please select or upload a codebase context first.', 'error');
      return;
    }

    const userMessage = inputQuery;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInputQuery('');
    setIsChatting(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          index_name: selectedIndex,
          k: 5
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessages(prev => [...prev, { role: 'ai', text: data.answer }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: `Error: ${data.detail || 'Failed to analyze request.'}` }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Error: Connection lost with backend.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  // Handle Index Deletion
  const handleDeleteIndex = async (targetIndex) => {
    if (!window.confirm(`Are you sure you want to completely purge index "${targetIndex}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/index/${targetIndex}`, { method: 'DELETE' });
      if (res.ok) {
        showStatus(`Purged index "${targetIndex}" successfully.`, 'success');
        if (selectedIndex === targetIndex) setSelectedIndex('');
        fetchIndices();
      }
    } catch (err) {
      showStatus('Failed to drop vector structure.', 'error');
    }
  };

  return (
    <div className="gemini-app">
      {/* Sidebar Controls */}
      <aside className="sidebar">
        <div className="brand">
          <FiCpu className="brand-icon pulse" />
          <h2>CoreRAG <span>v3.1</span></h2>
        </div>

        {/* Data Sync Section */}
        <section className="panel-section">
          <h3><FiUploadCloud /> Ingest Codebase</h3>
          <form onSubmit={handleUpload} className="upload-form">
            <input 
              type="text" 
              placeholder="index-identifier-name"
              value={newIndexName}
              onChange={(e) => setNewIndexName(e.target.value)}
              disabled={isUploading}
            />
            <label className="file-dropzone">
              <input 
                type="file" 
                accept=".zip" 
                onChange={(e) => setSelectedFile(e.target.files[0])}
                disabled={isUploading}
              />
              <span className="file-label-text">
                {selectedFile ? selectedFile.name : "Select codebase .zip"}
              </span>
            </label>
            <button type="submit" className="action-btn glow" disabled={isUploading}>
              {isUploading ? "Processing Subsystems..." : "Deploy Vectors"}
            </button>

            {/* Interactive Step-by-Step System Guide */}
            <div className="steps-container">
              <button 
                type="button" 
                className="steps-toggle-btn"
                onClick={() => setShowSteps(!showSteps)}
              >
                {showSteps ? "Hide pipeline instructions" : "Click here to know the steps"}
              </button>
              
              {showSteps && (
                <ol className="steps-list">
                  <li>Click on the file selector to upload your codebase context.</li>
                  <li>Name the index where you want to route and isolate these tokens.</li>
                  <li>Click the <strong>Deploy Vectors</strong> button to split layers, run the dense/sparse hybrid transforms, and write to Pinecone database indexes.</li>
                  <li>Wait a brief moment for asynchronous server-side batches to finish indexing.</li>
                  <li>Focus the deployed target context and execute queries inside the conversational matrix workspace.</li>
                </ol>
              )}
            </div>
          </form>
        </section>

        {/* Active Knowledge Bases */}
        
        {/* Dynamic Pipeline Global Status Banner */}
        {statusMessage.text && (
          <div className={`status-banner ${statusMessage.type}`}>
            {statusMessage.type === 'loading' && <div className="gemini-spinner" />}
            {statusMessage.type === 'success' && <FiCheckCircle />}
            {statusMessage.type === 'error' && <FiAlertCircle />}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </aside>

      {/* Main Intelligent Interface Grid */}
      <main className="chat-container">
        <header className="chat-header">
          <div className="header-meta">
            <FiMessageSquare />
            <h2>Interactive Retrieval Assistant</h2>
          </div>
          {selectedIndex && (
            <div className="active-pill">
              <span className="pulse-dot"></span> Context Focus: <strong>{selectedIndex}</strong>
            </div>
          )}
        </header>

        {/* Chat Feed Window */}
        <div className="chat-feed">
          {messages.length === 0 && (
            <div className="welcome-hero">
              <h1 className="gradient-text">What architectural question do you have today?</h1>
              <p>Select an active context branch from the sidebar to inspect modular logic, file dependencies, and trace variables.</p>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div key={i} className={`message-row ${msg.role}`}>
              <div className="avatar">
                {msg.role === 'user' ? 'U' : <FiCpu className="ai-avatar-icon" />}
              </div>
              <div className="message-bubble">
                <pre className="markdown-content">{msg.text}</pre>
              </div>
            </div>
          ))}

          {/* AI Generation Stream Loader State */}
          {isChatting && (
            <div className="message-row ai processing">
              <div className="avatar">
                <FiCpu className="ai-avatar-icon spinning" />
              </div>
              <div className="message-bubble loading-bubble">
                <div className="gemini-linear-loader">
                  <div className="line-bar"></div>
                </div>
                <span className="loader-text">Synthesizing reference logic blocks...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Text Area Matrix */}
        <footer className="chat-input-area">
          <form onSubmit={handleChat} className="chat-form">
            <input 
              type="text" 
              placeholder={selectedIndex ? `Query structural patterns in ${selectedIndex}...` : "Select an indexing tier to enable conversation"}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isChatting || !selectedIndex}
            />
            <button type="submit" disabled={isChatting || !inputQuery.trim() || !selectedIndex}>
              <FiSend />
            </button>
          </form>
        </footer>
      </main>
    </div>
  );
}

export default App;