import React from 'react'

export default function Sidebar({
  conversations,
  activeConvId,
  setActiveConvId,
  createNewChat,
  isSidebarOpen,
  toggleSidebar,
  openUploadPanel,
  logout
}) {
  return (
    <div style={{
      width: isSidebarOpen ? '260px' : '0px',
      backgroundColor: 'var(--bg-2)',
      borderRight: isSidebarOpen ? '1px solid var(--border)' : 'none',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease',
      overflow: 'hidden',
      flexShrink: 0
    }}>
      <div style={{ padding: '20px', minWidth: '260px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', margin: 0 }}>KnowledgeAI</h1>
          {/* Mobile close button (visible only conceptually or on small screens) */}
          <button onClick={toggleSidebar} style={{ padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
        </div>

        <button
          onClick={createNewChat}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            transition: 'border-color 0.2s ease',
            marginBottom: '20px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          New chat
        </button>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              style={{
                width: '100%',
                padding: '12px',
                textAlign: 'left',
                borderRadius: '6px',
                fontSize: '14px',
                color: conv.id === activeConvId ? 'var(--text-1)' : 'var(--text-2)',
                backgroundColor: conv.id === activeConvId ? 'var(--bg-3)' : 'transparent',
                borderLeft: conv.id === activeConvId ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'background-color 0.2s ease, color 0.2s ease',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              onMouseEnter={(e) => {
                if(conv.id !== activeConvId) e.currentTarget.style.backgroundColor = 'var(--bg-3)'
              }}
              onMouseLeave={(e) => {
                if(conv.id !== activeConvId) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {conv.title}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={openUploadPanel}
            style={{
              width: '100%',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              color: 'var(--text-2)',
              borderRadius: '6px'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-2)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Upload docs
          </button>

          {logout && (
            <button
              onClick={logout}
              style={{
                width: '100%',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '14px',
                color: 'var(--text-2)',
                borderRadius: '6px',
                marginTop: '10px'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-2)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Log Out
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
