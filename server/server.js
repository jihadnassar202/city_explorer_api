const dotenv = require('dotenv').config();
const express = require('express');
const fs = require('fs');
const app = express();
const location = require('../data/location.json');
const weather = require('../data/weather.json');
const cors = require('cors');
const PORT = process.env.PORT || 3000;
app.use(cors());

function locationData(display_name, lat, lon) {
    this.display_name = display_name;
    this.lat = lat;
    this.lon = lon;
}

app.get('/', function (req, res) {
    res.end('This is a city explorer API');
});
function weatherData(city_name, country_code, date, low_temp, high_temp) {
    this.city_name = city_name;
    this.country_code = country_code;
    this.high_temp = high_temp;
    this.low_temp = low_temp;
    this.date = date;
}
app.get('/weather/:city_name', function (req, res) {
    const { city_name } = req.params;
    if (weather.city_name.toLowerCase() === city_name.toLowerCase()) {
        return res.json({
            "city": weather.city_name,
            "country_code": weather.country_code,
            "data": weather.data.map(item => ({
                "date": item.valid_date,
                "low_temp": item.low_temp,
                "high_temp": item.high_temp
            }))
        });
    } else {
        return res.status(404).json({ error: `Weather for ${city_name} not found` });
    }
});

app.get('/location/:display_name', function (req, res) {
    const { display_name } = req.params;
    const locationData = location.find(item => item.display_name.toLowerCase() === display_name.toLowerCase() && item.lat && item.lon);
    if (locationData) {
        return res.json({
            "city": locationData.display_name,
            "latitude": locationData.lat,
            "longitude": locationData.lon
        });
    } else {
        return res.status(404).end('Location not found');
    }
});

app.listen(`${PORT}`, function () {
    console.log(`Server is running on port ${PORT}`);
});


