import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Log startup
console.log('QuestKeeperAI Frontend initialized');
console.log('Backend API:', 'http://localhost:5001');
