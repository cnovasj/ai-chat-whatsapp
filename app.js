"use strict";

const request = require("request"),
  express = require("express"),
  body_parser = require("body-parser"),
  axios = require("axios").default,
  app = express().use(body_parser.json()); // creates express http server

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
     apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const token = process.env.WHATSAPP_TOKEN;

let messages = [
  {
    "role": "system",
    "content": "Tú eres un asistente útil."
  }
];

app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));

app.post("/webhook", async (req, res) => {
  let body = req.body;

  console.log(JSON.stringify(req.body, null, 2));

  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      let phone_number_id =
        req.body.entry[0].changes[0].value.metadata.phone_number_id;
      let from = req.body.entry[0].changes[0].value.messages[0].from; 
      let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; 

      messages.push({"role": "user", "content": msg_body});

      const completion = await openai.createChatCompletion({
        model: "gpt-4",
        messages: messages,
      });

      var reply = completion.data.choices[0].message.content;
      messages.push({"role": "assistant", "content": reply});

      axios({
        method: "POST", 
        url:
          "https://graph.facebook.com/v12.0/" +
          phone_number_id +
          "/messages?access_token=" +
          token,
        data: {
          messaging_product: "whatsapp",
          to: from,
          text: { body: reply },
        },
        headers: { "Content-Type": "application/json" },
      });
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.get("/webhook", (req, res) => {
  const verify_token = process.env.VERIFY_TOKEN;

  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === verify_token) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});
