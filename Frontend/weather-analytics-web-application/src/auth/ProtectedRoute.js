import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export default function ProtectedRoute({ children }) {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();

  if (isLoading) return <div style={{padding:20}}>Loading...</div>;
  if (!isAuthenticated) {
    loginWithRedirect();
    return null;
  }
  return children;
}
