import React, { useRef, useEffect, useState } from 'react'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'

export default function ChatWindow({
  conversation,
  addMessage,
  toggleSidebar,
  isSidebarOpen,
  openUploadPanel
}) {
  const scrollRef = useRef(null)
  const [isTyping, setIsTyping] = useState(false)
  const [kbError, setKbError] = useState(false)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversation?.messages, isTyping])

  if (!conversation) return <div style={{ flex: 1, backgroundColor: 'var(--bg)' }}></div>

  const handleSend = async (text) => {
    const userMsg = { role: 'user', content: text }
    addMessage(conversation.id, userMsg)
    
    setIsTyping(true)
    setKbError(false)
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://knowledge-assistant-production-7dbf.up.railway.app";
      const response = await fetch(`${API_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          history: conversation.messages.map(m => ({ role: m.role, content: m.content }))
        })
      })
      
      const data = await response.json()

      if (!response.ok) {
        if (data.error === "no_documents") {
            setKbError(true)
            return
        }
        throw new Error(data.message || 'API request failed')
      }
      
      addMessage(conversation.id, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        grounded: data.grounded
      })
    } catch (err) {
      console.error(err)
      addMessage(conversation.id, {
        role: 'assistant',
        content: `**Error**: ${err.message}`
      })
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', height: '100%' }}>
      {!isSidebarOpen && (
        <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
          <button onClick={toggleSidebar} style={{ padding: '8px', backgroundColor: 'var(--bg-2)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
        </div>
      )}

      {kbError && (
        <div style={{ backgroundColor: '#ffed4a', color: '#8a6d3b', padding: '16px', textAlign: 'center', borderBottom: '1px solid #e5c100', display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center' }}>
          <span>Knowledge base is empty — upload documents first</span>
          <button onClick={() => { setKbError(false); openUploadPanel(); }} style={{ padding: '6px 12px', background: '#d6a000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Open Uploader</button>
        </div>
      )}

      <div 
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '40px 20px 120px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        {conversation.messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
             <h2 style={{ fontSize: '24px', fontWeight: '500', marginBottom: '12px' }}>Ask anything about your documents</h2>
             <p style={{ color: 'var(--text-2)', marginBottom: '32px' }}>Upload PDFs, Text, or Markdown files and query them.</p>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {conversation.messages.map((msg, idx) => (
              <MessageBubble key={idx} {...msg} />
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '4px', padding: '16px' }}>
                 <div style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-2)', borderRadius: '50%' }}></div>
                 <div style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-2)', borderRadius: '50%' }}></div>
                 <div style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-2)', borderRadius: '50%' }}></div>
              </div>
            )}
          </div>
        )}
      </div>

      <InputBar onSend={handleSend} isTyping={isTyping} />
    </div>
  )
}
