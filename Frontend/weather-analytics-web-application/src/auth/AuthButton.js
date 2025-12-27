import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export default function AuthButton() {
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();

  const domain = process.env.REACT_APP_AUTH0_DOMAIN;
  const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
  const audience = process.env.REACT_APP_AUTH0_AUDIENCE;

  const missingConfig = !domain || !clientId;

  if (isAuthenticated) {
    return (
      <button className="refresh" onClick={() => logout({ returnTo: window.location.origin })}>
        Logout ({user?.name?.split(' ')[0] || 'User'})
      </button>
    );
  }

  if (missingConfig) {
    return (
      <button
        className="refresh"
        onClick={() => alert('Auth0 not configured. Set REACT_APP_AUTH0_DOMAIN and REACT_APP_AUTH0_CLIENT_ID in the frontend .env and restart the dev server.')}
      >
        Login (Not configured)
      </button>
    );
  }

  return (
    <button className="refresh" onClick={() => loginWithRedirect({ authorizationParams: { audience } })}>
      Login
    </button>
  );
}
