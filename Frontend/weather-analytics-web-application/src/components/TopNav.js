import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './topnav.css';

export default function TopNav() {
  const { isLoading: authLoading, isAuthenticated, loginWithRedirect, logout, user } = useAuth0();

  return (
    <header className="topnav-header">
      <nav className="topnav-nav">
        <div className="topnav-brand">
          <h1>Weather Analytics</h1>
        </div>

        <div className="topnav-actions">
          {authLoading ? (
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>Checking auth…</div>
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
