export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification failed' });
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message && message.type === 'text') {
        const from = message.from;
        const userMsg = message.text.body;

        let replyText = '';

        try {
          // Using Hugging Face free inference API as a reliable fallback
          const aiResponse = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2", {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              inputs: `[INST] You are a professional AI virtual assistant for marketing and logistics. Reply clearly and concisely to: ${userMsg} [/INST]`,
              parameters: { max_new_tokens: 150, return_full_text: false }
            })
          });

          const aiData = await aiResponse.json();
          if (Array.isArray(aiData) && aiData[0]?.generated_text) {
            replyText = aiData[0].generated_text.trim();
          } else if (aiData.error) {
            // Fallback smart response if rate-limited
            replyText = `Virtual Assistant received: "${userMsg}". All systems operational!`;
          } else {
            replyText = `Hello! I have received your message: "${userMsg}". How can I help you with marketing or logistics today?`;
          }
        } catch (apiErr) {
          replyText = `Welcome! Received your message: "${userMsg}".`;
        }

        const waToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
        await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${waToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: from,
            text: { body: replyText }
          })
        });
      }

      return res.status(200).json({ status: 'EVENT_RECEIVED' });
    } catch (error) {
      console.error('Fatal Error:', error);
      return res.status(200).json({ status: 'ERROR' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
