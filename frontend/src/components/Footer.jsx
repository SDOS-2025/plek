import React from "react";
import { Link } from "react-router-dom";

function Footer({ includeYear = true }) {
  return (
    <footer className="border-t border-gray-800 bg-plek-dark">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {includeYear && (
            <p className="text-gray-400 text-sm">© 2025 Plek. All rights reserved.</p>
          )}
          <div className={`flex space-x-6 text-sm text-gray-400 ${includeYear ? 'mt-4 md:mt-0' : ''}`}>
            <Link to="/about" className="hover:text-white transition-colors">
              About us
            </Link>
            <Link to="/help" className="hover:text-white transition-colors">
              Help Center
            </Link>
            <Link to="/contact" className="hover:text-white transition-colors">
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;