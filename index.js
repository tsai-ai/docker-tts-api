const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const app = express();
app.use(express.json()); // ✅ 必要 middleware

// 抓環境變數
const rawPrivateKey = process.env.PRIVATE_KEY;
const clientEmail = process.env.CLIENT_EMAIL;

// 防呆檢查
if (!rawPrivateKey || !clientEmail) {
  console.error('❌ PRIVATE_KEY 或 CLIENT_EMAIL 尚未設定');
  process.exit(1); // 終止啟動
}

// 轉換 private key
const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

app.post('/tts', async (req, res) => {
  try {
    const text = req.body.text;
    if (!text) {
      return res.status(400).json({ error: '❌ 缺少 text 欄位' });
    }

    // 建 JWT token
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

    // 拿 access_token
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtToken,
    });

    const accessToken = tokenRes.data.access_token;

    // 呼叫 TTS API
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
  } catch (err) {
    console.error('❌ TTS Error:', err?.response?.data || err.message);
    res.status(500).json({ error: 'TTS API 發生錯誤', detail: err?.message });
  }
});

app.listen(3000, () => {
  console.log('✅ TTS API server running on port 3000');
});
