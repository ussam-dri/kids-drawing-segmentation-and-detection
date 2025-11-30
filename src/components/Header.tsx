import React from 'react';
import { Sparkles } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-purple-600 to-pink-500 text-white py-3 px-4 shadow-md">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Sparkles size={32} className="mr-2 text-yellow-300" />
          <h1 className="text-2xl font-bold">Animate My Drawing</h1>
        </div>
        
        <div>
          <button className="py-2 px-4 bg-white text-purple-600 rounded-full font-bold hover:bg-purple-100 transition-colors">
            Help
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;