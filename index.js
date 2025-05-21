const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const app = express();
app.use(express.json());

const rawPrivateKey = process.env.PRIVATE_KEY;
const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n') : null;
const clientEmail = process.env.CLIENT_EMAIL;

app.post('/tts', async (req, res) => {
  const text = req.body.text;

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat,
  };

  const jwtToken = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwtToken,
  });

  const accessToken = tokenRes.data.access_token;

  const ttsRes = await axios.post(
    'https://texttospeech.googleapis.com/v1/text:synthesize',
    {
      input: { text },
      voice: {
        languageCode: 'cmn-TW',
        name: 'cmn-TW-Wavenet-A',
      },
      audioConfig: {
        audioEncoding: 'MP3',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  res.json({ audioContent: ttsRes.data.audioContent });
});

app.listen(3000, () => {
  console.log('TTS API server running on port 3000');
});
