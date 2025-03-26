import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, ArrowLeft } from 'lucide-react';
import { getGeminiResponse } from '../services/gemini';

interface Message {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export function AIChatBot() {
  const [isVisible, setIsVisible] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'bot',
      content: 'Hello! How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const aiResponse = await getGeminiResponse(inputMessage.trim());
      const botMessage: Message = {
        type: 'bot',
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        type: 'bot',
        content: 'Hello! How can I help you today?',
        timestamp: new Date(),
      },
    ]);
    setInputMessage('');
    setIsTyping(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsVisible(false);
    setMessages([
      {
        type: 'bot',
        content: 'Hello! How can I help you today?',
        timestamp: new Date(),
      },
    ]);
    setInputMessage('');
    setIsTyping(false);
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110 flex items-center gap-2"
      >
        <MessageSquare size={24} />
        <span>Reopen Chat</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex flex-row-reverse gap-2 items-center">
        {!isOpen ? (
          <>
            <button
              onClick={() => setIsOpen(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110 flex items-center gap-2"
            >
              <MessageSquare size={24} />
              <span>Chat with AI</span>
            </button>
            <button
              onClick={handleClose}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg transition-all duration-200"
              title="Close chatbot"
            >
              <X size={20} />
            </button>
          </>
        ) : (
          <div className="bg-gray-900 rounded-lg shadow-xl w-80 sm:w-96 max-h-[600px] flex flex-col border border-gray-700 animate-slide-in">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-lg">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Reset conversation"
                >
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-lg font-semibold">AI Assistant</h3>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors"
                title="Close chat"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className="text-xs opacity-50 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 text-white rounded-lg p-3">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-700">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 transition-colors"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 