const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Registered client agency accounts
const CLIENT_CONFIGS = {
  "CLIENT_LANDSCAPING_PRO_01": {
    clientName: "ProScapes Ottawa",
    notifyEmail: "leads@proscapesottawa.com",
    active: true,
  },
};

// Middleware: Validate Client API Key
const validateClientKey = (req, res, next) => {
  const clientKey = req.headers['x-client-key'];
  if (!clientKey || !CLIENT_CONFIGS[clientKey] || !CLIENT_CONFIGS[clientKey].active) {
    return res.status(401).json({ success: false, error: "Unauthorized or inactive agency client key" });
  }
  req.clientConfig = CLIENT_CONFIGS[clientKey];
  req.clientKey = clientKey;
  next();
};

// Healthcheck
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Lead Ingestion Route
app.post('/api/v1/quotes', validateClientKey, async (req, res) => {
  try {
    const { name, phone, email, service, details } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: "Name and phone are required fields." });
    }

    const leadRecord = {
      id: `LEAD_${Date.now()}`,
      clientKey: req.clientKey,
      clientName: req.clientConfig.clientName,
      customer: { name, phone, email },
      service,
      details: details || "No extra details provided.",
      status: "NEW",
      createdAt: new Date().toISOString(),
    };

    // Log to console (Connect to PostgreSQL/Prisma here in production)
    console.log("[AGENCY DB] New lead registered:", leadRecord);

    return res.status(201).json({
      success: true,
      message: "Quote request successfully registered with agency backend",
      leadId: leadRecord.id,
    });
  } catch (error) {
    console.error("Internal Server Error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`[AGENCY BACKEND API] Running on http://localhost:${PORT}`);
});
