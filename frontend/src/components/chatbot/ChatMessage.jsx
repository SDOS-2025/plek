import React from 'react';

const ChatMessage = ({ message }) => {
  const { text, sender, timestamp, isError, requiresConfirmation, missingParameters } = message;
  
  // Format the timestamp
  const formattedTime = timestamp 
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  
  return (
    <div className={`chat-message ${sender}-message ${isError ? 'error' : ''}`}>
      <div className="message-content">
        {/* Render text content */}
        <div className="message-text">{text}</div>
        
        {/* Render confirmation UI */}
        {requiresConfirmation && (
          <div className="confirmation-request">
            <p>Type "yes" to confirm or "no" to cancel.</p>
          </div>
        )}
        
        {/* Message timestamp */}
        <div className="message-time">{formattedTime}</div>
      </div>
    </div>
  );
};

export default ChatMessage;