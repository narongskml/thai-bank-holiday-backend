/**************************************
 * © 2025 Narong Sungkhamalai & T-LIVE-CODE Channel
 * https://www.youtube.com/@t-live-code
 * All Rights Reserved.
 **************************************/

const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.static(path.join(__dirname, 'public')));

const DATA_FOLDER = path.join(__dirname, "data");
app.use(express.static("public")); // Serve frontend

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
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

  console.log(allowedOrigins);
  const isAllowed = allowedOrigins.some(origin => referer.startsWith(origin));
  console.log(isAllowed);
  if (!isAllowed) {
    return res.status(403).json({ error: "Access denied from this origin" });
  }
  next();
}


// API: Get cached holidays
app.get("/api/holidays/:year", authMiddleware, (req, res) => {
  const year = req.params.year;
  const filePath = path.join(DATA_FOLDER, `${year}.json`);
  console.log(req);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Data not available" });
  }

  const data = fs.readFileSync(filePath);
  res.type("json").send(data);
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

    if (!fs.existsSync(DATA_FOLDER)) {
      fs.mkdirSync(DATA_FOLDER);
    }

    const filePath = path.join(DATA_FOLDER, `${year}.json`);
    fs.writeFileSync(filePath, JSON.stringify(response.data, null, 2));

    res.json({ status: "saved", file: `${year}.json` });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch from BOT API" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
