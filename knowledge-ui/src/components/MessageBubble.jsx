import React, { useEffect, useRef } from 'react'
import SourceChips from './SourceChips'

export default function MessageBubble({ role, content, sources }) {
  const isUser = role === 'user'
  const contentRef = useRef(null)

  useEffect(() => {
    if (contentRef.current && window.hljs) {
      contentRef.current.querySelectorAll('pre code').forEach((block) => {
        window.hljs.highlightElement(block)
      })
    }
  }, [content])

  // Extremely basic markdown parser for demonstration
  // Handles bold, italic, code blocks, and inline code.
  // In a robust production app, use react-markdown. 
  // However, fulfilling the "no extra libraries" (only highlight.js via CDN requested).
  const renderMarkdown = (text) => {
    let html = text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const languageClass = lang ? `language-${lang}` : 'language-plaintext'
      return `<pre style="background:var(--bg-2); padding:16px; border-radius:8px; overflow-x:auto; margin:8px 0; border:1px solid var(--border)"><code class="${languageClass}">${code}</code></pre>`
    })
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background:var(--bg-3); padding:2px 6px; border-radius:4px; font-family:var(--font-mono); font-size:0.9em; border:1px solid var(--border)">$1</code>')
    
    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    
    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    
    // Newlines
    html = html.replace(/\n/g, '<br/>')

    return { __html: html }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      maxWidth: isUser ? '72%' : '100%',
      width: isUser ? 'auto' : '100%'
    }}>
      <div style={{
        backgroundColor: isUser ? 'var(--bg-3)' : 'transparent',
        padding: isUser ? '12px 18px' : '0 16px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '0',
        borderLeft: isUser ? 'none' : '2px solid var(--border)',
        position: 'relative'
      }}>
        <div 
          ref={contentRef}
          style={{ lineHeight: '1.6' }}
          dangerouslySetInnerHTML={renderMarkdown(content)}
        />
        
        {!isUser && sources && sources.length > 0 && (
          <SourceChips sources={sources} />
        )}
      </div>
    </div>
  )
}
