import { useState, useCallback, useMemo, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import UploadPanel from './components/UploadPanel'
import Auth from './components/Auth'
import { supabase } from './supabase'
import { signOut } from './auth'

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function App() {
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [conversations, setConversations] = useState([
    { id: generateId(), title: 'New Conversation', messages: [] }
  ])
  const [activeConvId, setActiveConvId] = useState(conversations[0].id)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoadingUser(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return

    const loadChats = async () => {
      try {
        const { data, error } = await supabase
          .from('chats')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })

        if (error) throw error

        if (data && data.length > 0) {
          const loadedMessages = data.map(chat => ({
            role: chat.role,
            content: chat.message
          }))

          let title = 'Chat History'
          if (loadedMessages.length > 0 && loadedMessages[0].role === 'user') {
            title = loadedMessages[0].content.substring(0, 28) + (loadedMessages[0].content.length > 28 ? '...' : '')
          }

          const convId = generateId()
          setConversations([
            { id: convId, title, messages: loadedMessages }
          ])
          setActiveConvId(convId)
        } else {
           const convId = generateId()
           setConversations([{ id: convId, title: 'New Conversation', messages: [] }])
           setActiveConvId(convId)
        }
      } catch (err) {
        console.error('Error loading chat history:', err)
      }
    }

    loadChats()
  }, [user])

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConvId)
  }, [conversations, activeConvId])

  const createNewChat = useCallback(() => {
    const newId = generateId()
    setConversations((prev) => [
      { id: newId, title: 'New Conversation', messages: [] },
      ...prev
    ])
    setActiveConvId(newId)
  }, [])

  const addMessage = useCallback((convId, message) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === convId) {
          const updatedMessages = [...conv.messages, message]
          let newTitle = conv.title
          if (updatedMessages.length === 1 && message.role === 'user') {
            newTitle = message.content.substring(0, 28) + (message.content.length > 28 ? '...' : '')
          }
          return { ...conv, messages: updatedMessages, title: newTitle }
        }
        return conv
      })
    )

    if (user) {
      supabase.from('chats').insert([
        {
          user_id: user.id,
          message: message.content,
          role: message.role
        }
      ]).then(({ error }) => {
        if (error) {
          console.error("Failed to save message to Supabase:", error)
        }
      })
    }
  }, [user])

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev)

  if (loadingUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg)', color: 'var(--primary)' }}>
        <div className="typing-indicator" style={{ background: 'transparent' }}>
          <span></span><span></span><span></span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        conversations={conversations}
        activeConvId={activeConvId}
        setActiveConvId={setActiveConvId}
        createNewChat={createNewChat}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        openUploadPanel={() => setIsUploadPanelOpen(true)}
        logout={signOut}
      />
      <ChatWindow
        conversation={activeConversation}
        addMessage={addMessage}
        toggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />
      {isUploadPanelOpen && (
        <UploadPanel onClose={() => setIsUploadPanelOpen(false)} />
      )}
    </div>
  )
}

export default App
