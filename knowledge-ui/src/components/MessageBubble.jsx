import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function MessageBubble({ role, content, sources, grounded }) {
  const isUser = role === 'user'
  
  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '24px',
      backgroundColor: isUser ? 'transparent' : 'var(--bg-2)',
      borderRadius: '12px',
      color: 'var(--text-1)',
      width: '100%',
      border: isUser ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{
        flexShrink: 0,
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isUser ? 'var(--accent)' : '#2a2a2a',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '15px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        {isUser ? 'U' : 'AI'}
      </div>
      
      <div style={{ flex: 1, overflow: 'hidden', paddingTop: '6px' }}>
        <div className="markdown-body" style={{ lineHeight: '1.6', fontSize: '15px' }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({node, inline, className, children, ...props}) {
                const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                  <div style={{ margin: '16px 0', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ 
                      backgroundColor: '#1e1e1e', 
                      padding: '8px 16px', 
                      fontSize: '12px', 
                      color: '#a0a0a0', 
                      borderBottom: '1px solid #333',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontFamily: 'var(--font-sans)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      <span>{match[1]}</span>
                    </div>
                    <SyntaxHighlighter
                      {...props}
                      children={String(children).replace(/\n$/, '')}
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{ margin: 0, padding: '16px', backgroundColor: '#0f0f0f', fontSize: '14px', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                ) : (
                  <code {...props} style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.9em', fontFamily: 'var(--font-mono)' }}>
                    {children}
                  </code>
                )
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        
        {!isUser && grounded === false && (
           <div style={{
             marginTop: '20px',
             padding: '12px 16px',
             backgroundColor: 'rgba(255, 193, 7, 0.1)',
             color: '#ffc107',
             fontSize: '13px',
             borderRadius: '8px',
             border: '1px solid rgba(255, 193, 7, 0.2)',
             display: 'flex',
             alignItems: 'center',
             fontWeight: '500'
           }}>
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
               <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
               <line x1="12" y1="9" x2="12" y2="13"></line>
               <line x1="12" y1="17" x2="12.01" y2="17"></line>
             </svg>
             Answer may not be from your docs
           </div>
        )}

        {sources && sources.length > 0 && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.5px' }}>SOURCES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {sources.map((src, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '12px',
                  padding: '6px 12px',
                  backgroundColor: 'var(--bg)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  color: 'var(--text-1)',
                  transition: 'background-color 0.2s',
                  cursor: 'default'
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', color: 'var(--accent)' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  {src}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
