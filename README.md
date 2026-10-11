# SOA Logistics & Mapping Proxy Service

**Course:** KTHDV (Service-Oriented Architecture) - Seminar Project  
**Group:** 10  
**Group Code:** SOA.26-12  

This repository contains a Node.js/Express proxy microservice dedicated to handling location data, geocoding, and mapping intelligence via the Google Places API (routed through RapidAPI). It is designed to act as an independent middleware node in a Service-Oriented Architecture (SOA), completely decoupling external API interactions and credential management from frontend client applications.

## 1. Business Value (What problem does it solve?)
This microservice acts as a centralized engine for location intelligence within a Logistics or E-commerce ecosystem.
* **Decoupling:** Frontend and Mobile teams do not need to implement complex Google API integrations, coordinate geometry parsing, or rate-limiting logic in their core codebases.
* **Credential Security (Proxy Pattern):** Prevents API key theft by completely isolating the RapidAPI/Google credentials on the server side via environment variables (`.env`). The client never sees the actual API keys.
* **Interoperability:** Any internal system (e.g., Delivery Routing, Warehouse Management, Customer Apps) can integrate with it seamlessly via standard RESTful HTTP `GET` requests.

## 2. Core Architectural Use Cases
This service demonstrates three distinct architectural routing patterns:
1. **Place Search (Direct Query):** A stateless text-to-location mapping route that standardizes user input into normalized geographical data.
2. **Smart Nearby Scanning (Composite API Pattern):** Solves the issue of users not knowing exact GPS coordinates. The backend orchestrates two sequential API calls: it first translates a human-readable landmark (e.g., "Ben Thanh Market") into latitude/longitude, and then uses those coordinates to scan the surrounding radius.
3. **Business Intelligence (Detail Extraction):** Fetches deep operational data (operating hours, reviews, contact info) using a unique canonical `place_id`.

## 3. Enterprise Security & Optimization Implementations
This microservice goes beyond basic API calling by implementing production-grade gateway features:
* **Rate Limit Prevention (Throttling):** The free tier of RapidAPI restricts requests to 1 req/sec. The `Nearby Scanning` route implements an asynchronous `Promise/setTimeout` pause (1.2 seconds) between the geocoding and scanning steps to guarantee the service never crashes due to HTTP 429 (Too Many Requests) errors.
* **Cross-Origin Resource Sharing (CORS):** Fully configured to allow secure cross-domain requests from isolated frontend interfaces.
* **Graceful Error Handling:** Catches upstream timeouts or HTTP 403/404 errors from the external provider and standardizes them into safe, readable JSON error payloads for the client.

## 4. Technology Stack
* **Backend Framework:** Node.js with Express.js (Minimal proxy routing).
* **HTTP Client:** `axios` for promise-based upstream requests to RapidAPI.
* **Frontend Demo:** HTML5, CSS3, Vanilla JavaScript (Fetch API), and Bootstrap 5.
* **External Gateway:** RapidAPI (Google Map Places New V2).

## 5. How to Run Locally & Test
1. Ensure **Node.js** is installed on your machine.
2. Clone this repository and navigate to the project directory:
   ```bash
   git clone https://github.com/NPATuann/soa-logistics-mapping-api.git
   cd soa-logistics-mapping-api
   ```
3. Install the required Node.js dependencies:
   ```bash
   npm install
   ```
4. **Environment Setup:** 
   * Locate the `.env.example` file.
   * Rename it to `.env`.
   * Open the file and replace `YOUR_RAPIDAPI_KEY_HERE` with your actual RapidAPI Key (You must subscribe to the *Google Map Places New V2* API on RapidAPI).
5. Run the proxy server:
   ```bash
   node server.js
   ```
6. The service will listen on port `3001` (or `3000`). 
7. Access the **SOA Mapping Dashboard (Frontend UI)** by opening your browser to: `http://localhost:3001`

## 6. Core API Endpoints
*This microservice exposes the following internal endpoints for client applications:*

* `GET /api/search?query={text}` - Returns a list of locations matching the text query.
* `GET /api/nearby?locationName={name}&radius={meters}&type={type}` - Composite route that translates a landmark name to coordinates, then scans for nearby places of a specific type.
* `GET /api/details?place_id={id}` - Fetches deep operational details for a specific place.

## 7. Microservice Integration Strategy
To integrate this Mapping service into a larger logistics ecosystem (such as a Spring Boot delivery management system):

1. **Cross-Service Call:** When the upstream delivery application needs to find logistics hubs near a specific location, it initiates an HTTP GET request to our node: `http://<mapping-service-ip>:3001/api/nearby?locationName=District+7&radius=5000&type=warehouse`.
2. **Gateway Processing:** Our Node.js microservice securely attaches the RapidAPI credentials, parses the data, handles the 1.2s rate-limit pause, and returns a clean JSON array.
3. **Consumption:** The delivery application receives the payload and uses the coordinates to update driver routes or store facility data in its own relational database.
