import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Plus, MessageSquare, ChevronLeft } from 'lucide-react';
import { 
  setActiveConversation, 
  createConversation, 
  fetchConversations,
  fetchMessages
} from '../store/chatSlice';
import { toggleSidebar } from '../store/uiSlice';

const Sidebar = () => {
  const dispatch = useDispatch();
  const { conversations, activeConversation, loading } = useSelector((state) => state.chat);
  const { sidebarCollapsed } = useSelector((state) => state.ui);

  // Fetch conversations on component mount
  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  const handleNewChat = async () => {
    try {
      const newConversation = await dispatch(createConversation('New Chat')).unwrap();
      dispatch(setActiveConversation(newConversation.id));
      
      // Close sidebar on mobile after creating new chat
      if (window.innerWidth < 1024) {
        dispatch(toggleSidebar());
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleConversationClick = async (conversationId) => {
    dispatch(setActiveConversation(conversationId));
    
    // Fetch messages for the selected conversation
    try {
      await dispatch(fetchMessages({ conversationId })).unwrap();
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
    
    // Close sidebar on mobile after selecting conversation
    if (window.innerWidth < 1024) {
      dispatch(toggleSidebar());
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Just now';
    }
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString() === date.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="h-full bg-white flex flex-col w-full">
      <div className={`${sidebarCollapsed ? 'p-3' : 'p-4 lg:p-6'} border-b border-gray-200`}>
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center mb-4' : 'justify-between mb-6'}`}>
          {!sidebarCollapsed && <h2 className="text-lg font-bold text-gray-900">Conversations</h2>}
          {sidebarCollapsed && (
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <ChevronLeft size={20} />
            </button>
          )}
        </div>
        {!sidebarCollapsed && (
          <button
            onClick={handleNewChat}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className={`text-center ${sidebarCollapsed ? 'p-4' : 'p-8'}`}>
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={28} className="text-gray-400" />
            </div>
            {!sidebarCollapsed && <p className="text-gray-500 text-sm font-medium">No conversations yet</p>}
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => handleConversationClick(conversation.id)}
                className={`w-full text-left rounded-xl transition-all duration-200 ${
                  activeConversation === conversation.id
                    ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                    : 'hover:bg-gray-50 border-2 border-transparent'
                } ${sidebarCollapsed ? 'p-3 flex justify-center' : 'p-4'}`}
                title={sidebarCollapsed ? conversation.title : ''}
              >
                {sidebarCollapsed ? (
                  <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                    <MessageSquare size={16} className="text-gray-600" />
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate mb-1">
                        {conversation.title}
                      </h3>
                      <p className="text-gray-500 text-xs truncate">
                        {conversation.preview}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 ml-3 flex-shrink-0 mt-0.5">
                      {formatTime(conversation.timestamp)}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;