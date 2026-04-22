import React, { useState, useRef, useEffect } from 'react'

export default function InputBar({ onSend, isTyping }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px' // Reset to calculate correct scrollHeight
      const newHeight = Math.min(textareaRef.current.scrollHeight, 144) // Max ~6 rows (24px * 6)
      textareaRef.current.style.height = `${newHeight}px`
    }
  }, [text])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (text.trim() && !isTyping) {
        onSend(text)
        setText('')
      }
    }
  }

  const handleSendClick = () => {
    if (text.trim() && !isTyping) {
      onSend(text)
      setText('')
    }
  }

  const hasText = text.trim().length > 0

  return (
    <div style={{
      position: 'absolute',
      bottom: '0',
      left: '0',
      right: '0',
      padding: '24px',
      background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '800px',
        backgroundColor: 'var(--bg-3)',
        borderRadius: '16px',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'flex-end',
        padding: '12px 16px',
        transition: 'background-color 0.2s ease',
        opacity: isTyping ? 0.7 : 1
      }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
          placeholder={isTyping ? "Thinking..." : "Ask a question..."}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text-1)',
            fontSize: '15px',
            lineHeight: '24px',
            maxHeight: '144px',
            outline: 'none',
            padding: '0',
            margin: '0',
            overflowY: 'auto'
          }}
          rows={1}
        />
        <button
          onClick={handleSendClick}
          disabled={!hasText || isTyping}
          style={{
            backgroundColor: hasText ? 'var(--accent)' : 'var(--bg-2)',
            color: hasText ? '#fff' : 'var(--text-3)',
            border: 'none',
            borderRadius: '10px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: '12px',
            cursor: hasText && !isTyping ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  )
}
