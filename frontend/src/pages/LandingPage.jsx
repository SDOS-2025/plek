import { useNavigate, Link } from 'react-router-dom';
import Footer from "../components/Footer";

function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="page-container">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-plek-dark bg-opacity-95 shadow-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-plek-purple">Plek</h1>
            </div>
            <div>
              <button 
                onClick={() => navigate('/login')}
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Login
              </button>
              <button 
                onClick={() => navigate('/signup')}
                className="bg-plek-purple hover:bg-purple-700 text-white px-4 py-2 ml-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign up
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="main-content text-center py-24 flex flex-col items-center">
        <div className="max-w-5xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Effortless Room Booking for Everyone
          </h2>
          <p className="text-gray-300 text-xl mb-12 max-w-3xl mx-auto">
            Find and book rooms instantly with real-time availability.
          </p>

          {/* CTA Buttons for larger displays */}
          <div className="hidden sm:flex gap-4 justify-center mb-16">
            <button 
              onClick={() => navigate('/signup')} 
              className="bg-plek-purple hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              Create an account
            </button>
            <button 
              onClick={() => navigate('/login')} 
              className="border border-plek-purple text-white hover:bg-plek-purple/10 font-bold py-3 px-8 rounded-lg transition-colors"
            >
              Login
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="section-card max-w-6xl mx-auto mb-16">
          <h3 className="card-header text-center mb-10">Key Features</h3>
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Real-time Booking Feature */}
            <div className="bg-plek-lightgray/30 p-6 rounded-lg">
              <div className="flex flex-col items-center">
                <div className="bg-plek-purple/20 p-4 rounded-full mb-6">
                  <img 
                    src="https://cdn-icons-png.flaticon.com/512/5486/5486300.png"
                    alt="Real-time Booking"
                    className="w-16 h-16"
                  />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Real-time Booking</h3>
                <p className="text-gray-400 max-w-sm mx-auto">
                  Instant access to available rooms and spaces, ensuring you never miss out on
                  the perfect fit.
                </p>
              </div>
            </div>

            {/* Calendar Integration Feature */}
            <div className="bg-plek-lightgray/30 p-6 rounded-lg">
              <div className="flex flex-col items-center">
                <div className="bg-plek-purple/20 p-4 rounded-full mb-6">
                  <img 
                    src="https://cdn-icons-png.flaticon.com/512/2693/2693507.png"
                    alt="Calendar Integration"
                    className="w-16 h-16"
                  />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Calendar Integration</h3>
                <p className="text-gray-400 max-w-sm mx-auto">
                  Sync with your personal calendars for seamless scheduling and room
                  management.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Buttons for mobile */}
        <div className="sm:hidden flex flex-col gap-4 justify-center px-6 w-full">
          <button 
            onClick={() => navigate('/signup')} 
            className="bg-plek-purple hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Create an account
          </button>
          <button 
            onClick={() => navigate('/login')} 
            className="border border-plek-purple text-white hover:bg-plek-purple/10 font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Login
          </button>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default LandingPage;