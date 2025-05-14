/**************************************
 * © 2025 Narong Sungkhamalai & T-LIVE-CODE Channel
 * https://www.youtube.com/@t-live-code
 * All Rights Reserved.
 **************************************/

const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { list,put } = require("@vercel/blob");
const { json } = require("stream/consumers");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const BLOB_STORAGE_URL= process.env.BLOB_STORAGE_URL
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
app.use(express.static(path.join(__dirname, 'public')));
const BLOB_FOLDER = "bankholiday";

const DATA_FOLDER = path.join(__dirname, "data");
app.use(express.static("public")); // Serve frontend

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>API Backend for Thai Bank Holiday</title>
</head>
<body>
     <div style="margin-bottom: 1rem; text-align: center;color: #666;">
            <h1>API Backend for Thai Bank Holiday</h1>
    </div>
  
    <footer style="text-align: center; margin-top: 2rem; font-size: 0.9rem; color: #666;">
    © 2025 Narong Sungkhamalai & T-LIVE-CODE Channel. All rights reserved.
</footer>
</body>
</html>`);
});

// Middleware to check API key and origin
function authMiddleware(req, res, next) {
  const key = req.query.key || req.headers["x-api-key"];
  const referer = req.headers.referer || "";
  console.log(`key: ${ key }`);
  
  console.log(`referer: ${ referer }`);
  if (key !== process.env.FRONTEND_API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

  console.log(`allowOrigins: ${allowedOrigins}`);
  const isAllowed = allowedOrigins.some(origin => referer.startsWith(origin));
  console.log(`isAllowed: ${isAllowed}`);
  /*
  if (!isAllowed) {
    return res.status(403).json({ error: "Access denied from this origin" });
  }
    */
  next();
}


// API: Get cached holidays
app.get("/api/holidays/:year", authMiddleware, async (req, res) => {
  const year = req.params.year;
  console.log(`year: ${ year }`);
  const response = await list();
  if (!response) {
      return res.status(404).json({ error: 'data not found' });
    }

  if (response) {
    const data = await response.blobs.filter((meta) => meta.size>0); // or blob.json() for JSON parsing
    console.log(data);
    data.forEach(content => {
      if (content.pathname.includes(year))
      {
         console.log('url:'+content.url);
         fetch(content.url)
        .then((f) => f.json())
        .then((f) => res.json(f))
        .catch((err) => console.log(err));
       
       
      }
    });
    
  }

});

// Admin route: Fetch from BOT and store
/*** Document  on link  https://apiportal.bot.or.th/bot/public/ **/
app.get("/admin/fetch/:year", async (req, res) => {
  const year = req.params.year;
  const url = `https://apigw1.bot.or.th/bot/public/financial-institutions-holidays/?year=${year}`;

  try {
      const response = await axios.get(url, {
        headers: {
          "X-IBM-Client-Id": process.env.BOT_API_KEY,
          "accept": "application/json",
        },
      });
     /** write to vercel blob */
     const blob = await put(`${BLOB_FOLDER}/${year}.json`, JSON.stringify(response.data, null, 2) , {
        contentType: 'application/json',
        access: 'public',
        allowOverwrite: true,
      });
      res.json({ status: "saved", file: `${year}.json` });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch from BOT API" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;