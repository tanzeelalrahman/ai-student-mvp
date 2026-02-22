const express = require("express");
const twilio = require("twilio");

const app = express();

// Twilio sends x-www-form-urlencoded by default
app.use(express.urlencoded({ extended: false }));

// Health check (optional but useful)
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// This is the webhook endpoint you will put into Twilio Sandbox settings
app.post("/whatsapp", (req, res) => {
  const from = req.body.From; // e.g. "whatsapp:+14155238886"
  const body = req.body.Body; // message text

  console.log("Incoming message:");
  console.log("From:", from);
  console.log("Body:", body);

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(`Got it from ${from}: ${body}`);

  res.type("text/xml").status(200).send(twiml.toString());
});

app.listen(3000, () => {
  console.log("Listening on http://localhost:3000");
  console.log("Webhook path is POST http://localhost:3000/whatsapp");
});