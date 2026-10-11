require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const rapidApiKey = process.env.RAPIDAPI_KEY;
const rapidApiHost = process.env.RAPIDAPI_HOST;

app.get('/api/search', async (req, res) => {
    try {
        const searchQuery = req.query.query;
        if (!searchQuery) return res.status(400).json({ error: 'Missing search parameter (query)' });

        const options = {
            method: 'POST',
            url: `https://${rapidApiHost}/v1/places:searchText`,
            headers: {
                'x-rapidapi-key': rapidApiKey,
                'x-rapidapi-host': rapidApiHost,
                'Content-Type': 'application/json',
                'X-Goog-FieldMask': '*'
            },
            data: {
                textQuery: searchQuery,
                languageCode: 'vi', 
                maxResultCount: 5
            }
        };

        const response = await axios.request(options);
        res.json(response.data);
    } catch (error) {
        console.error("Route 1 Error:", error.message);
        res.status(500).json({ error: 'Error calling Place Search API' });
    }
});

app.get('/api/nearby', async (req, res) => {
    try {
        const locationName = req.query.locationName;
        let radius = parseFloat(req.query.radius) || 1000;
        if (radius > 50000) radius = 50000;
        if (radius < 100) radius = 100;
        const type = req.query.type ? req.query.type.trim() : null;

        if (!locationName) {
            return res.status(400).json({ error: 'Please provide a landmark name (locationName)' });
        }

        const searchCenterResponse = await axios.post(
            `https://${rapidApiHost}/v1/places:searchText`,
            {
                textQuery: locationName,
                languageCode: 'vi',
                maxResultCount: 1
            },
            {
                headers: {
                    'x-rapidapi-key': rapidApiKey,
                    'x-rapidapi-host': rapidApiHost,
                    'Content-Type': 'application/json',
                    'X-Goog-FieldMask': '*'
                }
            }
        );

        const centerPlace = searchCenterResponse.data.places?.[0];
        if (!centerPlace || !centerPlace.location) {
            return res.status(404).json({ error: `Coordinates not found for landmark: "${locationName}"` });
        }

        const lat = centerPlace.location.latitude;
        const lng = centerPlace.location.longitude;
        console.log(`[NEARBY] Landmark found: ${centerPlace.displayName?.text || centerPlace.name} (${lat}, ${lng})`);

        await new Promise(resolve => setTimeout(resolve, 1200));

        const dataPayload = {
            maxResultCount: 10,
            locationRestriction: {
                circle: {
                    center: { 
                        latitude: parseFloat(lat), 
                        longitude: parseFloat(lng) 
                    },
                    radius: parseFloat(radius)
                }
            }
        };

        if (type) {
            dataPayload.includedTypes = [type];
        }

        const nearbyResponse = await axios.post(
            `https://${rapidApiHost}/v1/places:searchNearby`,
            dataPayload,
            {
                headers: {
                    'x-rapidapi-key': rapidApiKey,
                    'x-rapidapi-host': rapidApiHost,
                    'Content-Type': 'application/json',
                    'X-Goog-FieldMask': '*'
                }
            }
        );

        res.json({
            originCenter: {
                name: centerPlace.displayName?.text || centerPlace.name,
                address: centerPlace.formattedAddress,
                latitude: lat,
                longitude: lng
            },
            places: nearbyResponse.data.places || []
        });

    } catch (error) {
        console.error("Route 2 Detailed Error:", error.response?.data || error.message);
        const errMsg = error.response?.data?.message || error.message || 'Error scanning nearby locations';
        res.status(500).json({ error: `API Error: ${errMsg}` });
    }
});

app.get('/api/details', async (req, res) => {
    try {
        const placeId = req.query.place_id;
        if (!placeId) return res.status(400).json({ error: 'Missing place_id parameter' });

        const options = {
            method: 'GET',
            url: `https://${rapidApiHost}/v1/places/${placeId}`, 
            headers: {
                'x-rapidapi-key': rapidApiKey,
                'x-rapidapi-host': rapidApiHost,
                'X-Goog-FieldMask': '*'
            }
        };

        const response = await axios.request(options);
        res.json(response.data);
    } catch (error) {
        console.error("Route 3 Error:", error.message);
        res.status(500).json({ error: 'Error fetching place details' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Backend Server (RapidAPI Version) is running at: http://localhost:${PORT}`);
    console.log(`👉 Test Route 1: http://localhost:${PORT}/api/search?query=Dai+Hoc+Ton+Duc+Thang`);
    console.log(`👉 Test Route 2: http://localhost:${PORT}/api/nearby`);
});