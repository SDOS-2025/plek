import React, { use, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import bcrypt from 'bcryptjs';




export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');



  const salt = bcrypt.genSaltSync(10)

  function makePostRequest(url) {
    const hashedPassword = bcrypt.hashSync(password, salt)

    const queryObj = {email, password: hashedPassword}

    axios.post(url, queryObj).then(
      (response) => {
          let result = response.data;
          return result;
      },
      (error) => {
          console.log(error);
          return null;
      }
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      const data = { email, password };
      
      // if (makePostRequest('http://localhost:5173/api/auth/login', data)) {
      //   setFirstName(result.firstName);
      //   navigate('/dashboard', { state: { firstName } });
      // } else {
      //   console.error('Invalid email or password');
      //   navigate('/login');
      // }
      localStorage.setItem('FirstName', 'firstName');
      navigate('/dashboard');
    } else {
      console.error('Email and password are required');
    }
  };

  return (
    <div className="min-h-screen bg-plek-background flex flex-col">
      <div className="flex-grow flex flex-col items-center p-32">
        <div className="w-full max-w-md">
          <div className="mb-32 flex justify-center">
            <h1 className="text-6xl font-bold text-white">Plek</h1>
          </div>
          
          <div className="bg-plek-dark p-8 rounded-lg shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email"
                  className="w-full p-3 rounded bg-[#2a2a2a] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                  required
                />
              </div>
              
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  className="w-full p-3 rounded bg-[#2a2a2a] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-plek-purple"
                  required
                />
              </div>

              <div className="text-right">
                <Link to="/forgot-password" className="text-sm text-plek-purple hover:text-purple-400">
                  forgot your password?
                </Link>
              </div>

              <button
                type="submit"
                className="w-full bg-plek-purple hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition-colors"
              >
                Login
              </button>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-4 rounded transition-colors"
              >
                <img src="https://www.google.com/favicon.ico" alt="" className="w-4 h-4" />
                Sign in with Google
              </button>
            </form>
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-800 bg-plek-dark">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-center space-x-6 text-sm text-gray-400">
            <Link to="/about" className="hover:text-white transition-colors">About us</Link>
            <Link to="/help" className="hover:text-white transition-colors">Help Center</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}