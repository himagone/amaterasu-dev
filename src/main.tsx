// import { StrictMode } from 'react' // 地図ライブラリとの互換性のため一時的に無効化
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

createRoot(container).render(<App />);
