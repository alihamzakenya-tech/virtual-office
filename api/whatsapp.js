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
        const userMsg = message.text.body.toLowerCase().trim();

        let replyText = '';

        // Smart Keyword-Based Logistics & Marketing Automation Engine
        if (userMsg.includes('hi') || userMsg.includes('hello') || userMsg.includes('salamu')) {
          replyText = 'Hello! Welcome to our Logistics & Marketing Assistant. How can we assist you with your shipments, tracking, or orders today?';
        } else if (userMsg.includes('price') || userMsg.includes('cost') || userMsg.includes('rates') || userMsg.includes('bei')) {
          replyText = 'Our delivery and service rates are optimized for speed and reliability. Please share your pickup and drop-off locations for a precise quote!';
        } else if (userMsg.includes('track') || userMsg.includes('status') || userMsg.includes('where')) {
          replyText = 'To track your package or number plate delivery, please reply with your tracking ID or reference number.';
        } else if (userMsg.includes('logistics') || userMsg.includes('delivery') || userMsg.includes('courier')) {
          replyText = 'We provide fast and secure transport and courier services across Kenya. Let us know your requirements!';
        } else {
          replyText = `Thank you for reaching out! We have received your message: "${message.text.body}". Our team will get back to you shortly.`;
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
