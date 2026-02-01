require('dotenv').config();
const pool = require('../db');  
const express = require('express');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());
const path = require('path');
app.use(express.static(path.join(__dirname, '../client')));
function mustenv(name) {
    if (!process.env[name]) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return process.env[name];
}

const weatherAPI = mustenv('WEATHER_API_KEY');
const locationAPI = mustenv('GEOCODE_API_KEY');
const parkAPI = mustenv('PARK_API_KEY');
const movieAPI = mustenv('MOVIES_API_KEY');
// Query parameter routes (from your code)
app.get('/weather/', async (req, res) => {
    const city = req.query.search_query;
    if (!city) {
        res.status(400).json({ error: 'City is required' });
        return;
    }
    const weatherdb = await pool.query('SELECT * FROM weather WHERE provider = $1 and city = $2', ['weatherbit', city]);
    if (weatherdb.rows.length > 0) {
        return res.json(weatherdb.rows[0].data);
       
    }
    const weather = await fetch(`https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&key=${weatherAPI}`);
    //check if the weather is found
    if (weather.status !== 200) {
        res.status(404).json({ error: 'Weather not found' });
        return;
    }
    
    //return the weather data in the format of the weather.json file
    const weatherData = await weather.json();
    formattedWeatherData = weatherData.data.map(item => ({
        "date": item.valid_date,
        "forecast": item.weather.description,
    }));
    await pool.query('INSERT INTO weather (provider, city, country_code, data) VALUES ($1, $2, $3, $4)', ['weatherbit', city, weatherData.country_code,JSON.stringify(formattedWeatherData)]);
    return res.json(formattedWeatherData);
});

app.get('/location/', async (req, res) => {
    const { city } = req.query;
        if (!city) {
        res.status(400).json({ error: 'City is required' });
        return;
    }
    const locationdb = await pool.query('SELECT * FROM location WHERE provider = $1 and search_query = $2', ['locationiq', city]);
    if (locationdb.rows.length > 0) {
        return res.json(locationdb.rows[0].data);
    }
    
    const location = await fetch(`https://us1.locationiq.com/v1/search?key=${locationAPI}&q=${city}&format=json`);
    //check if the location is found
    if (location.status !== 200) {
        res.status(404).json({ error: 'Location not found' });
        return;
    }
    //return the location data in the format of the location.json file
    const locationData = await location.json();
    if (locationData.length === 0) {
        res.status(404).json({ error: 'Location not found' });
        return;
    }
    const formattedLocationData = {
        "city": locationData[0].display_name,
        "latitude": locationData[0].lat,
        "longitude": locationData[0].lon,
        "formatted_query": locationData[0].display_name,
        "search_query": city,
    };
    await pool.query('INSERT INTO location (provider, search_query, data) VALUES ($1, $2, $3) ON CONFLICT (provider, search_query) DO NOTHING', ['locationiq', city,JSON.stringify(formattedLocationData)]);
    return res.json(formattedLocationData);
});

app.get('/parks/', async (req, res) => {
    const search_query = req.query.search_query;
    if (!search_query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
    }
    const parksdb = await pool.query('SELECT * FROM parks WHERE provider = $1 and search_query = $2', ['nps', search_query]);
    if (parksdb.rows.length > 0) {
        return res.json(parksdb.rows[0].data);
    }
    const parks = await fetch(`https://developer.nps.gov/api/v1/parks?q=${search_query}&api_key=${parkAPI}`);
    //error handling
    if (!parks.ok) {
        res.status(404).json({ error: 'Parks not found' });
        return;
    }
    const parksData = await parks.json();
    if (parksData.data.length === 0) {
        res.status(404).json({ error: 'Parks not found' });
        return;
    }
   const formattedParksData =parksData.data.map(park => ({
        "search_query": search_query,
        "name": park.fullName,
        "address": park.addresses[0].line1,
        "fee": park.entranceFees.length > 0 ? park.entranceFees[0].cost : 'Free',
        "description": park.description,
        "url": park.url
    }));
    await pool.query(
        'INSERT INTO parks (provider,search_query, data) VALUES ($1, $2, $3) ON CONFLICT (provider, search_query) DO NOTHING',
        ['nps', search_query,JSON.stringify(formattedParksData)]
    );
    return res.json(formattedParksData);
});

app.get('/movies/', async (req, res) => {
    const search_query = req.query.search_query;
    if (!search_query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
    }
    const moviesdb = await pool.query('SELECT * FROM movies WHERE provider = $1 and search_query = $2', ['themoviedb', search_query]);
    if (moviesdb.rows.length > 0) {
        return res.json(moviesdb.rows[0].data);
    }
    const movies = await fetch(`https://api.themoviedb.org/3/search/movie?query=${search_query}&api_key=${movieAPI}`);
    if (movies.status !== 200) {
        res.status(404).json({ error: 'Movies not found' });
        return;
    }
    const moviesData = await movies.json(); 
    const formattedMoviesData = moviesData.results.map(movie => ({
        "title": movie.title,
        "overview": movie.overview,
        "average_votes": movie.vote_average,
        "total_votes": movie.vote_count,
        "image_url": `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
        "popularity": movie.popularity,
        "released_on": movie.release_date,
    }));
    await pool.query('INSERT INTO movies (provider, search_query, data) VALUES ($1, $2, $3) ON CONFLICT (provider, search_query) DO NOTHING', ['themoviedb', search_query,JSON.stringify(formattedMoviesData)]);
    return res.json(formattedMoviesData);
       
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});