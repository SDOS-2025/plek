import React from 'react';
import Chatbot from '../components/chatbot/Chatbot';

const ChatPage = () => {
  return (
    <div className="chat-page">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6 text-center">Plek Assistant</h1>
        <p className="text-center text-gray-600 mb-8">
          Chat with our AI assistant to manage room bookings easily.
        </p>
        
        <div className="flex justify-center">
          <Chatbot />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;