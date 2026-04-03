import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../api/axios';

const F='#1A3A2A', FM='#2D5A3D', G='#C9962A', GL='#E8B84B';

// ── Hindi keyword handlers (no external API needed) ──
const HINDI_COMMANDS = [
  { keys:['शिकायत','complaint','शिकायत कैसे'], response:'अपनी शिकायत दर्ज करने के लिए, बाईं ओर "Complaints" पर क्लिक करें। फिर "File Complaint" बटन दबाएं और अपनी समस्या लिखें।', speak:'Apni shikayat darj karne ke liye, baayi or Complaints par click karein.' },
  { keys:['सर्टिफिकेट','certificate','प्रमाण पत्र'], response:'प्रमाण पत्र के लिए "Certificates" सेक्शन में जाएं। वहां "Apply Certificate" बटन से आवेदन करें।', speak:'Pramaan patra ke liye Certificates section mein jaayein.' },
  { keys:['टैक्स','tax','कर','बिल'], response:'अपना टैक्स देखने के लिए "Payments" सेक्शन में जाएं। वहां आप बकाया राशि देख कर ऑनलाइन भुगतान कर सकते हैं।', speak:'Apna tax dekhne ke liye Payments section mein jaayein.' },
  { keys:['योजना','scheme','सरकारी योजना'], response:'सरकारी योजनाओं की जानकारी के लिए "Schemes" पर जाएं। "Scheme Checker" से पता करें आप किन योजनाओं के पात्र हैं।', speak:'Sarkari yojanaon ke liye Schemes par jaayein aur Scheme Checker use karein.' },
  { keys:['वोट','vote','मतदान'], response:'ग्राम सभा मतदान के लिए "Sabha & Vote" सेक्शन में जाएं और अपना मत दें।', speak:'Gram Sabha matdaan ke liye Sabha aur Vote section mein jaayein.' },
  { keys:['हाजिरी','attendance','उपस्थिति'], response:'ग्राम सभा उपस्थिति दर्ज करने के लिए "Gram Sabha" बटन दबाएं और Face Scan करें।', speak:'Gram Sabha mein haajiri ke liye Gram Sabha button dabayen aur Face Scan karein.' },
  { keys:['इमरजेंसी','emergency','SOS','मदद','help'], response:'आपातकाल में "SOS / Emergency" सेक्शन में जाएं। आपकी GPS लोकेशन पंचायत को भेजी जाएगी।', speak:'Aapat kaal mein SOS Emergency section mein jaayein. Aapki location panchayat ko bheji jaayegi.' },
  { keys:['परिवार','family','सदस्य'], response:'"Family" सेक्शन में आप अपने परिवार के सदस्यों की जानकारी देख और अपडेट कर सकते हैं।', speak:'Family section mein aap apne parivar ki jaankari dekh sakte hain.' },
  { keys:['पासवर्ड','password','भूल गया'], response:'पासवर्ड भूल जाने पर Login पेज पर "Forgot Password" पर क्लिक करें। OTP से नया पासवर्ड बनाएं।', speak:'Password bhool gaye hain to Login page par Forgot Password par click karein.' },
  { keys:['नमस्ते','hello','हाय','namaste','hi'], response:'नमस्ते! मैं GramSeva वॉइस असिस्टेंट हूं। आप मुझसे शिकायत, टैक्स, सर्टिफिकेट, योजना, वोट आदि के बारे में पूछ सकते हैं।', speak:'Namaste! Main GramSeva voice assistant hoon. Aap mujhse koi bhi sawaal pooch sakte hain.' },
  { keys:['धन्यवाद','thank','शुक्रिया'], response:'धन्यवाद! GramSeva हमेशा आपकी सेवा में है। कोई और सहायता चाहिए?', speak:'Dhanyavaad! GramSeva hamesha aapki seva mein hai.' },
];

const speak = (text) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'hi-IN';
  utt.rate = 0.9;
  utt.pitch = 1.0;
  window.speechSynthesis.speak(utt);
};

const findResponse = (query) => {
  const q = query.toLowerCase();
  const match = HINDI_COMMANDS.find(c => c.keys.some(k => q.includes(k.toLowerCase())));
  return match || { response:'मुझे समझ नहीं आया। कृपया फिर से पूछें — जैसे "शिकायत", "टैक्स", "सर्टिफिकेट", "योजना" आदि।', speak:'Mujhe samajh nahi aaya. Kripaya phir se poochein.' };
};

