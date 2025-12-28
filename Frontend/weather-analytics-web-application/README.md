# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

---

## Project README — Secure Weather Analytics (Frontend)

This README adds project-specific setup and design notes for the Secure Weather Analytics frontend and how it works together with the backend in this workspace.

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
node index.js    # or `npm start` if configured
```

- Environment variables (examples):
	- Backend `.env`: `OPENWEATHER_API_KEY=your_key_here`, `PORT=5000`, optional `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` for JWT validation
	- Frontend `.env`: `REACT_APP_AUTH0_DOMAIN=your-domain.auth0.com`, `REACT_APP_AUTH0_CLIENT_ID=...`, `REACT_APP_AUTH0_AUDIENCE=https://your-api-identifier`

Restart both servers after updating env files.

### 2) Comfort Index formula

The frontend displays a computed "Comfort Score" (0-100) per city derived from basic weather parameters returned by OpenWeatherMap. The implementation (in `WeatherDashboard.js`) follows this heuristic:

- Base score: 100 - 3 * |temperature - 22°C|
- Humidity adjustment:
	- if humidity &gt; 60%: subtract (humidity - 60) * 0.6
	- if humidity &lt; 40%: subtract (40 - humidity) * 0.4
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

---

If you want, I can also:
- Move the Comfort Index computation to a shared module so frontend/backend use identical logic.
- Add a README section showing example env files and the exact API endpoints.
- Add tests for the Comfort Index function.

