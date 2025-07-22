// pages/ChatbotPage.js
import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Layout/Header';
import Footer from '../components/Layout/Footer';
import './ChatbotPage.css';

const ChatbotPage = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch expense summary on component mount
  useEffect(() => {
    fetchExpenseSummary();
    // Add welcome message
    setMessages([
      {
        id: 1,
        text: "Hello! I'm your expense tracking assistant. I can help you analyze your spending, answer questions about your finances, and provide financial advice based on your data. What would you like to know?",
        sender: 'bot',
        timestamp: new Date()
      }
    ]);
  }, []);

  const fetchExpenseSummary = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const response = await fetch('/api/v1/chatbot/summary', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExpenseSummary(data.data);
      }
    } catch (error) {
      console.error('Error fetching expense summary:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const response = await fetch('/api/v1/chatbot/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: inputMessage })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add bot response
        const botMessage = {
          id: Date.now() + 1,
          text: data.data.aiResponse,
          sender: 'bot',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const quickQuestions = [
    "What's my current balance?",
    "Show me my spending by category",
    "What are my recent transactions?",
    "Give me financial advice",
    "How much did I spend this month?",
    "What's my highest expense category?"
  ];

  return (
    <div className="chatbot-page">
      <Header />
      <div className="chatbot-container">
        <div className="chatbot-header">
          <h2>💬 Expense Tracker Assistant</h2>
          <p>Ask me anything about your finances!</p>
        </div>
        
        {/* Quick Questions */}
        <div className="quick-questions">
          <h4>Quick Questions:</h4>
          <div className="question-buttons">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                className="question-btn"
                onClick={() => setInputMessage(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="chat-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
            >
              <div className="message-content">
                <p>{message.text}</p>
                <span className="message-time">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message bot-message">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          <div className="input-container">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your expenses..."
              rows="2"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="send-button"
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ChatbotPage;