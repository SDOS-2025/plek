  
import { useNavigate } from 'react-router-dom';




function LandingPage() {
  const navigate = useNavigate();
    return (
      <div className="min-h-screen bg-plek-background flex flex-col">
        {/* Header */}

        <header className="p-3 border-b border-gray-800 bg-[#1a1a1a] flex justify-start">
          <div className="container px-4">
            <h1 className="text-2xl font-bold text-white">Plek</h1>
          </div>
        </header>
  
        {/* Hero Section */}
        <main className="flex-grow w-full mx-auto px-4 py-32 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Effortless Room Booking for Everyone
          </h2>
          <p className="text-gray-300 mb-20">
            Find and book rooms instantly with real-time availability.
          </p>
  
          {/* Features Grid */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              {/* Real-time Booking Feature */}
              <div>
                <div className="mb-8 flex flex-col items-center">
                  <img 
                    src="https://cdn-icons-png.flaticon.com/512/5486/5486300.png"
                    alt="Real-time Booking"
                    className="w-24 h-24 mb-6"
                  />
                  <h3 className="text-2xl font-semibold mb-4">Real-time Booking</h3>
                  <p className="text-gray-400 max-w-sm mx-auto">
                    Instant access to available rooms and spaces, ensuring you never miss out on
                    the perfect fit.
                  </p>
                </div>
              </div>
  
              {/* Calendar Integration Feature */}
              <div>
                <div className="mb-8 flex flex-col items-center">
                  <img 
                    src="https://cdn-icons-png.flaticon.com/512/2693/2693507.png"
                    alt="Calendar Integration"
                    className="w-24 h-24 mb-6"
                  />
                  <h3 className="text-2xl font-semibold mb-4">Calendar Integration</h3>
                  <p className="text-gray-400 max-w-sm mx-auto">
                    Sync with your personal calendars for seamless scheduling and room
                    management.
                  </p>
                </div>
              </div>
            </div>
          </div>
  
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/signup')} className="bg-plek-purple hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-colors">
              Create an account
            </button>
            <button onClick={() => navigate('/login')} className="border border-plek-purple text-white hover:bg-plek-purple/10 font-bold py-3 px-8 rounded-lg transition-colors">
              Login
            </button>
          </div>
        </main>
  
        {/* Footer */}
        <footer className="border-t border-gray-800 bg-plek-dark">
          <div className="container mx-auto px-4 py-4">  
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">About us</a>
              <a href="#" className="hover:text-white transition-colors">Help Center</a>
              <a href="#" className="hover:text-white transition-colors">Contact us</a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  export default LandingPage;