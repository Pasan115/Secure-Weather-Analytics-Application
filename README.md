# Secure-Weather-Analytics-Application
Secure Weather Analytics is a secure, full‑stack web application that collects, visualizes, and analyzes city weather data. The project pairs a React single‑page frontend (components include `WeatherDashboard`, `CityCard`, and auth helpers such as `AuthButton` and `ProtectedRoute`) with a lightweight Node.js/Express backend that serves city data (for example, `cities.json`). The app computes a user‑friendly "Comfort Index", presents responsive dashboards and city cards, and uses simple in‑memory caching for efficiency — it is intentionally designed for easy extension to persistent storage, richer analytics, and production authentication.


### 1) Setup instructions

- Prerequisites: Node.js 18+ and npm
- From the frontend folder:

```bash
cd Frontend/weather-analytics-web-application
npm install
npm start
```

- Backend (run in separate terminal):

```bash
cd Backend
npm install
npm run dev
```

- Environment variables (examples):
	- Backend `.env`: `OPENWEATHER_API_KEY=your_key_here`, `PORT=5000`, optional `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` for JWT validation
	- Frontend `.env`: `REACT_APP_AUTH0_DOMAIN=your-domain.auth0.com`, `REACT_APP_AUTH0_CLIENT_ID=...`, `REACT_APP_AUTH0_AUDIENCE=https://your-api-identifier`

Restart both servers after updating env files.

### 2) Comfort Index formula

The frontend displays a computed "Comfort Score" (0-100) per city derived from basic weather parameters returned by OpenWeatherMap. The implementation (in `WeatherDashboard.js`) follows this heuristic:

- Base score: 100 - 3 * |temperature - 22°C|
- Humidity adjustment:
	- if humidity greater than 60%: subtract (humidity - 60) * 0.6
	- if humidity less than 40%: subtract (40 - humidity) * 0.4
- Weather condition penalties/bonuses:
	- rain → -12
	- snow → -18
	- storm / thunder → -20
	- clear → +4
- Final score is clamped to the 0–100 range and rounded.

Example: temperature 25°C, humidity 70%, clear → base 91, humidity penalty 6, clear +4 → final ≈ 89

### 3) Reasoning behind variable weights

- Temperature: the multiplier 3 gives a moderate sensitivity so each °C away from 22 reduces comfort noticeably but not excessively. 22°C is chosen as a typical human comfort temperature.
- Humidity: small penalty factors (0.6 for excess humidity, 0.4 for dry) reflect that humidity affects comfort but usually less than temperature — excessive humidity feels worse than moderate dryness.
- Weather penalties: categorical adjustments are coarse-grained quick signals (rain, snow, storms produce a stronger negative effect). Clear skies give a small positive boost.

These weights are intentionally simple and interpretable for a lightweight dashboard — they are not a physiologically validated comfort model.

### 4) Trade-offs considered

- Simplicity vs accuracy: A compact formula keeps the UX snappy and explainable, but sacrifices scientific accuracy (no wind chill, no solar radiation, no clothing/activity context).
- Server vs client computation: The project computes comfort on the client for raw OpenWeather responses, while the backend can also return a precomputed comfort index. This gives flexibility but duplicates logic.
- Caching duration: short TTLs (5 minutes) improve freshness but increase upstream API calls. Longer TTLs reduce calls but may show stale conditions.

### 5) Cache design explanation

- Raw cache: the backend maintains a per-city raw response cache (in-memory Map) with timestamps. When data is requested and the cached entry is younger than the TTL (default 5 minutes), the backend returns the cached response instead of calling OpenWeatherMap.
- Processed cache: the backend also stores the processed comfort-indexed array (for the full city list) with its own TTL to speed up repeated requests to `/api/weather/comfortindex`.
- Cache rationale: in-memory cache is simple and effective for a single-instance demo. For production, replace this with a shared cache (Redis) so multiple backend instances can share entries and survive restarts.

### 6) Known limitations

- In-memory caching: not shared across processes and lost on restart.
- Comfort Index: heuristic only — missing wind, solar, clothing, activity, and acclimatization.
- API rate limits: OpenWeatherMap key is subject to limits; heavy usage should use caching or a paid plan.
- Single-region units: Temperatures are displayed from OpenWeatherMap units (Celsius by default) and unit conversions/localization are limited.
- Security: Auth0 JWT validation is optional and depends on correct env config; ensure `AUTH0_AUDIENCE` and allowed callback URLs are set in Auth0 dashboard.

