require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function connectToDatabase() {
    try {
        await pool.query('select 1');
        console.log('Connected to the database');
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
}
connectToDatabase();
const express = require('express');
const fs = require('fs');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());
const redis = require('redis');
const redisClient = redis.createClient();
redisClient.connect().catch(console.error);
const DEFAULT_EXPIRATION = 60 * 60 * 24;

function mustenv(name) {
    if (!process.env[name]) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return process.env[name];
}

const weatherAPI = mustenv('WEATHER_API_KEY');
const locationAPI = mustenv('GEOCODE_API_KEY');
const parkAPI = mustenv('PARK_API_KEY');

app.get('/weather/:city_name', async (req, res) => {
    const city_name = req.params.city_name.trim().toLowerCase();
    const weatherDB = await pool.query('select * from weather where provider = $1 and city = $2', ['weatherbit', city_name]);
    if (weatherDB.rows.length > 0) {
        return res.json(weatherDB.rows[0]);
    }
        const weather = await fetch(`https://api.weatherbit.io/v2.0/forecast/daily?city=${city_name}&key=${weatherAPI}`);
        if (weather.status !== 200) {
            res.status(404).json({ error: 'Weather not found' });
            return;
        }
        const weatherData = await weather.json();
        const formattedWeatherData = {
            "city": weatherData.city_name,
            "country_code": weatherData.country_code,
            "data": weatherData.data.map(item => ({
                "date": item.valid_date,
                "low_temp": item.low_temp,
                "high_temp": item.high_temp,
                "description": item.weather.description,
            }))
        }
        await pool.query('insert into weather (provider, city, country_code, data) values ($1, $2, $3, $4)', ['weatherbit', city_name, weatherData.country_code, JSON.stringify(formattedWeatherData)]);
        return res.json(formattedWeatherData);
    });

app.get('/location/:display_name', async (req, res) => {
    const { display_name } = req.params;
    const locationDB = await pool.query('select * from location where provider = $1 and display_name = $2', ['locationiq', display_name]);
    if (locationDB.rows.length > 0) {
        return res.json(locationDB.rows[0]);
    }
    const location = await fetch(`https://us1.locationiq.com/v1/search?key=${locationAPI}&q=${display_name}&format=json`);
    if (location.status !== 200) {
        res.status(404).json({ error: 'Location not found' });
        return;
    }
    const locationData = await location.json();
    await pool.query('insert into location (provider, display_name, lat, lon) values ($1, $2, $3, $4)', ['locationiq', display_name, locationData[0].lat, locationData[0].lon]);
    return res.json({
        "city": locationData[0].display_name,
        "latitude": locationData[0].lat,
        "longitude": locationData[0].lon,
    });
});

app.get('/parks/:state_code/', async (req, res) => {
    const { state_code } = req.params;
    const parksDB = await pool.query('select * from parks where provider = $1 and state_code = $2', ['nps', state_code]);
    if (parksDB.rows.length > 0) {
        return res.json(parksDB.rows[0]);
    }
    const parks = await fetch(`https://developer.nps.gov/api/v1/parks?stateCode=${state_code}&api_key=${parkAPI}`);
    //error handling
    if (parks.status !== 200) {
        res.status(404).json({ error: 'Parks not found' }); 
        return;
    }
    const parksData = await parks.json(); 
    for (const park of parksData.data) {
        await pool.query(
            `INSERT INTO parks (provider, name, address, cost, description, url) 
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (provider, url) DO NOTHING`,
            ['nps', park.fullName, park.addresses[0].line1, 
             park.cost, park.description, park.url]
        );
    }
      res.json({
        "data": parksData.data.map(park => ({
            "name": park.fullName,
            "address": park.addresses[0].line1,
            "cost": park.cost,
            "description": park.description,
            "url": park.url,
        }))
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

