import React, { useState } from 'react';
import DrawingCanvas from './DrawingCanvas';

const DrawChallenge: React.FC = () => {
  const [currentChallenge, setCurrentChallenge] = useState<string | null>(null);
  
  const challenges = [
    { name: 'person', difficulty: 'easy' },
    { name: 'cat', difficulty: 'easy' },
    { name: 'house', difficulty: 'medium' },
    { name: 'tree', difficulty: 'easy' },
    { name: 'car', difficulty: 'medium' },
    { name: 'robot', difficulty: 'hard' },
    { name: 'butterfly', difficulty: 'medium' },
    { name: 'flowers', difficulty: 'medium' }
  ];
  
  // Get challenges by difficulty
  const easyPrompts = challenges.filter(c => c.difficulty === 'easy');
  const mediumPrompts = challenges.filter(c => c.difficulty === 'medium');
  const hardPrompts = challenges.filter(c => c.difficulty === 'hard');
  
  const startChallenge = (challenge: string) => {
    setCurrentChallenge(challenge);
  };
  
  if (currentChallenge) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-yellow-100 p-4 rounded-lg mb-4 flex items-center">
          <div className="bg-yellow-500 text-white p-2 rounded-full mr-3">
            <span role="img" aria-label="Challenge" className="text-xl">🎨</span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-yellow-800">Challenge: Draw a {currentChallenge}!</h3>
            <p className="text-yellow-700">Be creative and have fun! When you're done, click "Animate" to see your drawing come to life.</p>
          </div>
          <button 
            className="ml-auto bg-white text-yellow-600 px-3 py-1 rounded-md font-medium hover:bg-yellow-50"
            onClick={() => setCurrentChallenge(null)}
          >
            Cancel
          </button>
        </div>
        
        <DrawingCanvas />
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
      <div className="bg-green-100 p-6 rounded-lg challenge-card">
        <h3 className="font-bold text-xl text-green-800 mb-4">Easy Challenges</h3>
        <p className="text-green-700 mb-4">Perfect for beginners! Try these simple drawings.</p>
        <div className="grid grid-cols-2 gap-2">
          {easyPrompts.map((prompt) => (
            <button 
              key={prompt.name}
              className="bg-white text-green-600 py-2 px-3 rounded-md font-medium hover:bg-green-50 transition-colors"
              onClick={() => startChallenge(prompt.name)}
            >
              {prompt.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-blue-100 p-6 rounded-lg challenge-card">
        <h3 className="font-bold text-xl text-blue-800 mb-4">Medium Challenges</h3>
        <p className="text-blue-700 mb-4">Ready for something a bit harder? Try these!</p>
        <div className="grid grid-cols-2 gap-2">
          {mediumPrompts.map((prompt) => (
            <button 
              key={prompt.name}
              className="bg-white text-blue-600 py-2 px-3 rounded-md font-medium hover:bg-blue-50 transition-colors"
              onClick={() => startChallenge(prompt.name)}
            >
              {prompt.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="bg-purple-100 p-6 rounded-lg challenge-card">
        <h3 className="font-bold text-xl text-purple-800 mb-4">Hard Challenges</h3>
        <p className="text-purple-700 mb-4">For expert artists! These are tricky to draw.</p>
        <div className="grid grid-cols-2 gap-2">
          {hardPrompts.map((prompt) => (
            <button 
              key={prompt.name}
              className="bg-white text-purple-600 py-2 px-3 rounded-md font-medium hover:bg-purple-50 transition-colors"
              onClick={() => startChallenge(prompt.name)}
            >
              {prompt.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DrawChallenge;