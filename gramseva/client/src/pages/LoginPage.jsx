import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { showToast } from '../components/Toast';
import api from '../api/axios';

/* ─── ROLE CONFIGS ─── */
const ROLES = {
  admin:  { label:'🛡️ Admin',           color:'var(--amber)',   bg:'var(--amberG)',  border:'rgba(217,119,6,.3)',  grad:'linear-gradient(135deg,#F59E0B,#D97706)', sh:'rgba(217,119,6,.3)' },
  head:   { label:'👨‍👩‍👧‍👦 Head',             color:'var(--primary)', bg:'var(--primaryG)',border:'rgba(22,163,74,.3)',   grad:'linear-gradient(135deg,#22C55E,#16A34A)', sh:'rgba(22,163,74,.3)' },
  member: { label:'👤 Member',           color:'var(--teal)',    bg:'var(--tealG)',   border:'rgba(8,145,178,.3)',  grad:'linear-gradient(135deg,#06B6D4,#0891B2)', sh:'rgba(8,145,178,.3)' },
};

const LBL = { display:'block',fontSize:11,fontWeight:700,color:'var(--textMut)',letterSpacing:'0.07em',textTransform:'uppercase',marginBottom:7 };
const IC  = { position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',fontSize:15,pointerEvents:'none',zIndex:1 };

function LangPicker() {
  const { t, lang, switchLang, langs } = useLang();
  return (
    <div className="gc-lang-picker">
      {langs.map(l => (
        <button key={l.code} className={`gc-lang-btn${lang===l.code?' active':''}`} onClick={() => switchLang(l.code)}>
          {l.native}
        </button>
      ))}
    </div>
  );
}

function F2({ label, icon, value, onChange, placeholder, type='text' }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={LBL}>{label}</label>
      <div style={{ position:'relative' }}>
        <span style={IC}>{icon}</span>
        <input className="gc-inp" type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />
      </div>
    </div>
  );
}

