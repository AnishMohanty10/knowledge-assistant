import React, { useState, useRef, useEffect } from 'react'

export default function UploadPanel({ onClose }) {
  const [files, setFiles] = useState([])
  const [isIngesting, setIsIngesting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [totalChunks, setTotalChunks] = useState(0)
  const [ingestSuccess, setIngestSuccess] = useState(false)
  
  const fileInputRef = useRef(null)

  // Fetch status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status')
        const data = await res.json()
        setTotalChunks(data.total_chunks || 0)
      } catch (err) {
        console.error('Failed to get status', err)
      }
    }
    fetchStatus()
  }, [])

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      appendFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      appendFiles(Array.from(e.target.files))
    }
  }

  const appendFiles = (newFiles) => {
    // Filter accepted typess
    const validFiles = newFiles.filter(f => 
      f.name.endsWith('.pdf') || f.name.endsWith('.txt') || f.name.endsWith('.md')
    )
    if (validFiles.length !== newFiles.length) {
      setErrorMsg('Some files were ignored. Only .pdf, .txt, .md allowed.')
    }
    setFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setErrorMsg('')
    setIngestSuccess(false)
  }

  const handleIngest = async () => {
    if (files.length === 0) return
    setIsIngesting(true)
    setErrorMsg('')
    setIngestSuccess(false)
    setProgress(20)

    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })

      setProgress(50)
      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: formData
      })
      setProgress(80)

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`)
      }

      const data = await res.json()
      if (data.status === 'ok') {
        setProgress(100)
        setIngestSuccess(true)
        setFiles([]) // Clear queue on success
        
        // Refresh total chunks
        const statusRes = await fetch('/api/status')
        const statusData = await statusRes.json()
        setTotalChunks(statusData.total_chunks || 0)
        
        setTimeout(() => setProgress(0), 2000)
      } else {
        throw new Error(data.message || 'Ingestion failed')
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'An error occurred during ingestion.')
      setProgress(0)
    } finally {
      setIsIngesting(false)
    }
  }

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 40
        }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'var(--bg-2)',
        borderRight: '1px solid var(--border)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
        animation: 'slideIn 0.3s ease-out',
      }}>
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '500', margin: 0 }}>Document Library</h2>
          <button onClick={onClose} style={{ color: 'var(--text-2)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--bg-3)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--accent-dim)', borderRadius: '6px', color: 'var(--accent)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
            </div>
            <div>
              <p style={{ fontSize: '14px', margin: 0 }}>Total Context Chunks</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '4px 0 0 0', color: 'var(--text-1)' }}>{totalChunks}</p>
            </div>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '12px', fontWeight: '500' }}>Add new documents</p>
          
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border)',
              borderRadius: '8px',
              padding: '32px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: 'var(--bg)',
              transition: 'all 0.2s ease',
              marginBottom: '20px'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.backgroundColor = 'var(--bg-3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.backgroundColor = 'var(--bg)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px auto' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <p style={{ fontSize: '14px', color: 'var(--text-1)', marginBottom: '4px' }}>Click or drag files here</p>
            <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Supports .pdf, .txt, .md</p>
            <input 
              type="file" 
              multiple 
              accept=".pdf,.txt,.md" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileSelect}
            />
          </div>

          {errorMsg && (
            <div style={{ padding: '12px', backgroundColor: '#381515', color: '#ff6b6b', borderRadius: '6px', fontSize: '13px', marginBottom: '20px', border: '1px solid #ff6b6b50' }}>
              {errorMsg}
            </div>
          )}

          {ingestSuccess && (
            <div style={{ padding: '12px', backgroundColor: '#153820', color: '#6bff8d', borderRadius: '6px', fontSize: '13px', marginBottom: '20px', border: '1px solid #6bff8d50' }}>
              Documents successfully ingested and indexed!
            </div>
          )}

          {files.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '12px', fontWeight: '500' }}>Queue ({files.length})</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {files.map((file, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: 'var(--bg-3)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', overflow: 'hidden' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                    </div>
                    <button onClick={() => removeFile(i)} style={{ color: 'var(--text-3)' }} disabled={isIngesting}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '24px', borderTop: '1px solid var(--border)' }}>
          {progress > 0 && progress < 100 && (
            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-3)', borderRadius: '2px', marginBottom: '16px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--accent)', transition: 'width 0.3s ease' }} />
            </div>
          )}
          <button
            onClick={handleIngest}
            disabled={files.length === 0 || isIngesting}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: files.length > 0 && !isIngesting ? 'var(--accent)' : 'var(--bg-3)',
              color: files.length > 0 && !isIngesting ? '#fff' : 'var(--text-3)',
              borderRadius: '6px',
              fontWeight: '500',
              cursor: files.length > 0 && !isIngesting ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isIngesting ? (
              <>
                <svg className="typing-dot" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                Processing...
              </>
            ) : 'Ingest documents'}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
