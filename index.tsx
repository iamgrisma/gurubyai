import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('index.tsx is loading...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('FATAL: Could not find root element');
  document.body.innerHTML = '<h1 style="color: red;">Error: Root element not found</h1>';
  throw new Error("Could not find root element to mount to");
}

console.log('Root element found, creating React root...');

try {
  const root = ReactDOM.createRoot(rootElement);
  console.log('React root created, rendering App...');

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  console.log('App render called successfully');
} catch (error) {
  console.error('Error rendering app:', error);
  rootElement.innerHTML = `<div style="padding: 20px; color: red;">
    <h1>Application Error</h1>
    <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
    <pre>${error instanceof Error ? error.stack : ''}</pre>
  </div>`;
}