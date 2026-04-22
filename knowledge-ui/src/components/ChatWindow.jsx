import React, { useRef, useEffect, useState } from 'react'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'

export default function ChatWindow({
  conversation,
  addMessage,
  toggleSidebar,
  isSidebarOpen
}) {
  const scrollRef = useRef(null)
  const [isTyping, setIsTyping] = useState(false)

  // Auto-scroll to bottom on new message or when typing state changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversation?.messages, isTyping])

  if (!conversation) return <div style={{ flex: 1, backgroundColor: 'var(--bg)' }}></div>

  const handleSend = async (text) => {
    // Optimistically add user message
    const userMsg = { role: 'user', content: text }
    addMessage(conversation.id, userMsg)
    
    setIsTyping(true)
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          history: conversation.messages.map(m => ({ role: m.role, content: m.content }))
        })
      })
      
      if (!response.ok) {
        throw new Error('API request failed')
      }
      
      const data = await response.json()
      addMessage(conversation.id, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources
      })
    } catch (err) {
      console.error(err)
      addMessage(conversation.id, {
        role: 'assistant',
        content: '**Error**: Failed to connect to the backend API. Make sure it is running.'
      })
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', height: '100%' }}>
      {/* Top Header for Mobile toggle */}
      {!isSidebarOpen && (
        <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
          <button onClick={toggleSidebar} style={{ padding: '8px', backgroundColor: 'var(--bg-2)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '40px 20px 120px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {conversation.messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '16px', backgroundColor: 'var(--bg-2)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid var(--border)'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '500', marginBottom: '12px' }}>Ask anything about your documents</h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '32px' }}>Upload PDFs, Text, or Markdown files and query them instantly.</p>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {["What is the main topic of the uploaded docs?", "Summarize the key findings.", "Can you explain the methodology used?"].map((chip, i) => (
                <button key={i} onClick={() => handleSend(chip)} style={{
                  padding: '10px 16px', backgroundColor: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: '20px', fontSize: '13px', color: 'var(--text-2)', transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text-1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {conversation.messages.map((msg, idx) => (
              <MessageBubble key={idx} {...msg} />
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '4px', padding: '16px' }}>
                <div className="typing-dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-2)', borderRadius: '50%' }}></div>
                <div className="typing-dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-2)', borderRadius: '50%', animationDelay: '0.2s' }}></div>
                <div className="typing-dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--text-2)', borderRadius: '50%', animationDelay: '0.4s' }}></div>
              </div>
            )}
          </div>
        )}
      </div>

      <InputBar onSend={handleSend} isTyping={isTyping} />

      <style>{`
        @keyframes blink {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
        .typing-dot {
          animation: blink 1.4s infinite both;
        }
      `}</style>
    </div>
  )
}