export default function VoiceAssistant() {
  const [messages, setMessages] = useState([
    { role:'assistant', text:'नमस्ते! 🙏 मैं GramSeva का हिंदी वॉइस असिस्टेंट हूं।\n\nआप मुझसे पूछ सकते हैं:\n• शिकायत कैसे करें\n• टैक्स / बिल भरना\n• सर्टिफिकेट आवेदन\n• सरकारी योजनाएं\n• ग्राम सभा वोटिंग', speak:true, ts: Date.now() }
  ]);
  const [input, setInput]       = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking]  = useState(false);
  const [supported, setSupported]= useState(true);
  const recog = useRef(null);
  const bottomRef = useRef(null);
  const chatRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    recog.current = new SR();
    recog.current.lang = 'hi-IN';
    recog.current.continuous = false;
    recog.current.interimResults = false;
    recog.current.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
      handleSend(transcript);
    };
    recog.current.onerror = () => setListening(false);
    recog.current.onend = () => setListening(false);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const handleSend = (text) => {
    const q = text || input;
    if (!q.trim()) return;
    setInput('');
    const userMsg = { role:'user', text:q, ts:Date.now() };
    const res = findResponse(q);
    const botMsg = { role:'assistant', text:res.response, ts:Date.now()+1 };
    setMessages(m => [...m, userMsg, botMsg]);
    setTimeout(() => {
      setSpeaking(true);
      speak(res.speak);
      setTimeout(() => setSpeaking(false), res.speak.length*80);
    }, 300);
  };

  const toggleListen = () => {
    if (!supported) return;
    if (listening) { recog.current.stop(); setListening(false); }
    else { recog.current.start(); setListening(true); }
  };

  const quickPrompts = ['शिकायत दर्ज करें', 'टैक्स देखें', 'योजनाएं जांचें', 'सर्टिफिकेट', 'ग्राम सभा वोट', 'इमरजेंसी'];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',minHeight:500}}>
      <style>{`
        @keyframes bounce{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.6)}}
        @keyframes pulse2{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:.7}}
        @keyframes msg{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .msg{animation:msg .25s ease;}
      `}</style>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${F},${FM})`,borderRadius:'16px 16px 0 0',padding:'16px 20px',display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:44,height:44,borderRadius:'50%',background:`linear-gradient(135deg,${G},${GL})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>📻</div>
        <div>
          <div style={{fontWeight:800,fontSize:15,color:'#fff'}}>GramSeva Voice Assistant</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.6)',marginTop:1}}>हिंदी में बात करें • Speak in Hindi</div>
        </div>
        {speaking && (
          <div style={{marginLeft:'auto',display:'flex',gap:3,alignItems:'flex-end',height:20}}>
            {[1,1.6,1.2,1.8,1].map((h,i)=>(
              <div key={i} style={{width:3,background:G,borderRadius:2,height:`${h*10}px`,animation:`bounce .6s ${i*0.1}s ease-in-out infinite`}}/>
            ))}
          </div>
        )}
      </div>

      {/* Chat area */}
      <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:'16px',background:'#FAFAF8',display:'flex',flexDirection:'column',gap:10,minHeight:320,maxHeight:420}}>
        {messages.map((m,i) => (
          <div key={i} className="msg" style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
            {m.role==='assistant' && (
              <div style={{width:28,height:28,borderRadius:'50%',background:`linear-gradient(135deg,${F},${FM})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0,marginRight:8,marginTop:2}}>🤖</div>
            )}
            <div style={{maxWidth:'78%',padding:'10px 14px',borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',
              background:m.role==='user'?`linear-gradient(135deg,${F},${FM})`:'#fff',
              color:m.role==='user'?'#fff':'#1A1A1A',
              fontSize:13,lineHeight:1.6,border:`1px solid ${m.role==='user'?'transparent':'#E2D9C8'}`,
              boxShadow:'0 1px 4px rgba(0,0,0,.06)',whiteSpace:'pre-line'}}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Quick prompts */}
      <div style={{padding:'8px 14px',background:'#fff',borderTop:'1px solid #E2D9C8',display:'flex',gap:6,flexWrap:'wrap'}}>
        {quickPrompts.map(p=>(
          <button key={p} onClick={()=>handleSend(p)}
            style={{padding:'4px 10px',borderRadius:20,border:`1.5px solid #E2D9C8`,background:'#F7F4EF',color:F,fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
            {p}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div style={{padding:'12px 14px',background:'#fff',borderTop:'1px solid #E2D9C8',display:'flex',gap:8,alignItems:'center',borderRadius:'0 0 16px 16px'}}>
        {!supported && <div style={{flex:1,fontSize:12,color:'#9CA3AF',textAlign:'center'}}>Voice not supported in this browser. Use text below.</div>}

        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend()}
          placeholder="हिंदी में टाइप करें या बोलें…" dir="auto"
          style={{flex:1,border:`1.5px solid #E2D9C8`,borderRadius:10,padding:'10px 14px',fontSize:13,fontFamily:'inherit',outline:'none',color:'#1A1A1A'}}/>

        <button onClick={toggleListen} title={listening?'Stop':'Speak'}
          style={{width:42,height:42,borderRadius:'50%',background:listening?`linear-gradient(135deg,#EF4444,#DC2626)`:`linear-gradient(135deg,${F},${FM})`,border:'none',color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
            animation:listening?'pulse2 1s infinite':undefined,boxShadow:listening?'0 0 0 6px rgba(239,68,68,.2)':undefined}}>
          {listening ? '⏹' : '🎤'}
        </button>

        <button onClick={()=>handleSend()} disabled={!input.trim()}
          style={{width:42,height:42,borderRadius:'50%',background:input.trim()?`linear-gradient(135deg,${G},${GL})`:'#E5E7EB',border:'none',color:'#fff',fontSize:16,cursor:input.trim()?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          ➤
        </button>
      </div>

      {!supported && (
        <div style={{padding:'8px 14px',background:'#FFF7ED',borderTop:'1px solid #FED7AA',fontSize:11,color:'#92400E',textAlign:'center',borderRadius:'0 0 16px 16px'}}>
          ⚠️ Chrome browser recommended for voice input (mic button)
        </div>
      )}
    </div>
  );
}
