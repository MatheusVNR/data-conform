import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Redirecionamento canônico: força qualquer acesso via subdomínio antigo (.onrender.com) para o domínio oficial
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  if (hostname.endsWith('.onrender.com')) {
    window.location.replace(`https://dataconform.com.br${window.location.pathname}${window.location.search}${window.location.hash}`);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

