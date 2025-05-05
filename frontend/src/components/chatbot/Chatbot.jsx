import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import './Chatbot.css';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message to the chatbot API
  const sendMessage = async (text) => {
    if (!text.trim()) return;

    // Add user message to chat
    const userMessage = { text, sender: 'user', timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    
    // Show loading state
    setLoading(true);

    try {
      // If we have a pending confirmation, handle it differently
      if (pendingConfirmation) {
        const res = await axios.put('/chatbot/', {
          confirm: text.toLowerCase().includes('yes'),
          message: text
        }, {
          withCredentials: true
        });

        // Clear pending confirmation
        setPendingConfirmation(null);
        
        // Add bot response to chat
        setMessages((prev) => [
          ...prev, 
          { 
            text: res.data.message, 
            sender: 'bot', 
            timestamp: new Date() 
          }
        ]);
      } else {
        // Regular message to the chatbot
        const res = await axios.post('/chatbot/', {
          message: text
        }, {
          withCredentials: true
        });

        // Check if we need confirmation
        if (res.data.requires_confirmation) {
          setPendingConfirmation({
            message: res.data.message,
            details: res.data.booking_details
          });
        }
        
        // Check if we need more parameters
        const missingParams = res.data.missing_parameters;
        
        // Add bot response to chat
        setMessages((prev) => [
          ...prev, 
          { 
            text: res.data.message, 
            sender: 'bot', 
            timestamp: new Date(),
            requiresConfirmation: res.data.requires_confirmation,
            missingParameters: missingParams
          }
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      setMessages((prev) => [
        ...prev, 
        { 
          text: `Sorry, an error occurred: ${error.response?.data?.detail || error.message}`, 
          sender: 'bot', 
          timestamp: new Date(),
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h2>Plek Chat Assistant</h2>
      </div>
      
      <div className="chatbot-messages">
        {messages.length === 0 ? (
          <div className="chatbot-welcome">
            <h3>Welcome to Plek Assistant!</h3>
            <p>How can I help you with room bookings today?</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <ChatMessage key={index} message={msg} />
          ))
        )}
        
        {loading && (
          <div className="bot-message loading">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput 
        onSendMessage={sendMessage} 
        disabled={loading} 
        pendingConfirmation={pendingConfirmation} 
      />
    </div>
  );
};

export default Chatbot;