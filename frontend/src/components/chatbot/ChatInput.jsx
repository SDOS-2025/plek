import React, { useState, useRef, useEffect } from 'react';

const ChatInput = ({ onSendMessage, disabled, pendingConfirmation }) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);
  
  // Focus the input field when the component loads
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // Focus the input field after a confirmation is requested
  useEffect(() => {
    if (pendingConfirmation) {
      inputRef.current?.focus();
    }
  }, [pendingConfirmation]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;
    
    onSendMessage(message);
    setMessage('');
  };
  
  return (
    <form className="chatbot-input" onSubmit={handleSubmit}>
      {pendingConfirmation && (
        <div className="pending-confirmation">
          <span>Please confirm with yes/no:</span>
        </div>
      )}
      
      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={pendingConfirmation ? "Type 'yes' or 'no'" : "Type your message..."}
        disabled={disabled}
      />
      
      <button type="submit" disabled={disabled || !message.trim()}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </form>
  );
};

export default ChatInput;