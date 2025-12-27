import React, { useEffect, useState } from 'react';
import CityCard from './CityCard';
import '../styles.css';
import { useAuth0 } from '@auth0/auth0-react';
import TopNav from './TopNav';

function computeComfort(main, weather) {
  if (!main) return 0;
  const temp = main.temp ?? 22;
  const humidity = main.humidity ?? 50;
  // Base score: peak comfort at 22°C
  let score = 100 - Math.abs(temp - 22) * 3;
  // Humidity penalty: ideal 40-60
  if (humidity > 60) score -= (humidity - 60) * 0.6;
  if (humidity < 40) score -= (40 - humidity) * 0.4;
  // Weather penalties
  const desc = (weather?.[0]?.main || '').toLowerCase();
  if (desc.includes('rain')) score -= 12;
  if (desc.includes('snow')) score -= 18;
  if (desc.includes('storm') || desc.includes('thunder')) score -= 20;
  if (desc.includes('clear')) score += 4;
  // Clamp
  score = Math.round(Math.max(0, Math.min(100, score)));
  return score;
}

export default function WeatherDashboard() {
  const { isLoading: authLoading, isAuthenticated, loginWithRedirect, getAccessTokenSilently } = useAuth0();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      // Require authentication to load data
      if (authLoading) return;
      if (!isAuthenticated) {
        await loginWithRedirect();
        return;
      }
      setLoading(true);
      try {
        // Acquire access token and include in request if available
        let token = null;
        try {
          token = await getAccessTokenSilently({ audience: process.env.REACT_APP_AUTH0_AUDIENCE });
        } catch (tErr) {
          console.warn('getAccessTokenSilently failed:', tErr.message || tErr);
        }

        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch('http://localhost:5000/api/weather/comfortindex', { headers });
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to fetch: ${res.status} ${text}`);
        }
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error(`Expected JSON but received ${contentType}: ${text.slice(0,200)}`);
        }
        const json = await res.json();

        // Normalize backend responses to a consistent shape
        const augmented = json.map(item => {
          // If backend returned precomputed comfortIndex (from /comfortindex)
          if (item && (item.comfortIndex !== undefined || item.comfortIndex === 0)) {
            const main = {
              temp: item.temperature,
              humidity: item.humidity,
              feels_like: item.feelsLike ?? item.temperature
            };
            const weatherDesc = typeof item.weather === 'string' ? item.weather : (item.weather?.description || '');
            const weather = [{ main: weatherDesc.split(' ')[0] || weatherDesc, description: weatherDesc }];
            const name = item.city || item.cityName || item.city || 'Unknown';
            const comfort = item.comfortIndex;
            return { ...item, main, weather, name, comfort };
          }

          // Otherwise assume raw OpenWeatherMap objects
          const main = item.main || (item.data && item.data.main) || item;
          const weather = item.weather || (item.data && item.data.weather) || item;
          const name = item.name || (item.data && item.data.name) || (item.cityName) || '';
          const comfort = computeComfort(main, weather);
          return { ...item, main, weather, name, comfort };
        });

        // sort by comfort desc
        augmented.sort((a, b) => (b.comfort ?? 0) - (a.comfort ?? 0));
        // add rank
        const withRank = augmented.map((c, i) => ({ ...c, rank: i + 1 }));

        if (mounted) setData(withRank);
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [authLoading, isAuthenticated, loginWithRedirect, getAccessTokenSilently]);

  // TopNav component handles header UI (login/logout, user display, refresh)

  return (
    <>
    <div className='header-top'>
        <TopNav />
    </div>
    <div className="dashboard-root">
        <div className='content-top'>
        <p className="topnav-subtitle">Top 10 Comfort rankings for monitored cities</p>
        <button className="topnav-btn topnav-refresh" onClick={() => window.location.reload()}>Refresh</button>
        </div>
        
      {loading && <div className="loader">Loading weather data…</div>}
      {error && <div className="error">Error: {error}</div>}

      {!loading && !error && (
        <div className="grid">
          {data.map((city, idx) => (
            <CityCard key={city.id || city.cityId || idx} city={city} rank={city.rank} />
          ))}
        </div>
      )}

      <footer className="dash-footer">Data provided by OpenWeatherMap</footer>
    </div>
    </>
  );
}
