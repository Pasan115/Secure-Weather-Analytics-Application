import React, { useEffect, useState, useMemo } from 'react';
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
  // Sorting & filtering state
  const [filterText, setFilterText] = useState('');
  const [weatherFilter, setWeatherFilter] = useState('All');
  const [sortField, setSortField] = useState('comfort');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

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

        // sort by comfort desc initially
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

  // Compute displayed list (filtering + sorting) with useMemo unconditionally
  const displayedList = useMemo(() => {
    const q = (filterText || '').trim().toLowerCase();
    let list = Array.isArray(data) ? data.slice() : [];
    if (q) {
      list = list.filter(d => (d.name || '').toLowerCase().includes(q));
    }
    if (weatherFilter && weatherFilter !== 'All') {
      list = list.filter(d => {
        const w = (d.weather && d.weather[0] && (d.weather[0].main || d.weather[0].description)) || '';
        return w.toLowerCase().includes(weatherFilter.toLowerCase());
      });
    }

    const compare = (a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'comfort') return dir * ((a.comfort ?? 0) - (b.comfort ?? 0));
      if (sortField === 'temperature') return dir * (((a.main && a.main.temp) ?? 0) - ((b.main && b.main.temp) ?? 0));
      if (sortField === 'humidity') return dir * (((a.main && a.main.humidity) ?? 0) - ((b.main && b.main.humidity) ?? 0));
      if (sortField === 'name') return dir * ((a.name || '').localeCompare(b.name || ''));
      return 0;
    };

    list.sort(compare);
    return list.map((city, idx) => (
      <CityCard key={city.id || city.cityId || idx} city={city} rank={city.rank} />
    ));
  }, [data, filterText, weatherFilter, sortField, sortOrder]);
  return (
    <>
    <div className='header-top'>
        <TopNav />
    </div>
    <div className="dashboard-root">
        <div className='content-top' style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <p className="topnav-subtitle" style={{ margin: 0 }}>Top 10 Comfort rankings for monitored cities</p>
            <input
              aria-label="Search city"
              placeholder="Search city"
              className="control-input"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e6eef0' }}
            />

            <select className="control-select" value={weatherFilter} onChange={e => setWeatherFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8 }}>
              <option>All</option>
              <option>Clear</option>
              <option>Broken</option>
              <option>Few</option>
              <option>Scattered</option>
              <option>Overcast</option>
              <option>Haze</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 13, color: '#445' }}>Sort:</label>
            <select value={sortField} onChange={e => setSortField(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8 }}>
              <option value="comfort">Comfort</option>
              <option value="temperature">Temperature</option>
              <option value="humidity">Humidity</option>
              <option value="name">Name</option>
            </select>
            <button className="control-btn" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} style={{ padding: '8px 12px', borderRadius: 8 }}>
              {sortOrder === 'asc' ? 'Asc' : 'Desc'}
            </button>
            <button className="topnav-btn topnav-refresh" onClick={() => window.location.reload()}>Refresh</button>
          </div>
        </div>
        
      {loading && <div className="loader">Loading weather data…</div>}
      {error && <div className="error">Error: {error}</div>}

      {!loading && !error && (
        <div className="grid">
          {displayedList}
        </div>
      )}

      <footer className="dash-footer">Data provided by OpenWeatherMap</footer>
    </div>
    </>
  );
}
