import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './topnav.css';
import logo from '../Images/weather-analytics-logo-transparent.png';

export default function TopNav() {
  const { isLoading: authLoading, isAuthenticated, loginWithRedirect, logout, user } = useAuth0();
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('theme') === 'dark'; } catch (e) { return false; }
  });

  useEffect(() => {
    const cls = 'theme-dark';
    if (isDark) {
      document.documentElement.classList.add(cls);
      try { localStorage.setItem('theme','dark'); } catch (e) {}
    } else {
      document.documentElement.classList.remove(cls);
      try { localStorage.setItem('theme','light'); } catch (e) {}
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(v => !v);

  return (
    <header className="topnav-header">
      <nav className="topnav-nav">
        <div className="topnav-brand">
          <img src={logo} alt="logo" className="topnav-logo" />
            <p>Weather Analytics Dashboard</p>
        </div>

        <div className="topnav-actions">
          <button className="theme-toggle" aria-label="Toggle theme" title="Toggle theme" onClick={toggleTheme}>
            {isDark ? '☀︎' : '☾'}
          </button>

          {authLoading ? (
            <div className="checking-auth">Checking auth…</div>
          ) : isAuthenticated ? (
            <div className="topnav-user">
              <div>
                <div className="name">{user?.name || user?.nickname || user?.email}</div>
                <div className="email">{user?.email}</div>
              </div>
              <button className="topnav-btn topnav-logout" onClick={() => logout({ returnTo: window.location.origin })}>Logout</button>
            </div>
          ) : (
            <button className="topnav-btn topnav-login" onClick={() => loginWithRedirect({ audience: process.env.REACT_APP_AUTH0_AUDIENCE })}>Login</button>
          )}
        </div>
      </nav>
    </header>
  );
}
