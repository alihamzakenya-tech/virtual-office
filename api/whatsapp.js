export default async function handler(req, res) {
  // 1. Meta Webhook Handshake Verification (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification failed' });
  }

  // 2. Incoming Messages Processing (POST)
  if (req.method === 'POST') {
    const body = req.body;
    console.log('Incoming Webhook Body:', JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message && message.type === 'text') {
        const from = message.from; // User WhatsApp Number
        const userMsg = message.text.body;

        try {
          // AI Response generation via Groq Llama model
          const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                {
                  role: 'system',
                  content: 'You are a helpful AI Virtual Assistant for routing customer inquiries regarding marketing, support, and logistics concise & professionally.'
                },
                { role: 'user', content: userMsg }
              ]
            })
          });

          const aiData = await aiResponse.json();
          
          if (!aiResponse.ok) {
            console.error('Groq API Error Details:', aiData);
          }

          const replyText = aiData.choices?.[0]?.message?.content || 'Sorry, I could not process your request.';

          // Send message reply back to WhatsApp
          const waToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
          const waResponse = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
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

          const waResponseData = await waResponse.json();
          console.log('WhatsApp API Response:', waResponseData);

        } catch (error) {
          console.error('Detailed Error processing message:', error.response?.data || error.message || error);
        }
      } else {
        console.log('Received webhook event, but no text message found in payload.');
      }

      return res.status(200).json({ status: 'EVENT_RECEIVED' });
    }

    return res.status(404).end();
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
