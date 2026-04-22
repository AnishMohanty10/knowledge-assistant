import React, { useState } from 'react'

export default function UploadPanel({ onClose }) {
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpload = async () => {
    if (files.length === 0) return
    setLoading(true)
    setStatus('Uploading and syncing to vector database...')
    
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))

    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://knowledge-assistant-production-7dbf.up.railway.app";
      const response = await fetch(`${API_URL}/api/ingest`, {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      if (response.ok) {
        setStatus(`Success! Embedded ${data.chunks_added} fresh chunks.`)
        setFiles([])
      } else {
        setStatus(`Error: ${data.message || data.error}`)
      }
    } catch (e) {
      setStatus(`Failed. Verify backend is running.`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to completely erase the knowledge base and all uploaded files?")) return;
    setLoading(true);
    setStatus("Erasing vector database and internal files...");
    try {
        const API_URL = import.meta.env.VITE_API_URL || "https://knowledge-assistant-production-7dbf.up.railway.app";
        const response = await fetch(`${API_URL}/api/uploads?reset_db=true`, {
            method: 'DELETE'
        });
        if (response.ok) {
            setStatus("Vector database and uploads successfully wiped.");
            setFiles([]);
        } else {
            setStatus("Failed to erase database.");
        }
    } catch(e) {
        setStatus("Network Error.");
    } finally {
       setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'var(--bg)', borderRadius: '16px', padding: '32px',
        width: '100%', maxWidth: '500px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Manage Knowledge Base</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-2)' }}>✕</button>
        </div>

        <input 
          type="file" multiple 
          accept=".pdf,.txt,.md"
          onChange={(e) => setFiles(Array.from(e.target.files))}
          style={{ marginBottom: '16px', width: '100%', padding: '12px', border: '1px dashed var(--border)', borderRadius: '8px' }}
        />

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button 
                onClick={handleUpload} 
                disabled={loading || files.length === 0}
                style={{
                    flex: 1, padding: '12px', backgroundColor: 'var(--accent)', color: '#fff',
                    border: 'none', borderRadius: '8px', fontWeight: '600',
                    opacity: loading || files.length === 0 ? 0.5 : 1, cursor: 'pointer'
                }}
            >
            {loading ? 'Processing...' : 'Ingest Documents'}
            </button>
            <button 
                onClick={handleDelete} 
                disabled={loading}
                style={{
                    padding: '12px 18px', backgroundColor: 'transparent', color: '#ff4d4f',
                    border: '1px solid #d9363e', borderRadius: '8px', fontWeight: '600',
                    cursor: 'pointer'
                }}
            >
            Delete Database
            </button>
        </div>

        {status && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-2)', borderRadius: '8px', fontSize: '14px', color: 'var(--text-2)' }}>
            {status}
          </div>
        )}
      </div>
    </div>
  )
}
