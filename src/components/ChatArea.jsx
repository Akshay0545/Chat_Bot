import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Send, User, Bot, Search, Copy, ThumbsUp, ThumbsDown, MoreHorizontal, Pause } from 'lucide-react';
import { addMessage, setTyping, addConversation, setActiveConversation } from '../store/chatSlice';
import { updateCredits } from '../store/authSlice';
import aiService from '../services/aiService';

const ChatArea = () => {
  const dispatch = useDispatch();
  const { messages, activeConversation, isTyping, conversations } = useSelector((state) => state.chat);
  const { user } = useSelector((state) => state.auth);
  const [inputValue, setInputValue] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [likedMessageId, setLikedMessageId] = useState(null);
  const [dislikedMessageId, setDislikedMessageId] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const aiResponseRef = useRef(null);

  const suggestedPrompts = [
    'Explain quantum computing in simple terms',
    'Write a Python function to sort a list',
    'What are the benefits of meditation?',
    'Help me plan a weekend trip to Paris',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputValue]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date().toISOString(),
      conversationId: activeConversation,
    };

    // If no active conversation, create one
    if (!activeConversation) {
      const newConversation = {
        id: Date.now(),
        title: inputValue.substring(0, 50) + (inputValue.length > 50 ? '...' : ''),
        timestamp: new Date().toISOString(),
        preview: inputValue.substring(0, 100),
      };
      dispatch(addConversation(newConversation));
      dispatch(setActiveConversation(newConversation.id));
      userMessage.conversationId = newConversation.id;
    }

    dispatch(addMessage(userMessage));
    setInputValue('');
    console.log('Setting typing to true');
    dispatch(setTyping(true));

    // Deduct credits
    const currentCredits = user?.credits || 1250;
    dispatch(updateCredits(currentCredits - 1));

    // Get AI response
    try {
      const conversationHistory = conversationMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Create a cancellable promise for AI response
      const aiResponsePromise = aiService.generateResponse(inputValue, conversationHistory);
      aiResponseRef.current = aiResponsePromise;

      const aiResponse = await aiResponsePromise;
      
      // Check if the response was cancelled
      if (isPaused) {
        dispatch(setTyping(false));
        return;
      }
      
      const aiMessage = {
        id: Date.now() + 1,
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        conversationId: activeConversation || userMessage.conversationId,
      };
      
      dispatch(addMessage(aiMessage));
    } catch (error) {
      if (isPaused) {
        console.log('AI response was paused');
        dispatch(setTyping(false));
        return;
      }
      console.error('AI response error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        content: "I'm sorry, I'm having trouble responding right now. Please try again.",
        sender: 'ai',
        timestamp: new Date().toISOString(),
        conversationId: activeConversation || userMessage.conversationId,
      };
      dispatch(addMessage(errorMessage));
    } finally {
      console.log('Setting typing to false');
      dispatch(setTyping(false));
      setIsPaused(false);
      aiResponseRef.current = null;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedPrompt = (prompt) => {
    setInputValue(prompt);
  };

  const handleCopyMessage = async (content, messageId) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleLikeMessage = (messageId) => {
    setLikedMessageId(messageId);
    setTimeout(() => setLikedMessageId(null), 2000);
  };

  const handleDislikeMessage = (messageId) => {
    setDislikedMessageId(messageId);
    setTimeout(() => setDislikedMessageId(null), 2000);
  };

  const handleMouseEnter = (messageId) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setHoveredMessageId(messageId);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredMessageId(null);
    }, 2000); // Hide after 2 seconds
  };

  const handlePause = () => {
    if (isTyping) {
      setIsPaused(true);
      dispatch(setTyping(false));
      // Cancel the AI response if possible
      if (aiResponseRef.current) {
        // Note: This is a simplified approach. In a real implementation,
        // you might want to use AbortController for proper cancellation
        console.log('Pausing AI response');
      }
    }
  };

  const handleMoreMenuClick = (e, messageId) => {
    e.stopPropagation();
    setMoreMenuOpen(moreMenuOpen === messageId ? null : messageId);
  };

  const handleMoreMenuCopy = (content, messageId) => {
    handleCopyMessage(content, messageId);
    setMoreMenuOpen(null);
  };

  const currentConversation = conversations.find(c => c.id === activeConversation);
  const conversationMessages = messages.filter(m => m.conversationId === activeConversation);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
      <div className="flex-1 overflow-y-auto">
        {conversationMessages.length === 0 ? (
          // Empty State
          <div className="h-full flex flex-col items-center justify-center p-4 lg:p-8 text-center">
            <div className="">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles h-16 w-16 mx-auto text-blue-600 mb-4" aria-hidden="true">
                <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
                <path d="M20 2v4"></path>
                <path d="M22 4h-4"></path>
                <circle cx="4" cy="20" r="2"></circle>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to AI Chat</h2>
            <p className="text-[#64748B] mb-6 max-w-2xl text-base leading-relaxed">
              Start a conversation with our AI assistant. Ask questions, get help with tasks, or explore ideas<br />together.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl w-full">
              {suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="group inline-flex items-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background border border-gray-200 bg-white text-gray-700 shadow-sm hover:shadow-md hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-100 hover:text-blue-700 active:scale-[0.98] p-4 h-auto text-left justify-start"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square h-4 w-4 mr-2 flex-shrink-0 text-blue-600 group-hover:text-blue-700 transition-colors duration-200" aria-hidden="true">
                    <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span className="text-sm">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Messages
          <div className="p-3 lg:p-6 space-y-4 max-w-3xl mx-auto w-full">
            {conversationMessages.map((message) => (
                <div
                key={message.id}
                className="group flex gap-3 py-3 px-6 transition-colors bg-transparent"
                onMouseEnter={() => message.sender === 'ai' && handleMouseEnter(message.id)}
                onMouseLeave={() => message.sender === 'ai' && handleMouseLeave()}
              >
                {message.sender === 'ai' && (
                  <span data-slot="avatar" className="relative flex size-8 shrink-0 overflow-hidden rounded-full h-8 w-8">
                    <span data-slot="avatar-fallback" className="flex size-full items-center justify-center rounded-full bg-blue-600">
                      <Bot size={12} className="text-white" />
                    </span>
                  </span>
                )}
                
                {message.sender === 'user' && (
                  <span data-slot="avatar" className="relative flex size-8 shrink-0 overflow-hidden rounded-full h-8 w-8">
                    <span data-slot="avatar-fallback" className="flex size-full items-center justify-center rounded-full bg-gray-200">
                      <User size={12} className="text-gray-600" />
                    </span>
                  </span>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm text-gray-900">
                      {message.sender === 'user' ? 'You' : 'AI Assistant'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: '#FEFEFE' }}>
                    <p className="whitespace-pre-wrap break-words m-0 text-gray-900 text-sm leading-relaxed">{message.content}</p>
                  </div>
                  
                  {/* Action buttons for AI messages - positioned below the dialog box */}
                  {message.sender === 'ai' && (
                    <div className="flex items-center space-x-1.5 mt-2 opacity-100 transition-opacity duration-300">
                      {moreMenuOpen === message.id ? (
                        /* Show Copy Message Button when 3-dots is clicked */
                        <button
                          onClick={() => handleMoreMenuCopy(message.content, message.id)}
                          className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-all duration-200"
                        >
                          <Copy size={14} className="text-gray-500" />
                          <span>Copy message</span>
                        </button>
                      ) : (
                        /* Show normal action buttons */
                        <>
                          <button
                            onClick={() => handleCopyMessage(message.content, message.id)}
                            className={`p-1.5 rounded-md transition-all duration-200 ${
                              copiedMessageId === message.id
                                ? 'text-green-600 bg-green-100'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            }`}
                            title="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-double h-3 w-3" aria-hidden="true">
                                <path d="M18 6 7 17l-5-5"></path>
                                <path d="m22 10-7.5 7.5L13 16"></path>
                              </svg>
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                          <button
                            onClick={() => handleLikeMessage(message.id)}
                            className={`p-1.5 rounded-md transition-all duration-200 ${
                              likedMessageId === message.id
                                ? 'text-green-600 bg-green-100'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title="Good response"
                          >
                              <ThumbsUp size={12} />
                          </button>
                          <button
                            onClick={() => handleDislikeMessage(message.id)}
                            className={`p-1.5 rounded-md transition-all duration-200 ${
                              dislikedMessageId === message.id
                                ? 'text-red-600 bg-red-100'
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title="Poor response"
                          >
                              <ThumbsDown size={12} />
                          </button>
                          <button
                            onClick={(e) => handleMoreMenuClick(e, message.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-all duration-200"
                            title="More options"
                          >
                            <MoreHorizontal size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 py-3 px-6">
                <span data-slot="avatar" className="relative flex size-8 shrink-0 overflow-hidden rounded-full h-8 w-8">
                  <span data-slot="avatar-fallback" className="flex size-full items-center justify-center rounded-full bg-blue-600">
                    <Bot size={12} className="text-white" />
                  </span>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm text-gray-900">AI Assistant</span>
                  </div>
                  <div className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: '#FEFEFE' }}>
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Matching Figma Design */}
      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gray-100 rounded-2xl border border-gray-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all duration-200">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search size={14} className="text-gray-400" />
            </div>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full pl-10 pr-14 py-2.5 bg-transparent border-none resize-none focus:outline-none text-gray-900 placeholder-gray-500 leading-relaxed"
              rows="1"
              style={{ minHeight: '44px', maxHeight: '160px', fontSize: '14px' }}
              maxLength={2000}
            />
            {isTyping ? (
              <button
                onClick={handlePause}
                className="absolute right-1.5 top-1/2 transform -translate-y-1/2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl opacity-70 hover:opacity-100"
                title="Pause AI response"
              >
                <Pause size={14} />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="absolute right-1.5 top-1/2 transform -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <Send size={14} />
              </button>
            )}
          </div>
          <div className="flex justify-between items-center mt-3 text-xs text-gray-500 px-2">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span className={inputValue.length > 1800 ? 'text-orange-500' : ''}>{inputValue.length}/2000</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;