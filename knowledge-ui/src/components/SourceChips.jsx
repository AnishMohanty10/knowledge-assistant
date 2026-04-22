import React from 'react'

export default function SourceChips({ sources }) {
  // Deduplicate and process sources (assuming they might be just strings)
  const uniqueSources = Array.from(new Set(sources))

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginTop: '16px'
    }}>
      {uniqueSources.map((src, i) => {
        // Extract filename if it looks like a path
        const filename = src.split('/').pop().split('\\').pop()
        
        return (
          <div 
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: 'var(--bg-3)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              fontSize: '11px',
              color: 'var(--text-2)',
              cursor: 'default',
              transition: 'border-color 0.2s ease, color 0.2s ease',
              fontFamily: 'var(--font-mono)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--text-1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-2)'
            }}
          >
            <span style={{ fontSize: '10px' }}>📄</span>
            {filename}
          </div>
        )
      })}
    </div>
  )
}
