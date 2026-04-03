const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const SYSTEM_PROMPT = `You are GramMitra (ग्राम मित्र), a helpful AI assistant for GramSeva — a village Gram Panchayat portal in India. 
You help villagers with all their government services and queries in simple, friendly language.

You can help with:
- Certificates: Income, Residence, Caste, Birth, Death, Marriage, Character, Land certificates — how to apply, required documents, processing time
- Complaints: How to file water, electricity, road, drainage, corruption complaints — steps and tracking
- Tax Payments: Property tax, water tax, house tax, sewage tax — payment methods (UPI, Net Banking, Cash), due dates, penalty info
- Government Schemes: PM Awas Yojana, MGNREGA, PM Kisan, Ayushman Bharat, PM Ujjwala — eligibility, benefits, how to apply
- Gram Sabha: Meeting schedule, how to attend, what topics are discussed, attendance process
- SOS Emergency: When and how to use medical, fire, police, general emergency
- Family Registration: How to add family members, manage access, family PIN
- Portal navigation: How to use the GramSeva portal features

Important rules:
- Respond in the same language the user writes in (Hindi or English or Hinglish)
- Keep answers concise, practical, and helpful
- For Hindi queries, respond in Hindi using Devanagari script or Romanized Hindi as the user prefers
- Always be warm, respectful, and use "ji" when appropriate
- If you don't know something specific about their village, give general guidance
- Format responses with emojis and short bullet points for clarity
- Never make up fake government schemes or wrong information
- If asked about something outside village/panchayat topics, gently redirect to what you can help with

Village context: The user is a registered villager on the GramSeva portal of their Gram Panchayat.`;

// POST /api/chatbot/message
router.post('/message', protect, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message is required' });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Demo fallback responses
      return res.json({ success: true, reply: getDemoReply(message), demo: true });
    }

    const messages = [
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', err);
      return res.json({ success: true, reply: getDemoReply(message), demo: true });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Sorry, I could not process that. Please try again.';
    res.json({ success: true, reply, tokens: data.usage });

  } catch (err) {
    console.error('Chatbot error:', err.message);
    res.json({ success: true, reply: getDemoReply(req.body.message), demo: true });
  }
});

function getDemoReply(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('certificate') || m.includes('praman')) return '📜 **Certificate Apply करने के Steps:**\n1. Dashboard → Certificates section खोलें\n2. "+ Apply New" बटन क्लिक करें\n3. Certificate type चुनें (Income/Residence/Caste etc.)\n4. Purpose लिखें और Submit करें\n5. Processing time: 3-7 working days\n\n✅ Status "Ready" होने पर PDF download होगी।';
  if (m.includes('complaint') || m.includes('shikayat')) return '📋 **Complaint File करने के Steps:**\n1. Dashboard → Complaints section जाएं\n2. Category चुनें (Water/Road/Electricity)\n3. समस्या का विवरण लिखें\n4. 📍 GPS location add करें (optional)\n5. Photo upload करें (optional)\n6. Submit! Complaint ID मिलेगी\n\n⏱ Resolution time: 7-15 days';
  if (m.includes('tax') || m.includes('payment') || m.includes('bill')) return '💳 **Tax Payment के Options:**\n1. Dashboard → Payments section खोलें\n2. Pending tax card पर "Pay Now" click करें\n3. Payment method चुनें:\n   • UPI (Google Pay, PhonePe)\n   • Net Banking\n   • Demo Mode\n4. Payment के बाद PDF Receipt मिलेगी ✅\n\n⚠️ Due date से पहले भरें, penalty से बचें!';
  if (m.includes('scheme') || m.includes('yojana') || m.includes('benefit')) return '🏛 **Available Government Schemes:**\n• **PM Awas Yojana** - BPL परिवार को ₹1.2 लाख housing grant\n• **MGNREGA** - 100 दिन रोजगार, ₹220/day\n• **PM Kisan** - किसानों को ₹6000/year\n• **Ayushman Bharat** - ₹5 लाख health insurance\n• **PM Ujjwala** - महिलाओं को Free LPG connection\n\n📱 Govt Schemes section में Apply Now बटन दबाएं!';
  if (m.includes('sos') || m.includes('emergency') || m.includes('help')) return '🚨 **SOS Emergency Use करें:**\n• 🏥 Medical - Ambulance & Doctor\n• 🔥 Fire - Fire Brigade\n• 👮 Police - Law Enforcement\n• 🆘 General - Any emergency\n\nLeft menu में SOS Emergency section जाएं। आपकी GPS location automatically share होगी Panchayat के साथ। ⚡ Only genuine emergencies के लिए use करें।';
  if (m.includes('sabha') || m.includes('meeting') || m.includes('gram')) return '🤝 **Gram Sabha Information:**\n\n📅 Next Meeting: 15 March 2026\n🕐 Time: 10:00 AM – 1:00 PM  \n📍 Venue: Village Community Hall\n📌 Agenda: Annual Budget Review & Road Works\n\n**Attendance कैसे Mark करें:**\n1. Gram Sabha section जाएं\n2. "Mark Attendance with Photo" click करें\n3. Photo लें + GPS capture करें\n4. Submit ✅';
  if (m.includes('family') || m.includes('member') || m.includes('add')) return '👨‍👩‍👧‍👦 **Family Member Add करने के Steps:**\n1. Left menu → Family Members section\n2. "+ Add Member" button click करें\n3. Details भरें: Name, Aadhaar last 4, Age, Relation\n4. Save करें\n\n🔒 Members को Family PIN से login कर सकते हैं।\n⚙️ Settings में member access control भी कर सकते हैं।';
  return `🙏 **Namaste!** मैं GramMitra हूं, आपका Panchayat Assistant!\n\nमैं इन topics में help कर सकता हूं:\n📜 **Certificates** - Apply & Download\n📋 **Complaints** - File & Track\n💳 **Tax Payment** - Pay Online\n🏛 **Govt Schemes** - Check Eligibility\n🤝 **Gram Sabha** - Meetings & Attendance\n🚨 **SOS Emergency** - Quick Help\n👨‍👩‍👧‍👦 **Family** - Member Management\n\nकोई भी सवाल पूछें! 😊\n\n*(AI mode: Add ANTHROPIC_API_KEY in .env for full responses)*`;
}

module.exports = router;
