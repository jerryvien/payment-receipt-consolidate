import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import ClaimsListPage from './pages/ClaimsListPage';
import ClaimFormPage from './pages/ClaimFormPage';
import ClaimDetailPage from './pages/ClaimDetailPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <h1>DocVault</h1>
            <p>Receipt Claims</p>
          </div>
          <nav className="sidebar-nav">
            <NavLink to="/claims" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              All Claims
            </NavLink>
            <NavLink to="/claims/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              New Claim
            </NavLink>
          </nav>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/claims" replace />} />
            <Route path="/claims" element={<ClaimsListPage />} />
            <Route path="/claims/new" element={<ClaimFormPage />} />
            <Route path="/claims/:id/edit" element={<ClaimFormPage />} />
            <Route path="/claims/:id" element={<ClaimDetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
