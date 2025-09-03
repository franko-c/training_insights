import React from 'react'
import ReactDOM from 'react-dom/client'
console.log('main.jsx loaded, about to mount React app');
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
