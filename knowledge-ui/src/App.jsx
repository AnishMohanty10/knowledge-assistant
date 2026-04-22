import { useState, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import UploadPanel from './components/UploadPanel'

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function App() {
  const [conversations, setConversations] = useState([
    { id: generateId(), title: 'New Conversation', messages: [] }
  ])
  const [activeConvId, setActiveConvId] = useState(conversations[0].id)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false)

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
          // Update title if it's the first message from user
          let newTitle = conv.title
          if (updatedMessages.length === 1 && message.role === 'user') {
            newTitle = message.content.substring(0, 28) + (message.content.length > 28 ? '...' : '')
          }
          return { ...conv, messages: updatedMessages, title: newTitle }
        }
        return conv
      })
    )
  }, [])

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev)

  return (
    <div className="app-container">
      <Sidebar
        conversations={conversations}
        activeConvId={activeConvId}
        setActiveConvId={setActiveConvId}
        createNewChat={createNewChat}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        openUploadPanel={() => setIsUploadPanelOpen(true)}
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
