import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Camera() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
      >
        <ArrowLeft size={20} />
        Back to Home
      </button>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Take a Selfie</h1>
        <div className="backdrop-blur-lg bg-white/5 rounded-2xl p-8 border border-gray-700">
          <p className="text-xl mb-8">Camera page content will go here</p>
        </div>
      </div>
    </div>
  );
}

export default Camera;
