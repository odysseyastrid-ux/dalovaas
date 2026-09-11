const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Client Database (Map client keys to specific client settings or email notification targets)
const CLIENT_CONFIGS = {
  "CLIENT_LANDSCAPING_PRO_01": {
    clientName: "ProScapes Ottawa",
    notifyEmail: "owner@proscapesottawa.com",
  }
};

// Quote Ingestion API Endpoint
app.post('/v1/quotes', async (req, res) => {
  const clientKey = req.headers['x-client-key'];
  const clientConfig = CLIENT_CONFIGS[clientKey];

  if (!clientKey || !clientConfig) {
    return res.status(401).json({ error: "Unauthorized agency key" });
  }

  const { name, phone, email, service, details } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: "Name and phone are required." });
  }

  try {
    // 1. Save lead to YOUR database (e.g. PostgreSQL / Prisma / MongoDB)
    const newLead = {
      clientKey,
      clientName: clientConfig.clientName,
      name,
      phone,
      email,
      service,
      details,
      createdAt: new Date(),
    };

    console.log("New Lead Saved to Agency DB:", newLead);

    // 2. Automatically dispatch notification email or SMS to your client via Resend / Twilio
    // await sendEmailNotification(clientConfig.notifyEmail, newLead);

    return res.status(201).json({ success: true, leadId: "LEAD_" + Date.now() });
  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Agency API running on port ${PORT}`));
