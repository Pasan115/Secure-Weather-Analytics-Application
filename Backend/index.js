const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

// Auth0 JWT validation
let checkJwt = null;
try {
  const { expressjwt: jwt } = require('express-jwt');
  const jwksRsa = require('jwks-rsa');
  if (process.env.AUTH0_DOMAIN && process.env.AUTH0_AUDIENCE) {
    checkJwt = jwt({
      secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
      }),
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256']
    });
  }
} catch (err) {
  console.warn('Auth middleware not configured (missing packages). To enable JWT validation install express-jwt and jwks-rsa.');
}

const app = express();
// Enable CORS for frontend (adjust or set FRONTEND_URL in .env)
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' || 'http://localhost:5173' }));
app.use(express.json());
const PORT = 5000;

// Load cities.json
const citiesFilePath = path.join(__dirname, "cities.json");

function getCityCodes() {
  // Read file
  const data = fs.readFileSync(citiesFilePath, "utf-8");

  // Parse JSON
  const cities = JSON.parse(data);

  // Extract CityCode values
  const cityCodes = cities.List
    .map(city => city.CityCode)
    .slice(0, 10); // Minimum 10 cities

  return cityCodes;
}

// Test function
const cityCodes = getCityCodes();
console.log("Extracted City Codes:", cityCodes);

// ---------------- Cache Setup ----------------
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const rawCache = new Map(); // cityId -> { data, expiresAt }
let rawCacheHits = 0;
let rawCacheMisses = 0;

const processedCache = {
  data: null,
  expiresAt: 0,
  hits: 0,
  misses: 0
};

async function fetchWeatherForCities() {
  const cityCodes = getCityCodes();
  const apiKey = process.env.OPENWEATHER_API_KEY;

  const now = Date.now();

  // Fetch in parallel but respect cache per-city
  const promises = cityCodes.map(async (cityId) => {
    const cached = rawCache.get(cityId);
    if (cached && cached.expiresAt > now) {
      rawCacheHits++;
      return cached.data;
    }

    rawCacheMisses++;
    const url = `https://api.openweathermap.org/data/2.5/weather?id=${cityId}&appid=${apiKey}&units=metric`;
    try {
      const response = await axios.get(url);
      const data = response.data;
      rawCache.set(cityId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    } catch (error) {
      console.error(`Failed to fetch weather for city ${cityId}:`, error.message);
      return null;
    }
  });

  const results = await Promise.all(promises);
  // filter out nulls (failed fetches)
  return results.filter(r => r !== null);
}

function calculateComfortIndex(weather) {
  let score = 0;

  const temp = weather.main.temp;        // °C
  const humidity = weather.main.humidity; // %
  const windSpeed = weather.wind.speed;   // m/s
  const cloudiness = weather.clouds.all;  // %

  // ---------------- Temperature (Max 40) ----------------
  if (temp >= 22 && temp <= 26) {
    score += 40;
  } else {
    const diff = temp < 22 ? 22 - temp : temp - 26;
    score += Math.max(0, 40 - diff * 4);
  }

  // ---------------- Humidity (Max 25) ----------------
  if (humidity >= 40 && humidity <= 60) {
    score += 25;
  } else {
    const diff = humidity < 40 ? 40 - humidity : humidity - 60;
    score += Math.max(0, 25 - diff * 1);
  }

  // ---------------- Wind Speed (Max 20) ----------------
  if (windSpeed >= 1 && windSpeed <= 5) {
    score += 20;
  } else if (windSpeed < 1) {
    score += Math.max(0, 20 - (1 - windSpeed) * 5);
  } else {
    score += Math.max(0, 20 - (windSpeed - 5) * 4);
  }

  // ---------------- Cloudiness (Max 15) ----------------
  if (cloudiness <= 50) {
    score += 15;
  } else {
    score += Math.max(0, 15 - (cloudiness - 50) * 0.3);
  }

  // Ensure score is within 0–100
  return Math.round(Math.min(100, score));
}



// ---------- API Endpoint ----------
app.get("/api/weather", async (req, res) => {
  try {
    // Optionally serve processed cache here or raw list
    const data = await fetchWeatherForCities();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching weather data" });
  }
});

// Middleware wrapper that enforces Auth0 JWT when configured
const requireAuthIfConfigured = (req, res, next) => {
  if (checkJwt) return checkJwt(req, res, next);
  return next();
};

app.get("/api/weather/comfortindex", requireAuthIfConfigured, async (req, res) => {
  try {
    const now = Date.now();
    // Return processed cache if valid
    if (processedCache.data && processedCache.expiresAt > now) {
      processedCache.hits++;
      return res.json(processedCache.data);
    }

    processedCache.misses++;
    const rawWeatherData = await fetchWeatherForCities();

    const processedData = rawWeatherData.map(city => ({
      city: city.name,
      temperature: city.main?.temp,
      humidity: city.main?.humidity,
      windSpeed: city.wind?.speed,
      weather: city.weather?.[0]?.description,
      comfortIndex: calculateComfortIndex(city)
    }));

    // Rank cities (Most Comfortable first)
    processedData.sort((a, b) => b.comfortIndex - a.comfortIndex);

    // Add ranking number
    processedData.forEach((city, index) => {
      city.rank = index + 1;
    });

    // Store processed cache
    processedCache.data = processedData;
    processedCache.expiresAt = Date.now() + CACHE_TTL_MS;

    res.json(processedData);

  } catch (error) {
    res.status(500).json({ message: "Error calculating comfort index" });
  }
});

// Cache debug endpoint
app.get('/api/cache-status', (req, res) => {
  const now = Date.now();
  res.json({
    rawCache: {
      keys: Array.from(rawCache.keys()),
      size: rawCache.size,
      hits: rawCacheHits,
      misses: rawCacheMisses,
      ttl_ms: CACHE_TTL_MS
    },
    processedCache: {
      hasData: !!processedCache.data,
      expiresAt: processedCache.expiresAt,
      isValid: processedCache.expiresAt > now,
      hits: processedCache.hits,
      misses: processedCache.misses
    }
  });
});


// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
  