function MCard({ name, meta, isHead, onRemove }) {
  return (
    <div style={{ background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'11px 14px',display:'flex',alignItems:'center',gap:11 }}>
      <div style={{ width:36,height:36,borderRadius:'50%',background:isHead?'linear-gradient(135deg,#F59E0B,#D97706)':'linear-gradient(135deg,#06B6D4,#0891B2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>
        {isHead?'👑':'👤'}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13,fontWeight:600,color:'var(--text)' }}>{name}</div>
        <div style={{ fontSize:11,color:'var(--textDim)',marginTop:2 }}>{meta}</div>
      </div>
      <span style={{ fontSize:10,padding:'3px 8px',borderRadius:99,fontWeight:700,textTransform:'uppercase',background:isHead?'var(--amberG)':'var(--tealG)',color:isHead?'var(--amber)':'var(--teal)',border:`1px solid ${isHead?'rgba(217,119,6,.25)':'rgba(8,145,178,.25)'}` }}>
        {isHead?'Head':'Member'}
      </span>
      {onRemove && <button onClick={onRemove} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--textDim)',fontSize:16,transition:'color .18s' }} onMouseEnter={e=>e.target.style.color='var(--danger)'} onMouseLeave={e=>e.target.style.color='var(--textDim)'}>🗑</button>}
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { t } = useLang();
  const cardRef = useRef(null);

  /* ─── LOGIN STATE ─── */
  const [view, setView]             = useState('login');
  const [loginRole, setLoginRole]   = useState('admin');
  const [loginId, setLoginId]       = useState('');
  const [loginPass, setLoginPass]   = useState('');
  const [showLP, setShowLP]         = useState(false);
  const [loginVillage, setLoginVil] = useState('');
  const [loginLoading, setLoginL]   = useState(false);

  /* ─── FORGOT ─── */
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotMobile, setForgotMob]= useState('');
  const [forgotOtp, setForgotOtp]   = useState(['','','','','','']);
  const [forgotNewPass, setForgotNP]= useState('');
  const [forgotShowPass, setForgotSP]=useState(false);
  const [forgotDemoOtp, setForgotDO]= useState('');
  const [forgotLoading, setForgotL] = useState(false);

  /* ─── SIGNUP STATE ─── */
  const [step, setStep]             = useState(1);
  const [s1, setS1]                 = useState({ name:'',aadhaar:'',age:'',gender:'',mobile:'',address:'',village:'',pincode:'' });
  const [docType, setDocType]       = useState('aadhaar');
  const [docFile, setDocFile]       = useState(null);
  const [docFileName, setDocFN]     = useState('');
  const [docError, setDocError]     = useState('');
  const [signupDone, setSignupDone] = useState(false);
  const [signupLoading, setSignupL] = useState(false);
  const [members, setMembers]       = useState([]);
  const [showAddForm, setShowAF]    = useState(false);
  const [newMember, setNewMember]   = useState({ name:'',aadhaarLast4:'',age:'',gender:'Male',relation:'Spouse' });
  const [memberError, setMemberErr] = useState('');
  const [accessControls, setAC]     = useState({ allowMembersViewRecords:true,requireHeadApproval:true,freezeAllMemberAccess:false });
  const [pin, setPin]               = useState(['','','','']);
  const [secQ, setSecQ]             = useState('');
  const [secA, setSecA]             = useState('');
  const [newPass, setNewPass]       = useState('');
  const [showNewPass, setShowNP]    = useState(false);
  const [regOtp, setRegOtp]         = useState(['','','','','','']);
  const [regDemoOtp, setRegDO]      = useState('');
  const [otpSent, setOtpSent]       = useState(false);
  const [otpVerified, setOtpVer]    = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const shakeCard = useCallback(() => {
    const c=cardRef.current; if(!c)return;
    c.style.animation='none'; c.offsetHeight;
    c.style.animation='shake .4s ease'; setTimeout(()=>{if(c)c.style.animation=''},400);
  }, []);

  const handleLogin = async () => {
    if (!loginId||!loginPass) { shakeCard(); showToast('Please fill all login fields','warning'); return; }
    setLoginL(true);
    const res = await login(loginId, loginPass, loginVillage, loginRole);
    setLoginL(false);
    if (res.success) navigate(res.user.role==='admin'?'/admin':'/dashboard');
    else { shakeCard(); showToast(res.message,'error'); }
  };

  const fmtAadh = v => v.replace(/\D/g,'').substring(0,12).replace(/(\d{4})(\d{0,4})(\d{0,4})/,'$1 $2 $3').trim();
  const otpIn = (val,idx,arr,setFn,pfx) => { if(!/^\d?$/.test(val))return; const a=[...arr]; a[idx]=val; setFn(a); if(val&&idx<5) document.getElementById(`${pfx}${idx+1}`)?.focus(); };
  const otpBk = (e,idx,arr,pfx) => { if(e.key==='Backspace'&&!arr[idx]&&idx>0) document.getElementById(`${pfx}${idx-1}`)?.focus(); };
  const pinIn = (val,idx) => { if(!/^\d?$/.test(val))return; const a=[...pin]; a[idx]=val; setPin(a); if(val&&idx<3) document.getElementById(`gc_p${idx+1}`)?.focus(); };
  const pinBk = (e,idx) => { if(e.key==='Backspace'&&!pin[idx]&&idx>0) document.getElementById(`gc_p${idx-1}`)?.focus(); };

  const sendRegOtp = async () => { if(!s1.mobile||s1.mobile.length!==10){showToast('Enter valid 10-digit mobile','warning');return;} setOtpLoading(true); try{const{data}=await api.post('/auth/send-otp',{mobile:s1.mobile}); setOtpSent(true); if(data.demo){setRegDO(data.otp);showToast(`OTP sent (Demo: ${data.otp})`,'info');}else showToast(`OTP sent to ${s1.mobile}`,'success');}catch(e){showToast(e.response?.data?.message||'Failed to send OTP','error');}finally{setOtpLoading(false);} };
  const verifyRegOtp = async () => { if(regOtp.join('').length<6){showToast('Enter 6-digit OTP','warning');return;} try{await api.post('/auth/verify-otp',{mobile:s1.mobile,otp:regOtp.join('')}); setOtpVer(true); showToast('Mobile verified successfully','success');}catch(e){showToast(e.response?.data?.message||'Invalid OTP','error');} };
  const saveMember = () => { if(!newMember.name){setMemberErr('Name is required');return;} setMemberErr(''); setMembers([...members,{...newMember,_id:Date.now().toString()}]); setNewMember({name:'',aadhaarLast4:'',age:'',gender:'Male',relation:'Spouse'}); setShowAF(false); showToast('Member added','success'); };
  const handleSignupSubmit = async () => {
    if(!docFile){setDocError('Identity proof is mandatory'); showToast('Please upload identity document','warning'); return;}
    if(pin.join('').length<4){showToast('Please set 4-digit PIN','warning');return;}
    if(!newPass||newPass.length<6){showToast('Password must be at least 6 characters','warning');return;}
    if(!otpVerified){showToast('Please verify your mobile with OTP','warning');return;}
    setSignupL(true);
    const fd=new FormData();
    Object.entries({name:s1.name,aadhaarNumber:s1.aadhaar.replace(/\s/g,''),age:s1.age,gender:s1.gender,mobile:s1.mobile,address:s1.address,village:s1.village,pincode:s1.pincode}).forEach(([k,v])=>fd.append(k,v));
    fd.append('password',newPass); fd.append('documentType',docType); fd.append('familyPin',pin.join('')); fd.append('securityQuestion',secQ); fd.append('securityAnswer',secA); fd.append('familyMembers',JSON.stringify(members));
    Object.entries(accessControls).forEach(([k,v])=>fd.append(k,v)); fd.append('document',docFile);
    const res = await register(fd); setSignupL(false);
    if(res.success){setSignupDone(true); showToast('Family registered successfully! 🎉','success');}
    else showToast(res.message,'error');
  };
  const goStep = n => { setStep(n); window.scrollTo({top:0}); };
  const sendForgotOtp = async () => { if(!forgotMobile||forgotMobile.length!==10){showToast('Enter valid mobile number','warning');return;} setForgotL(true); try{const{data}=await api.post('/auth/forgot-password',{mobile:forgotMobile}); setForgotStep(2); if(data.demo){setForgotDO(data.otp);showToast(`OTP sent (Demo: ${data.otp})`,'info');}else showToast('OTP sent!','success');}catch(e){showToast(e.response?.data?.message||'Failed','error');}finally{setForgotL(false);} };
  const resetPassword = async () => { const otp=forgotOtp.join(''); if(otp.length<6||!forgotNewPass){showToast('Fill all fields','warning');return;} setForgotL(true); try{await api.post('/auth/reset-password',{mobile:forgotMobile,otp,newPassword:forgotNewPass}); showToast('Password reset successfully','success'); setForgotOpen(false); setForgotStep(1); setForgotMob(''); setForgotOtp(['','','','','','']); setForgotNP('');}catch(e){showToast(e.response?.data?.message||'Failed','error');}finally{setForgotL(false);} };
  const goSignup = () => { setView('signup'); setStep(1); setSignupDone(false); window.scrollTo(0,0); };
  const goLogin  = () => { setView('login'); window.scrollTo(0,0); };

  const cfg = ROLES[loginRole];

  return (
    <div style={{ minHeight:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column' }}>
      <style>{`
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        @keyframes popIn{from{opacity:0;transform:scale(.88)}60%{transform:scale(1.04)}to{opacity:1;transform:scale(1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blade1{to{transform:rotate(360deg)}} @keyframes blade2{to{transform:rotate(-360deg)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .lp-in{animation:fadeUp .3s ease both;}
        .lp-b1{transform-origin:110px 105px;animation:blade1 8s linear infinite;}
        .lp-b2{transform-origin:310px 115px;animation:blade2 10s linear infinite;}
        .lp-svg{animation:float 6s ease-in-out infinite;}
        .role-card{border:2px solid var(--border);border-radius:18px;padding:18px 14px;cursor:pointer;background:var(--surface);transition:all .28s cubic-bezier(.4,0,.2,1);text-align:center;position:relative;overflow:hidden;}
        .role-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-md);}
        @media(max-width:900px){.lp-hr{flex-direction:column!important;}.hero-txt{display:none!important;}}
        @media(max-width:600px){.lp-roles{flex-direction:column!important;}.lp-topbar{padding:14px 16px!important;}}
      `}</style>

      {/* ─── FORGOT PASSWORD MODAL ─── */}
      {forgotOpen && (
        <div className="gc-overlay" onClick={e=>e.target===e.currentTarget&&setForgotOpen(false)}>
          <div className="gc-modal">
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,paddingBottom:14,borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700 }}>{t('resetPassword')}</div>
              <button onClick={()=>{setForgotOpen(false);setForgotStep(1);}} style={{ width:30,height:30,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--textMut)' }}>×</button>
            </div>
            {forgotStep===1 ? (
              <>
                <p style={{ fontSize:13,color:'var(--textMut)',marginBottom:18,lineHeight:1.65 }}>{t('forgotDesc')}</p>
                <div style={{ marginBottom:16 }}>
                  <label style={LBL}>{t('mobileNumber')}</label>
                  <div style={{ position:'relative' }}><span style={IC}>📱</span>
                    <input className="gc-inp" value={forgotMobile} onChange={e=>setForgotMob(e.target.value)} type="tel" maxLength={10} placeholder={t('mobilePlaceholder')}/>
                  </div>
                </div>
                <button className="gc-btn gc-btn-primary gc-btn-full" onClick={sendForgotOtp} disabled={forgotLoading}>
                  {forgotLoading ? <span style={{animation:'spin .8s linear infinite',display:'inline-block'}}>⟳</span> : t('sendOtp')}
                </button>
              </>
            ) : (
              <>
                <div className="gc-succ" style={{ marginBottom:14 }}>OTP sent to +91 {forgotMobile}{forgotDemoOtp && <strong> — Demo: {forgotDemoOtp}</strong>}</div>
                <label style={{ ...LBL,textAlign:'center',display:'block',marginBottom:10 }}>{t('enter6Otp')}</label>
                <div style={{ display:'flex',gap:8,justifyContent:'center',marginBottom:16 }}>
                  {forgotOtp.map((v,i)=><input key={i} id={`gf${i}`} value={v} maxLength={1} type="tel" className="gc-otp" onChange={e=>otpIn(e.target.value,i,forgotOtp,setForgotOtp,'gf')} onKeyDown={e=>otpBk(e,i,forgotOtp,'gf')}/>)}
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={LBL}>{t('newPassword')}</label>
                  <div style={{ position:'relative' }}><span style={IC}>🔒</span>
                    <input className="gc-inp" value={forgotNewPass} onChange={e=>setForgotNP(e.target.value)} type={forgotShowPass?'text':'password'} placeholder={t('minChars')} style={{ paddingRight:46 }}/>
                    <button className="gc-pw-toggle" onClick={()=>setForgotSP(!forgotShowPass)}>{forgotShowPass?'🙈':'👁'}</button>
                  </div>
                </div>
                <button className="gc-btn gc-btn-primary gc-btn-full" onClick={resetPassword} disabled={forgotLoading}>
                  {forgotLoading ? <span style={{animation:'spin .8s linear infinite',display:'inline-block'}}>⟳</span> : t('verifyReset')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── TOPBAR ─── */}
      <nav className="lp-topbar" style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 36px',background:'var(--surface)',borderBottom:'1px solid var(--border)',boxShadow:'var(--shadow-sm)',position:'sticky',top:0,zIndex:50,flexWrap:'wrap',gap:12 }}>
        <div style={{ display:'flex',alignItems:'center',gap:13 }}>
          <div style={{ width:44,height:44,background:'linear-gradient(135deg,#22C55E,#16A34A)',borderRadius:13,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,boxShadow:'0 0 20px rgba(34,197,94,.25)',flexShrink:0 }}>🏛️</div>
          <div>
            <div style={{ fontFamily:"'Sora',sans-serif",fontSize:20,fontWeight:800,color:'var(--text)',lineHeight:1.1 }}>{t('appName')}</div>
            <div style={{ fontSize:9.5,color:'var(--textMut)',letterSpacing:'0.1em',textTransform:'uppercase' }}>{t('appTagline')}</div>
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <LangPicker />
          <span style={{ padding:'5px 12px',border:'1px solid var(--border)',borderRadius:99,fontSize:10.5,fontWeight:600,color:'var(--textMut)',letterSpacing:'0.05em',textTransform:'uppercase' }}>🌐 {t('digitalIndia')}</span>
          {view==='login'
            ? <button onClick={goSignup} style={{ padding:'8px 18px',border:'1.5px solid var(--primary)',borderRadius:99,background:'transparent',color:'var(--primary)',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all .22s',fontFamily:"'Plus Jakarta Sans',sans-serif" }}
                onMouseEnter={e=>{e.target.style.background='var(--primaryG)'}} onMouseLeave={e=>{e.target.style.background='transparent'}}>{t('registerFamily')}</button>
            : <button onClick={goLogin} style={{ padding:'8px 18px',border:'1.5px solid var(--border)',borderRadius:99,background:'transparent',color:'var(--textMut)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{t('backToLogin')}</button>
          }
        </div>
      </nav>

      {/* ════════════════ LOGIN VIEW ════════════════ */}
      {view==='login' && (
        <>
          {/* Hero Row */}
          <div className="lp-hr" style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:'36px 36px 0',gap:52,maxWidth:1120,margin:'0 auto',width:'100%',animation:'fadeUp .6s ease .1s both' }}>
            <div className="hero-txt" style={{ flex:1,maxWidth:420 }}>
              <div style={{ display:'inline-flex',alignItems:'center',gap:7,padding:'5px 14px',background:'var(--primaryG)',border:'1px solid rgba(22,163,74,.25)',borderRadius:99,fontSize:11,fontWeight:600,color:'var(--primaryD)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:18 }}>✨ Powered by Digital India</div>
              <h1 style={{ fontSize:38,fontWeight:800,lineHeight:1.15,marginBottom:16,color:'var(--text)' }}>
                {t('loginTitle').split(',')[0]},<br/>
                <span style={{ color:'var(--primary)' }}>Digitally</span> <span style={{ color:'var(--amber)' }}>Empowered</span>
              </h1>
              <p style={{ fontSize:14,color:'var(--textMut)',lineHeight:1.75,marginBottom:28 }}>{t('loginSub')}</p>
              <div style={{ display:'flex',gap:32 }}>
                {[['2.5L+',t('villages'),'var(--primary)'],['12M+',t('families'),'var(--amber)'],['98%',t('uptime'),'var(--teal)']].map(([n,l,c])=>(
                  <div key={l} style={{ textAlign:'center' }}>
                    <div style={{ fontFamily:"'Sora',sans-serif",fontSize:26,fontWeight:800,color:c }}>{n}</div>
                    <div style={{ fontSize:10,color:'var(--textDim)',textTransform:'uppercase',letterSpacing:'0.08em',marginTop:2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* SVG Illustration */}
            <div style={{ flex:1,maxWidth:460,display:'flex',alignItems:'center',justifyContent:'center' }}>
              <svg className="lp-svg" viewBox="0 0 440 320" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width:'100%',maxWidth:420,filter:'drop-shadow(0 16px 40px rgba(22,163,74,.12))' }}>
                <defs>
                  <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dff6e9"/><stop offset="100%" stopColor="#c7f0d5"/></linearGradient>
                  <linearGradient id="gnd2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#86efac"/><stop offset="100%" stopColor="#4ade80"/></linearGradient>
                </defs>
                <rect width="440" height="320" fill="url(#sky2)" rx="18"/>
                <circle cx="385" cy="42" r="30" fill="#fde68a" opacity=".8"/>
                <ellipse cx="80" cy="195" rx="105" ry="50" fill="#bbf7d0" opacity=".9"/>
                <ellipse cx="330" cy="200" rx="135" ry="55" fill="#bbf7d0" opacity=".8"/>
                <ellipse cx="205" cy="185" rx="155" ry="48" fill="#a7f3c0" opacity=".95"/>
                <rect x="0" y="225" width="440" height="95" fill="url(#gnd2)"/>
                <rect x="167" y="175" width="106" height="60" fill="#dbeafe" rx="2"/>
                <rect x="177" y="206" width="86" height="8" fill="#bfdbfe"/>
                <polygon points="220,60 195,145 245,145" fill="#D97706" opacity=".9"/>
                <polygon points="220,75 200,140 240,140" fill="#F59E0B"/>
                <rect x="208" y="175" width="24" height="30" fill="#7c3aed" rx="12 12 0 0"/>
                <rect x="40" y="195" width="55" height="40" fill="#dcfce7" rx="4"/><polygon points="35,198 67,170 98,198" fill="#16a34a" opacity=".85"/>
                <rect x="332" y="190" width="58" height="45" fill="#dbeafe" rx="4"/><polygon points="327,193 361,163 393,193" fill="#2563eb" opacity=".8"/>
                <line x1="110" y1="100" x2="110" y2="215" stroke="#16a34a" strokeWidth="2.5"/>
                <g className="lp-b1"><line x1="110" y1="105" x2="110" y2="77" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/><line x1="110" y1="105" x2="134" y2="119" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/><line x1="110" y1="105" x2="86" y2="119" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/></g>
                <circle cx="110" cy="105" r="4" fill="#16a34a"/>
                <line x1="310" y1="110" x2="310" y2="220" stroke="#16a34a" strokeWidth="2"/>
                <g className="lp-b2"><line x1="310" y1="115" x2="310" y2="93" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/><line x1="310" y1="115" x2="329" y2="126" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/><line x1="310" y1="115" x2="291" y2="126" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round"/></g>
                <circle cx="310" cy="115" r="3" fill="#16a34a"/>
                <rect x="143" y="215" width="6" height="20" fill="#92400e"/><ellipse cx="146" cy="208" rx="14" ry="18" fill="#16a34a"/>
                <rect x="280" y="215" width="6" height="18" fill="#92400e"/><ellipse cx="283" cy="207" rx="15" ry="18" fill="#16a34a"/>
              </svg>
            </div>
          </div>

          {/* Role Selector + Login Card */}
          <div style={{ padding:'28px 36px 52px',maxWidth:1120,margin:'0 auto',width:'100%' }}>
            <h2 style={{ fontSize:22,textAlign:'center',marginBottom:5,animation:'fadeUp .5s ease .2s both' }}>{t('selectLoginType')}</h2>
            <p style={{ textAlign:'center',fontSize:13,color:'var(--textMut)',marginBottom:26,animation:'fadeUp .5s ease .25s both' }}>{t('selectLoginTypeSub')}</p>

            {/* Role Cards */}
            <div className="lp-roles" style={{ display:'flex',gap:14,justifyContent:'center',marginBottom:32,animation:'fadeUp .5s ease .3s both' }}>
              {[
                { id:'admin',  icon:'🛡️', nameKey:'adminLogin',  descKey:'adminDesc',  c:'var(--amber)',   bg:'var(--amberG)',  bc:'rgba(217,119,6,.4)' },
                { id:'head',   icon:'👨‍👩‍👧‍👦', nameKey:'headLogin',   descKey:'headDesc',   c:'var(--primary)', bg:'var(--primaryG)',bc:'rgba(22,163,74,.4)' },
                { id:'member', icon:'👤', nameKey:'memberLogin', descKey:'memberDesc', c:'var(--teal)',    bg:'var(--tealG)',   bc:'rgba(8,145,178,.4)' },
              ].map(rc => {
                const active = loginRole===rc.id;
                return (
                  <div key={rc.id} className="role-card" onClick={()=>setLoginRole(rc.id)} style={{ flex:1,maxWidth:290,borderColor:active?rc.c:'var(--border)',background:active?rc.bg:'var(--surface)',boxShadow:active?`0 8px 28px ${rc.bg}`:'' }}>
                    {active && <div style={{ position:'absolute',top:0,left:'10%',right:'10%',height:2,background:`linear-gradient(90deg,transparent,${rc.c},transparent)` }}/>}
                    {active && <div style={{ position:'absolute',top:10,right:10,width:18,height:18,borderRadius:'50%',background:rc.c,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff',animation:'popIn .3s ease' }}>✓</div>}
                    <div style={{ width:54,height:54,borderRadius:14,background:active?rc.bg:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,margin:'0 auto 12px',boxShadow:active?`0 4px 16px ${rc.bg}`:'',transition:'all .3s' }}>{rc.icon}</div>
                    <div style={{ fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:700,color:active?rc.c:'var(--text)',marginBottom:4 }}>{t(rc.nameKey)}</div>
                    <div style={{ fontSize:11.5,color:'var(--textMut)',lineHeight:1.5 }}>{t(rc.descKey)}</div>
                  </div>
                );
              })}
            </div>

            {/* Login Card */}
            <div ref={cardRef} style={{ maxWidth:460,margin:'0 auto',animation:'fadeUp .5s ease .4s both' }}>
              <div style={{ background:'var(--surface)',border:`2px solid ${cfg.border}`,borderRadius:'var(--r-xl)',padding:'32px 28px',boxShadow:`var(--shadow-md), 0 0 0 6px ${cfg.bg}`,position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',top:0,left:'10%',right:'10%',height:2,background:`linear-gradient(90deg,transparent,${cfg.color},transparent)` }}/>
                <div style={{ display:'inline-flex',alignItems:'center',gap:7,padding:'5px 14px',background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:99,fontSize:12,fontWeight:700,color:cfg.color,marginBottom:18,letterSpacing:'.04em' }}>{cfg.label}</div>
                <div style={{ fontFamily:"'Sora',sans-serif",fontSize:21,fontWeight:700,marginBottom:4,color:'var(--text)' }}>
                  {loginRole==='admin'?'Administrator Portal':loginRole==='head'?'Head of Family Portal':'Family Member Access'}
                </div>
                <div style={{ fontSize:13,color:'var(--textMut)',marginBottom:22,lineHeight:1.6 }}>
                  {loginRole==='admin'?'Manage the panchayat with full access.':loginRole==='head'?'Manage your family account and applications.':'Access your family portal and services.'}
                </div>

                <F2 label={t('mobileEmail')} icon="📱" value={loginId} onChange={setLoginId} placeholder={t('mobileEmailPlaceholder')}/>
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>{t('password')}</label>
                  <div style={{ position:'relative' }}><span style={IC}>🔒</span>
                    <input className="gc-inp" value={loginPass} onChange={e=>setLoginPass(e.target.value)} type={showLP?'text':'password'} placeholder={t('passwordPlaceholder')} onKeyDown={e=>e.key==='Enter'&&handleLogin()} style={{ paddingRight:46 }}/>
                    <button className="gc-pw-toggle" onClick={()=>setShowLP(!showLP)}>{showLP?'🙈':'👁'}</button>
                  </div>
                </div>

                {(loginRole==='head'||loginRole==='member') && (
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14 }}>
                    <div><label style={LBL}>{t('village')} *</label><div style={{ position:'relative' }}><span style={IC}>🏘️</span><input className="gc-inp" value={loginVillage} onChange={e=>setLoginVil(e.target.value)} placeholder={t('villagePlaceholder')}/></div></div>
                    <div><label style={LBL}>{t('pincode')}</label><div style={{ position:'relative' }}><span style={IC}>📮</span><input className="gc-inp" type="tel" placeholder={t('pincode')} maxLength={6}/></div></div>
                  </div>
                )}

                <div style={{ textAlign:'right',marginBottom:18 }}>
                  <button onClick={()=>setForgotOpen(true)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:12,fontWeight:600,color:cfg.color }}>{t('forgotPassword')}</button>
                </div>

                <button className="gc-btn gc-btn-full" onClick={handleLogin} disabled={loginLoading}
                  style={{ background:cfg.grad,color:'#fff',boxShadow:`0 6px 20px ${cfg.sh}`,fontSize:15,padding:'13px' }}>
                  {loginLoading ? <><span style={{animation:'spin .8s linear infinite',display:'inline-block',marginRight:8}}>⟳</span>{t('loggingIn')}</> : t('loginBtn')}
                </button>

                <div style={{ display:'flex',alignItems:'center',gap:12,margin:'20px 0' }}>
                  <div style={{ flex:1,height:1,background:'var(--border)' }}/><span style={{ fontSize:11,color:'var(--textDim)',letterSpacing:'0.08em',textTransform:'uppercase' }}>{t('newHere')}</span><div style={{ flex:1,height:1,background:'var(--border)' }}/>
                </div>
                <div style={{ textAlign:'center',fontSize:13,color:'var(--textMut)' }}>
                  {t('noAccount')}{' '}
                  <button onClick={goSignup} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--primary)',fontSize:13,fontWeight:700,marginLeft:4 }}>{t('registerNow')}</button>
                </div>
              </div>
              <div style={{ textAlign:'center',marginTop:14,fontSize:11,color:'var(--textDim)',letterSpacing:'0.05em' }}>{t('sslNote')}</div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════ SIGNUP VIEW ════════════════ */}
      {view==='signup' && (
        <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',padding:'32px 24px 52px' }}>
          <div style={{ textAlign:'center',marginBottom:28,animation:'fadeUp .5s ease both' }}>
            <div style={{ display:'inline-flex',alignItems:'center',gap:7,padding:'5px 14px',background:'var(--primaryG)',border:'1px solid rgba(22,163,74,.25)',borderRadius:99,fontSize:11,fontWeight:600,color:'var(--primaryD)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:14 }}>{t('familyRegistration')}</div>
            <h1 style={{ fontSize:26,fontWeight:800,marginBottom:8 }}>{t('headRegTitle')}</h1>
            <p style={{ fontSize:13,color:'var(--textMut)',maxWidth:440,lineHeight:1.65 }}>{t('headRegSub')}</p>
          </div>

          <div style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r-xl)',padding:'32px',width:'100%',maxWidth:560,boxShadow:'var(--shadow-md)',position:'relative',overflow:'hidden',animation:'fadeUp .4s ease both' }}>
            <div style={{ position:'absolute',top:0,left:'10%',right:'10%',height:2,background:'linear-gradient(90deg,transparent,var(--primary),transparent)' }}/>

            {signupDone ? (
              <div style={{ textAlign:'center',padding:'20px 0',animation:'fadeUp .4s ease both' }}>
                <div style={{ width:76,height:76,borderRadius:'50%',background:'var(--primaryG)',border:'2px solid var(--primaryD)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:34,marginBottom:18,animation:'popIn .5s ease' }}>✓</div>
                <div style={{ fontFamily:"'Sora',sans-serif",fontSize:24,fontWeight:800,marginBottom:10 }}>{t('familyRegistered')}</div>
                <div style={{ fontSize:14,color:'var(--textMut)',lineHeight:1.7,marginBottom:24 }}>{t('registeredMsg')}</div>
                <button className="gc-btn gc-btn-primary" style={{ minWidth:200 }} onClick={()=>{goLogin();setSignupDone(false);setStep(1);}}>{t('goLogin')}</button>
              </div>
            ) : (
              <>
                {/* Step indicator */}
                <div style={{ display:'flex',alignItems:'center',marginBottom:28 }}>
                  {[1,2,3].map(n => (
                    <div key={n} style={{ display:'flex',alignItems:'center',flex:n<3?1:'none' }}>
                      <div style={{ width:32,height:32,borderRadius:'50%',border:`2px solid ${step>n?'var(--teal)':step===n?'var(--primary)':'var(--border)'}`,background:step>n?'var(--teal)':step===n?'var(--primary)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,fontFamily:"'Sora',sans-serif",color:step>=n?'#fff':'var(--textDim)',flexShrink:0,boxShadow:step===n?'0 0 0 4px var(--primaryG)':'',transition:'all .3s' }}>
                        {step>n?'✓':n}
                        <span style={{ position:'absolute',top:36,left:'50%',transform:'translateX(-50%)',fontSize:9.5,color:step===n?'var(--primary)':'var(--textDim)',letterSpacing:'0.05em',textTransform:'uppercase',whiteSpace:'nowrap',fontFamily:"'Sora',sans-serif",fontWeight:600 }}>
                          {[t('headInfoStep'),t('membersStep'),t('securityStep')][n-1]}
                        </span>
                      </div>
                      {n<3 && <div style={{ flex:1,height:2,background:step>n?'var(--teal)':'var(--border)',margin:'0 -2px',transition:'background .3s' }}/>}
                    </div>
                  ))}
                </div>

                {/* ── STEP 1 ── */}
                {step===1 && (
                  <div className="lp-in">
                    <div style={{ fontFamily:"'Sora',sans-serif",fontSize:19,fontWeight:700,marginBottom:4 }}>{t('headDetails')}</div>
                    <div style={{ fontSize:13,color:'var(--textMut)',marginBottom:20 }}>{t('primaryHolder')}</div>
                    <F2 label={`${t('fullName')} *`} icon="👤" value={s1.name} onChange={v=>setS1({...s1,name:v})} placeholder={t('asPerAadhaar')}/>
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                      <div><label style={LBL}>{t('aadhaarNumber')} *</label><div style={{ position:'relative' }}><span style={IC}>🪪</span><input className="gc-inp" type="tel" value={s1.aadhaar} onChange={e=>setS1({...s1,aadhaar:fmtAadh(e.target.value)})} placeholder="XXXX XXXX XXXX" maxLength={14}/></div></div>
                      <div><label style={LBL}>{t('age')} *</label><div style={{ position:'relative' }}><span style={IC}>🎂</span><input className="gc-inp" type="tel" value={s1.age} onChange={e=>setS1({...s1,age:e.target.value})} placeholder={t('age')} maxLength={3}/></div></div>
                    </div>
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                      <div><label style={LBL}>{t('gender')} *</label><select className="gc-inp ni" value={s1.gender} onChange={e=>setS1({...s1,gender:e.target.value})}><option value="">Select</option>{['Male','Female','Other'].map(g=><option key={g}>{g}</option>)}</select></div>
                      <div><label style={LBL}>{t('mobile')} *</label><div style={{ position:'relative' }}><span style={IC}>📱</span><input className="gc-inp" type="tel" value={s1.mobile} onChange={e=>setS1({...s1,mobile:e.target.value})} placeholder="10-digit" maxLength={10}/></div></div>
                    </div>
                    <F2 label={`${t('address')} *`} icon="🏠" value={s1.address} onChange={v=>setS1({...s1,address:v})} placeholder={t('houseStreet')}/>
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                      <div><label style={LBL}>{t('village')} *</label><div style={{ position:'relative' }}><span style={IC}>🏘️</span><input className="gc-inp" value={s1.village} onChange={e=>setS1({...s1,village:e.target.value})} placeholder={t('village')}/></div></div>
                      <div><label style={LBL}>{t('pincode')} *</label><div style={{ position:'relative' }}><span style={IC}>📮</span><input className="gc-inp" type="tel" value={s1.pincode} onChange={e=>setS1({...s1,pincode:e.target.value})} placeholder={t('pincode')} maxLength={6}/></div></div>
                    </div>

                    {/* Document Upload */}
                    <div style={{ marginBottom:22 }}>
                      <label style={{ ...LBL,marginBottom:10 }}>{t('identityProof')} <span style={{ color:'var(--danger)',textTransform:'none' }}>* {t('mandatory')}</span></label>
                      <div style={{ display:'flex',gap:8,marginBottom:12 }}>
                        {[{id:'aadhaar',icon:'🪪',labelKey:'aadhaar'},{id:'ration',icon:'🍚',labelKey:'ration'},{id:'voter',icon:'🗳️',labelKey:'voterId'}].map(d=>(
                          <div key={d.id} onClick={()=>setDocType(d.id)} style={{ flex:1,padding:'10px 6px',background:docType===d.id?'var(--tealG)':'var(--surface2)',border:`1.5px solid ${docType===d.id?'var(--teal)':'var(--border)'}`,borderRadius:'var(--r)',textAlign:'center',cursor:'pointer',transition:'all .2s' }}>
                            <div style={{ fontSize:20,marginBottom:4 }}>{d.icon}</div><div style={{ fontSize:10,fontWeight:600,color:docType===d.id?'var(--teal)':'var(--textMut)',textTransform:'uppercase' }}>{t(d.labelKey)}</div>
                          </div>
                        ))}
                      </div>
                      <div className={`gc-upload-zone${docFile?' active':''}`} onClick={()=>document.getElementById('gcRfi').click()} style={{ borderColor:docError?'var(--danger)':'' }}>
                        {docFile ? <><div style={{ fontSize:26,marginBottom:6 }}>✅</div><div style={{ fontSize:13,color:'var(--teal)',fontWeight:600 }}>{docFileName}</div><div style={{ fontSize:11,color:'var(--textDim)',marginTop:4 }}>{t('clickChange')}</div></> : <><div style={{ fontSize:30,marginBottom:8 }}>📤</div><div style={{ fontSize:14,color:'var(--textMut)' }}><strong style={{ color:'var(--primary)' }}>Click to upload</strong> your document</div><div style={{ fontSize:11,color:'var(--textDim)',marginTop:5 }}>JPG, PNG or PDF · max 5MB</div></>}
                      </div>
                      <input id="gcRfi" type="file" style={{ display:'none' }} accept=".jpg,.jpeg,.png,.pdf" onChange={e=>{if(e.target.files[0]){setDocFile(e.target.files[0]);setDocFN(e.target.files[0].name);setDocError('');}}}/>
                      {docError && <div style={{ color:'var(--danger)',fontSize:12,marginTop:6 }}>⚠ {docError}</div>}
                    </div>
                    <button className="gc-btn gc-btn-primary gc-btn-full" onClick={()=>{if(!s1.name||!s1.aadhaar||!s1.mobile||!s1.gender){showToast('Fill all required fields','warning');return;}if(!docFile){setDocError('Please upload identity document');showToast('Document is mandatory','warning');return;}goStep(2);}}>{t('continueMembers')}</button>
                  </div>
                )}

                {/* ── STEP 2 ── */}
                {step===2 && (
                  <div className="lp-in">
                    <div style={{ fontFamily:"'Sora',sans-serif",fontSize:19,fontWeight:700,marginBottom:4 }}>{t('familyMembers')}</div>
                    <div style={{ fontSize:13,color:'var(--textMut)',marginBottom:16 }}>{t('addHousehold')}</div>
                    <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:12 }}>
                      <MCard name={s1.name||'Head of Family'} meta={t('primaryAccountHolder')} isHead/>
                      {members.map((m,i) => <MCard key={m._id} name={m.name} meta={`${m.relation} · Age ${m.age||'?'}`} onRemove={()=>{setMembers(members.filter((_,j)=>j!==i));showToast('Member removed','info');}}/>)}
                    </div>
                    {showAddForm && (
                      <div style={{ background:'var(--tealG)',border:'1px solid rgba(8,145,178,.2)',borderRadius:'var(--r-lg)',padding:18,marginBottom:12,animation:'fadeUp .3s ease both' }}>
                        <div style={{ fontSize:11,fontWeight:700,color:'var(--teal)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:14 }}>+ {t('newMember')}</div>
                        {memberError && <div className="gc-err" style={{ marginBottom:12 }}>⚠ {memberError}</div>}
                        <F2 label={`${t('fullName')} *`} icon="👤" value={newMember.name} onChange={v=>setNewMember({...newMember,name:v})} placeholder="Member name"/>
                        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12 }}>
                          <div><label style={LBL}>{t('aadhaarLast4')}</label><div style={{ position:'relative' }}><span style={IC}>🪪</span><input className="gc-inp" type="tel" value={newMember.aadhaarLast4} onChange={e=>setNewMember({...newMember,aadhaarLast4:e.target.value})} placeholder="XXXX" maxLength={4}/></div></div>
                          <div><label style={LBL}>{t('age')}</label><div style={{ position:'relative' }}><span style={IC}>🎂</span><input className="gc-inp" type="tel" value={newMember.age} onChange={e=>setNewMember({...newMember,age:e.target.value})} placeholder={t('age')} maxLength={3}/></div></div>
                        </div>
                        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14 }}>
                          <div><label style={LBL}>{t('gender')}</label><select className="gc-inp ni" value={newMember.gender} onChange={e=>setNewMember({...newMember,gender:e.target.value})}>{['Male','Female','Other'].map(g=><option key={g}>{g}</option>)}</select></div>
                          <div><label style={LBL}>{t('relation')} *</label><select className="gc-inp ni" value={newMember.relation} onChange={e=>setNewMember({...newMember,relation:e.target.value})}>{['Spouse','Son','Daughter','Father','Mother','Brother','Sister','Grandfather','Grandmother','Other'].map(r=><option key={r}>{r}</option>)}</select></div>
                        </div>
                        <div style={{ display:'flex',gap:10 }}>
                          <button className="gc-btn gc-btn-ghost" style={{ flex:1 }} onClick={()=>{setShowAF(false);setMemberErr('');}}>{t('cancel')}</button>
                          <button className="gc-btn gc-btn-teal" style={{ flex:2 }} onClick={saveMember}>{t('saveMember')}</button>
                        </div>
                      </div>
                    )}
                    {!showAddForm && <button onClick={()=>setShowAF(true)} style={{ width:'100%',padding:11,background:'var(--tealG)',border:'1.5px dashed var(--teal)',borderRadius:'var(--r)',color:'var(--teal)',fontSize:13,fontWeight:600,cursor:'pointer',marginBottom:16,transition:'all .2s' }}>{t('addMember')}</button>}
                    <div style={{ borderTop:'1px solid var(--border)',paddingTop:16,marginBottom:18 }}>
                      <div style={{ fontSize:10.5,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--textDim)',marginBottom:14 }}>{t('headAccessControls')}</div>
                      {[['allowMembersViewRecords',t('allowViewRecords')],['requireHeadApproval',t('requireApproval')],['freezeAllMemberAccess',t('freezeAccess')]].map(([k,label])=>(
                        <div key={k} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)' }}>
                          <span style={{ fontSize:13,color:'var(--textMd)' }}>{label}</span>
                          <div onClick={()=>setAC({...accessControls,[k]:!accessControls[k]})} style={{ width:42,height:24,background:accessControls[k]?'var(--primary)':'var(--border)',borderRadius:99,position:'relative',cursor:'pointer',transition:'background .3s',flexShrink:0 }}>
                            <div style={{ position:'absolute',top:3,left:accessControls[k]?21:3,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left .3s cubic-bezier(.4,0,.2,1)',boxShadow:'0 1px 4px rgba(0,0,0,.2)' }}/>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:'flex',gap:10 }}>
                      <button className="gc-btn gc-btn-ghost" style={{ flex:1 }} onClick={()=>goStep(1)}>← {t('back')}</button>
                      <button className="gc-btn gc-btn-primary" style={{ flex:2 }} onClick={()=>goStep(3)}>{t('continueSecure')}</button>
                    </div>
                  </div>
                )}

                {/* ── STEP 3 ── */}
                {step===3 && (
                  <div className="lp-in">
                    <div style={{ fontFamily:"'Sora',sans-serif",fontSize:19,fontWeight:700,marginBottom:4 }}>{t('familySecurity')}</div>
                    <div style={{ fontSize:13,color:'var(--textMut)',marginBottom:18 }}>{t('setPinSub')}</div>
                    <div className="gc-info" style={{ marginBottom:18 }}>{t('pinInfoBox')}</div>
                    <label style={{ ...LBL,textAlign:'center',display:'block',marginBottom:12 }}>{t('setFamilyPin')} *</label>
                    <div style={{ display:'flex',gap:12,justifyContent:'center',marginBottom:20 }}>
                      {pin.map((v,i)=><input key={i} id={`gc_p${i}`} value={v} onChange={e=>pinIn(e.target.value,i)} onKeyDown={e=>pinBk(e,i)} maxLength={1} type="tel" className={`gc-pin${v?' filled':''}`}/>)}
                    </div>
                    <div style={{ marginBottom:14 }}>
                      <label style={LBL}>{t('securityQuestion')} *</label>
                      <select className="gc-inp ni" value={secQ} onChange={e=>setSecQ(e.target.value)}>
                        <option value="">{t('chooseQuestion')}</option>
                        {["What is your first pet's name?","What is your mother's maiden name?","What was your first school?","What is your childhood nickname?","What street did you grow up on?"].map(q=><option key={q}>{q}</option>)}
                      </select>
                    </div>
                    <F2 label={`${t('yourAnswer')} *`} icon="💬" value={secA} onChange={setSecA} placeholder={t('answerPlaceholder')}/>
                    <div style={{ marginBottom:18 }}>
                      <label style={LBL}>{t('createPassword')} *</label>
                      <div style={{ position:'relative' }}><span style={IC}>🔒</span>
                        <input className="gc-inp" type={showNewPass?'text':'password'} value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder={t('minChars')} style={{ paddingRight:46 }}/>
                        <button className="gc-pw-toggle" onClick={()=>setShowNP(!showNewPass)}>{showNewPass?'🙈':'👁'}</button>
                      </div>
                    </div>
                    <div style={{ background:'var(--primaryG)',border:'1px solid rgba(22,163,74,.2)',borderRadius:'var(--r-lg)',padding:16,marginBottom:20 }}>
                      <div style={{ fontSize:12,fontWeight:600,color:'var(--primaryD)',marginBottom:12 }}>{t('mobileOtpVerify')}</div>
                      {!otpSent ? (
                        <button className="gc-btn gc-btn-primary gc-btn-full" onClick={sendRegOtp} disabled={otpLoading}>
                          {otpLoading ? <span style={{animation:'spin .8s linear infinite',display:'inline-block'}}>⟳</span> : `${t('sendOtpTo')}${s1.mobile}`}
                        </button>
                      ) : otpVerified ? (
                        <div style={{ textAlign:'center',color:'var(--primaryD)',fontWeight:600,fontSize:14 }}>{t('mobileVerified')}</div>
                      ) : (
                        <>
                          {regDemoOtp && <div className="gc-info" style={{ marginBottom:12 }}>Demo OTP: <strong>{regDemoOtp}</strong></div>}
                          <div style={{ display:'flex',gap:8,justifyContent:'center',marginBottom:12 }}>
                            {regOtp.map((v,i)=><input key={i} id={`gr${i}`} value={v} maxLength={1} type="tel" className="gc-otp" onChange={e=>otpIn(e.target.value,i,regOtp,setRegOtp,'gr')} onKeyDown={e=>otpBk(e,i,regOtp,'gr')}/>)}
                          </div>
                          <div style={{ display:'flex',gap:10 }}>
                            <button className="gc-btn gc-btn-primary" style={{ flex:2 }} onClick={verifyRegOtp}>{t('verifyOtp')}</button>
                            <button className="gc-btn gc-btn-ghost" style={{ flex:1 }} onClick={sendRegOtp}>{t('resend')}</button>
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ display:'flex',gap:10 }}>
                      <button className="gc-btn gc-btn-ghost" style={{ flex:1 }} onClick={()=>goStep(2)}>← {t('back')}</button>
                      <button className="gc-btn gc-btn-primary" style={{ flex:2 }} onClick={handleSignupSubmit} disabled={signupLoading}>
                        {signupLoading ? <><span style={{animation:'spin .8s linear infinite',display:'inline-block',marginRight:8}}>⟳</span>{t('registering')}</> : t('registerFamily')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <div style={{ marginTop:16,fontSize:11,color:'var(--textDim)',letterSpacing:'0.05em',textAlign:'center' }}>{t('sslNote')}</div>
        </div>
      )}
    </div>
  );
}
