import React, { useState, useEffect, useRef, useContext } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  RefreshCw,
  Trash2,
  Calendar,
  Clock,
  Users,
  Tag,
} from "lucide-react";
import { AuthContext } from "../../context/AuthProvider";
import api from "../../api";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";

function ChatBot() {
  const { user } = useContext(AuthContext);
  const defaultMessage = {
    id: 1,
    text: "Hello! I'm your Room Booking Assistant. How can I help you today?",
    sender: "bot",
    timestamp: new Date().toISOString(),
  };

  // Initialize messages from localStorage or use default welcome message
  const [messages, setMessages] = useState(() => {
    try {
      const savedMessages = localStorage.getItem("chatMessages");
      return savedMessages ? JSON.parse(savedMessages) : [defaultMessage];
    } catch (error) {
      console.error("Error loading chat history:", error);
      return [defaultMessage];
    }
  });

  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const messagesEndRef = useRef(null);

  // Save messages to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    } catch (error) {
      console.error("Error saving chat history:", error);
    }
  }, [messages]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  // Reset the chat to the initial state
  const handleResetChat = () => {
    setMessages([
      {
        ...defaultMessage,
        timestamp: new Date().toISOString(), // Update timestamp to now
      },
    ]);
    setInputValue("");
    setPendingConfirmation(null);
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      let response;
      
      // If we have a pending confirmation, handle it differently
      if (pendingConfirmation) {
        response = await api.put("/chatbot/", {
          confirm: inputValue.toLowerCase().includes('yes'),
          message: inputValue
        });
        
        // Clear pending confirmation
        setPendingConfirmation(null);
      } else {
        // Regular message to the chatbot
        response = await api.post("/chatbot/", {
          message: userMessage.text,
        });
        
        // Debug log to see what's coming back from the server
        console.log("Chatbot API response:", response.data);
        
        // Check if we need confirmation
        if (response.data.requires_confirmation) {
          setPendingConfirmation({
            message: response.data.message,
            details: response.data.booking_details
          });
        }
      }

      // Add bot response to chat
      const botMessage = {
        id: Date.now() + 1,
        text: response.data.message || "Sorry, I couldn't process your request. Please try again.",
        sender: "bot",
        timestamp: new Date().toISOString(),
        requiresConfirmation: response.data.requires_confirmation,
        bookingDetails: response.data.booking_details,
        bookingList: response.data.booking_list, // Store the booking list if provided
        action: response.data.action // Track special actions like booking cancellation or modification
      };

      // Debug log to help troubleshoot booking list display issues
      if (response.data.booking_list) {
        console.log("Booking list received:", response.data.booking_list);
        console.log("Action:", response.data.action);
      }

      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error("Error getting response from chatbot:", error);

      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        text: error.response?.data?.detail || "Sorry, I encountered an error. Please try again later.",
        sender: "bot",
        timestamp: new Date().toISOString(),
        isError: true,
      };

      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle booking selection directly
  const handleBookingSelection = (bookingId) => {
    // Create a message as if the user typed the booking number
    setInputValue(bookingId.toString());
    // Submit the form programmatically
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 100);
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Generate a human-readable representation of booking details
  const renderBookingDetails = (details) => {
    if (!details) return null;
    
    return (
      <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-600">
        <h4 className="font-medium text-sm text-gray-300 mb-2">Booking Details:</h4>
        <ul className="text-xs space-y-1 text-gray-400">
          {details.room_name && <li><span className="text-gray-300">Room:</span> {details.room_name}</li>}
          {details.date && <li><span className="text-gray-300">Date:</span> {details.date}</li>}
          {details.start_time && <li><span className="text-gray-300">Start:</span> {details.start_time}</li>}
          {details.end_time && <li><span className="text-gray-300">End:</span> {details.end_time}</li>}
          {details.purpose && <li><span className="text-gray-300">Purpose:</span> {details.purpose}</li>}
        </ul>
      </div>
    );
  };

  // Render a list of bookings for cancellation or modification
  const renderBookingList = (bookings, action) => {
    if (!bookings || bookings.length === 0) return null;
    
    // Set title based on action
    const title = action === 'list_bookings_for_modification' 
      ? "Select a booking to modify:"
      : "Select a booking to cancel:";
    
    return (
      <div className="mt-3">
        <p className="text-sm text-gray-300 mb-2">{title}</p>
        <div className="space-y-3">
          {bookings.map((booking, index) => (
            <div 
              key={booking.id} 
              className="p-3 bg-gray-800 rounded-lg border border-gray-600 hover:border-purple-500 cursor-pointer transition-all"
              onClick={() => handleBookingSelection(index + 1)}
            >
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-sm text-gray-200">
                  {index + 1}. {booking.room_name}
                </h4>
                <span className="text-xs bg-purple-900/50 px-2 py-1 rounded text-purple-200">
                  ID: {booking.id}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar size={12} className="text-gray-500" />
                  <span>{booking.date}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} className="text-gray-500" />
                  <span>{booking.start_time} - {booking.end_time}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Tag size={12} className="text-gray-500" />
                  <span>{booking.purpose}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Users size={12} className="text-gray-500" />
                  <span>{booking.participants}</span>
                </div>
              </div>
              
              <div className="mt-2 text-center">
                <button
                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-purple-800 rounded transition-colors text-gray-300 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBookingSelection(index + 1);
                  }}
                >
                  Select this booking
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Click on a booking or enter the booking number to select it
        </p>
      </div>
    );
  };

  return (
    <div className="page-container">
      <NavBar activePage="chatbot" />

      <div className="main-content">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-4 md:mb-0">
            Room Booking Assistant
          </h1>

          {/* Reset button */}
          <button
            onClick={handleResetChat}
            className="px-4 py-2 bg-gray-700 hover:bg-red-700 rounded-lg text-sm text-white transition-colors flex items-center"
            title="Reset conversation"
          >
            <Trash2 size={18} className="mr-2" />
            Reset Chat
          </button>
        </div>

        <div className="section-card">
          <div className="flex items-center mb-6">
            <Bot className="h-6 w-6 mr-2 text-purple-500" />
            <h2 className="text-xl font-medium">
              Chat with your intelligent booking assistant
            </h2>
          </div>

          {/* Chat container */}
          <div className="flex flex-col h-[60vh]">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto bg-gray-800 rounded-lg p-4 mb-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.sender === "user"
                          ? "bg-plek-purple text-white"
                          : message.isError
                          ? "bg-red-900/50 text-gray-100"
                          : "bg-gray-700 text-gray-100"
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      
                      {/* Render booking details if available */}
                      {message.bookingDetails && renderBookingDetails(message.bookingDetails)}
                      
                      {/* Render booking list if provided - support both cancellation and modification */}
                      {message.bookingList && 
                        (message.action === 'list_bookings_for_cancellation' || 
                        message.action === 'list_bookings_for_modification') && 
                        renderBookingList(message.bookingList, message.action)
                      }
                      
                      {/* Render confirmation UI */}
                      {message.requiresConfirmation && (
                        <div className="mt-3 p-2 bg-purple-900/40 rounded-lg border border-purple-500/30 text-purple-200">
                          <p className="text-xs">Please confirm this action by typing "yes" or "no".</p>
                        </div>
                      )}
                      
                      <p
                        className={`text-xs mt-2 ${
                          message.sender === "user"
                            ? "text-purple-200"
                            : "text-gray-400"
                        }`}
                      >
                        {formatTimestamp(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input area */}
            <form onSubmit={sendMessage} className="flex items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={pendingConfirmation ? "Type 'yes' or 'no'" : "Type your message..."}
                  className="w-full p-4 pl-5 pr-12 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:border-plek-purple text-white"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                className={`ml-3 p-4 rounded-lg transition-colors flex items-center justify-center ${
                  loading || !inputValue.trim()
                    ? "bg-gray-600"
                    : pendingConfirmation
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-plek-purple hover:bg-purple-700"
                }`}
                disabled={loading || !inputValue.trim()}
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin text-white" />
                ) : (
                  <Send size={20} className="text-white" />
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>
            The assistant can help you with finding and booking rooms, checking
            your reservations, and answering questions about the booking system.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default ChatBot;
