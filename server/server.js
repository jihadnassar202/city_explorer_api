require('dotenv').config();
const express = require('express');
const fs = require('fs');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());

//WeatherAPI class

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

    const { city_name } = req.params;
    const weather = await fetch(`https://api.weatherbit.io/v2.0/forecast/daily?city=${city_name}&key=${weatherAPI}`);
    //check if the weather is found
    if (weather.status !== 200) {
        res.status(404).json({ error: 'Weather not found' });
        return;
    }
    //return the weather data in the format of the weather.json file
    const weatherData = await weather.json();
    res.json({
        "city": weatherData.city_name,
        "country_code": weatherData.country_code,
        "data": weatherData.data.map(item => ({
            "date": item.valid_date,
            "low_temp": item.low_temp,
            "high_temp": item.high_temp,
            "description": item.weather.description,
        }))
    });

});
app.get('/location/:display_name', async (req, res) => {
    const { display_name } = req.params;
    const location = await fetch(`https://us1.locationiq.com/v1/search?key=${locationAPI}&q=${display_name}&format=json`);
    //check if the location is found
    if (location.status !== 200) {
        res.status(404).json({ error: 'Location not found' });
        return;
    }
    //return the location data in the format of the location.json file
    const locationData = await location.json();
    res.json({
        "city": locationData[0].display_name,
        "latitude": locationData[0].lat,
        "longitude": locationData[0].lon,
    });
});

app.get('/parks/:state_code/', async (req, res) => {
    const { state_code } = req.params;
    const parks = await fetch(`https://developer.nps.gov/api/v1/parks?stateCode=${state_code}&api_key=${parkAPI}`);
    //error handling
    if (parks.status !== 200) {
        res.status(404).json({ error: 'Parks not found' });
        return;
    }
    const parksData = await parks.json();
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

