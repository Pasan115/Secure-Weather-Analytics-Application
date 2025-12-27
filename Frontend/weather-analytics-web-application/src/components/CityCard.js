import React from 'react';
import './citycard.css';

export default function CityCard({ city, rank }) {
  const icon = city.weather?.[0]?.icon;
  const score = city.comfort ?? city.data?.comfort ?? 0;

  return (
    <div className="card" style={{ '--score': `${score}%` }}>
      <div className="card-header">
        <div className="city-info">
          <h3 className="city-name">{city.name || city.data?.name || 'Unknown'}</h3>
          <div className="city-sub">{city.weather?.[0]?.description || city.data?.weather?.[0]?.description || '—'}</div>
        </div>
        <div className="rank-badge">{rank}</div>
      </div>

      <div className="card-body">
        <div className="temp-block">
          <div>
            <div className="temp">{Math.round((city.main?.temp ?? city.data?.main?.temp) || 0)}°C</div>
            <div className="small">Feels like {Math.round((city.main?.feels_like ?? city.data?.main?.feels_like) || 0)}°C</div>
          </div>
        </div>

        <div className="score-block">
          <div className="score-label">Comfort Score</div>
          <div className="score-value">{score}</div>
          <div className="score-bar"><div className="fill" /></div>
        </div>
      </div>

      <div className="card-footer">
        <div className="footer-left">Humidity: {city.main?.humidity ?? city.data?.main?.humidity ?? '—'}%</div>
        <div className="footer-right">Status: {city.weather?.[0]?.main ?? city.data?.weather?.[0]?.main ?? '—'}</div>
      </div>
    </div>
  );
}
