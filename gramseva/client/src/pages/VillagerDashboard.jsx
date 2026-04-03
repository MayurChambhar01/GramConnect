import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { showToast } from '../components/Toast';
import api from '../api/axios';
import GramMitraBot from '../components/GramMitraBot';
import FaceAttendance from '../components/FaceAttendance';
import FakeDetector from '../components/FakeDetector';
import GramVote from '../components/GramVote';
import SchemeChecker from '../components/SchemeChecker';
import AssetTracker from '../components/AssetTracker';
import VoiceAssistant from '../components/VoiceAssistant';
import LivePhotoCapture from '../components/LivePhotoCapture';

/* ─── THEME ─── */
const P = '#16A34A', PD = '#15803D', PG = 'rgba(22,163,74,0.10)';
const A = '#D97706', AD = '#B45309', AG = 'rgba(217,119,6,0.10)';
const TL = '#0891B2', TLD = '#0e7490', TLG = 'rgba(8,145,178,0.10)';
const BG = '#F0F4F8', BG2 = '#E8EDF5', CARD = '#FFFFFF';
const BDR = '#E2E8F0', BDRH = '#CBD5E1';
const TX = '#0F172A', MUT = '#64748B', DIM = '#94A3B8';
const DNG = '#DC2626', SUC = '#16A34A';

const PAGES = [
  {id:'home',      icon:'🏠', label:'Overview'},
  {id:'marketplace',icon:'🛒',label:'Marketplace'},
  {id:'certificates',icon:'📜',label:'Certificates'},
  {id:'complaints',icon:'📋',label:'Complaints'},
  {id:'payments',  icon:'💳',label:'Payments'},
  {id:'schemes',   icon:'🏛', label:'Schemes'},
  {id:'sabha',     icon:'🤝',label:'Gram Sabha'},
  {id:'sos',       icon:'🚨',label:'SOS'},
  {id:'family',    icon:'👨‍👩‍👧‍👦',label:'Family'},
  {id:'vote',      icon:'🗳️',label:'Voting'},
  {id:'checker',   icon:'🧾',label:'Scheme Checker'},
  {id:'assets',    icon:'📍',label:'Assets'},
  {id:'voice',     icon:'📻',label:'Voice Help'},
  {id:'settings',  icon:'⚙️', label:'Settings'},
];

const BOTTOM_NAV = [
  {id:'home',icon:'🏠',label:'Home'},
  {id:'marketplace',icon:'🛒',label:'Market'},
  {id:'complaints',icon:'📋',label:'Complaints'},
  {id:'payments',icon:'💳',label:'Payments'},
  {id:'settings',icon:'⚙️',label:'Settings'},
];

/* ─── Style helpers ─── */
const LBL = { display:'block',fontSize:11,fontWeight:700,color:MUT,letterSpacing:'0.07em',textTransform:'uppercase',marginBottom:7 };
const inp = { width:'100%',border:`1px solid ${BDR}`,borderRadius:10,padding:'10px 13px',fontSize:13,color:TX,background:BG2,outline:'none',fontFamily:"'Plus Jakarta Sans',sans-serif",transition:'all .2s',display:'block' };
const td  = { padding:'11px 14px',fontSize:13,borderTop:`1px solid ${BDR}`,color:TX,verticalAlign:'middle' };

export default function VillagerDashboard() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { t: tr, lang, switchLang, langs } = useLang();
  const [page, setPage] = useState('home');
  const [livePhotoModal, setLivePhotoModal] = useState(false);

  /* ─── DATA ─── */
  const [complaints, setComplaints]   = useState([]);
  const [certs, setCerts]             = useState([]);
  const [taxes, setTaxes]             = useState([]);
  const [notifs, setNotifs]           = useState([]);
  const [family, setFamily]           = useState(null);
  const [schemes, setSchemes]         = useState([]);
  const [schemeApps, setSchemeApps]   = useState([]);
  const [payments, setPayments]       = useState([]);

  /* ─── MODALS ─── */
  const [certModal, setCertModal]             = useState(false);
  const [complainModal, setComplainModal]     = useState(false);
  const [payModal, setPayModal]               = useState(false);
  const [sabhaModal, setSabhaModal]           = useState(false);
  const [faceModal, setFaceModal]             = useState(false);
  const [sosModal, setSOSModal]               = useState(false);
  const [profileModal, setProfileModal]       = useState(false);
  const [schemeModal, setSchemeModal]         = useState(null);
  const [addMemberModal, setAddMemberModal]   = useState(false);

  /* ─── FORMS ─── */
  const [settingsData, setSettingsData]   = useState({ name:'', address:'', village:'', pincode:'', age:'', gender:'' });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [certType, setCertType]           = useState('income');
  const [certPurpose, setCertPurpose]     = useState('');
  const [cCat, setCCat]                   = useState('water');
  const [cDesc, setCDesc]                 = useState('');
  const [cLoc, setCLoc]                   = useState('');
  const [cPhotos, setCPhotos]             = useState([]);
  const [gpsLoading, setGpsLoading]       = useState(false);
  const [gpsCoords, setGpsCoords]         = useState(null);
  const [selTax, setSelTax]               = useState(null);
  const [payMethod, setPayMethod]         = useState('UPI');
  const [upiId, setUpiId]                 = useState('');
  const [payLoading, setPayLoading]       = useState(false);
  const [sabhaPhoto, setSabhaPhoto]       = useState(null);
  const [sabhaGps, setSabhaGps]           = useState('');
  const sabhaFileRef = useRef();
  const [schemeForm, setSchemeForm]       = useState({ applicantName:'', age:'', income:'', landAcres:'', bankAccount:'', ifsc:'', reason:'' });
  const [schemeLoading, setSchemeLoading] = useState(false);
  const [newMember, setNewMember]         = useState({ name:'', aadhaarLast4:'', age:'', gender:'Male', relation:'Spouse' });
  const [memberLoading, setMemberLoading] = useState(false);
  const [notifBell, setNotifBell]         = useState(false);

  /* ─── WEATHER ─── */
  const [weather, setWeather]             = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherLoc, setWeatherLoc]       = useState('');

  /* ─── MARKETPLACE ─── */
  const [marketListings, setMarketListings]   = useState([]);
  const [myListings, setMyListings]           = useState([]);
  const [mandiPrices, setMandiPrices]         = useState([]);
  const [marketTab, setMarketTab]             = useState('browse'); // browse | sell | mandi | my
  const [marketCatFilter, setMarketCatFilter] = useState('all');
  const [listingModal, setListingModal]       = useState(false);
  const [sellForm, setSellForm]               = useState({ product:'', category:'grain', quantity:'', unit:'kg', pricePerUnit:'', minOrderQty:'1', description:'', isOrganic:false, location:'' });
  const [sellLoading, setSellLoading]         = useState(false);
  const [contactModal, setContactModal]       = useState(null);

  /* ─── WEATHER ─── */
  const fetchWeather = useCallback((lat, lon, locName) => {
    setWeatherLoading(true);
    setWeatherLoc(locName || `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia/Kolkata&forecast_days=5`)
      .then(r => r.json())
      .then(d => { setWeather(d); setWeatherLoading(false); })
      .catch(() => setWeatherLoading(false));
  }, []);

  const autoDetectWeather = useCallback(() => {
    if (!navigator.geolocation) return;
    setWeatherLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => fetchWeather(pos.coords.latitude, pos.coords.longitude, user?.village || ''),
      () => { fetchWeather(20.5937, 78.9629, 'India'); }, // fallback centre of India
      { timeout: 8000 }
    );
  }, [fetchWeather, user]);

  /* ─── MARKETPLACE ─── */
  const fetchMarket = useCallback(async () => {
    try {
      const [listings, mine, mandi] = await Promise.all([
        api.get('/marketplace/listings'),
        api.get('/marketplace/my'),
        api.get('/marketplace/mandi-prices'),
      ]);
      setMarketListings(listings.data.listings || []);
      setMyListings(mine.data.listings || []);
      setMandiPrices(mandi.data.prices || []);
    } catch(e) { console.error('Market fetch error', e); }
  }, []);

  const submitListing = async () => {
    if (!sellForm.product || !sellForm.quantity || !sellForm.pricePerUnit) {
      showToast('Product, quantity and price are required', 'warning'); return;
    }
    setSellLoading(true);
    try {
      await api.post('/marketplace', sellForm);
      showToast('✅ Listing published! Buyers can now contact you.', 'success');
      setListingModal(false);
      setSellForm({ product:'', category:'grain', quantity:'', unit:'kg', pricePerUnit:'', minOrderQty:'1', description:'', isOrganic:false, location:'' });
      fetchMarket();
    } catch(e) { showToast(e.response?.data?.message || 'Failed to publish', 'error'); }
    finally { setSellLoading(false); }
  };

  const removeListing = async (id) => {
    if (!window.confirm('Remove this listing?')) return;
    try { await api.delete(`/marketplace/${id}`); showToast('Listing removed', 'info'); fetchMarket(); }
    catch { showToast('Failed', 'error'); }
  };

  const markSold = async (id) => {
    try { await api.patch(`/marketplace/${id}/status`, { status: 'sold' }); showToast('Marked as sold!', 'success'); fetchMarket(); }
    catch { showToast('Failed', 'error'); }
  };

  const fetchAll = useCallback(async () => {
    try {
      const [c,cert,t,n,fam,sch,schApp,pay] = await Promise.all([
        api.get('/complaints/my'), api.get('/certificates/my'), api.get('/taxes/my'),
        api.get('/notifications'), api.get('/families/my'), api.get('/schemes'),
        api.get('/schemes/my'), api.get('/payments/my'),
      ]);
      setComplaints(c.data.complaints||[]); setCerts(cert.data.certificates||[]);
      setTaxes(t.data.taxes||[]); setNotifs(n.data.notifications||[]);
      setFamily(fam.data.family); setSchemes(sch.data.schemes||[]);
      setSchemeApps(schApp.data.applications||[]); setPayments(pay.data.payments||[]);
    } catch(e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchMarket();
    autoDetectWeather();
    if (user) setSettingsData({ name:user.name||'', address:user.address||'', village:user.village||'', pincode:user.pincode||'', age:user.age||'', gender:user.gender||'' });
  }, [fetchAll, fetchMarket, autoDetectWeather, user]);

  const getGPS = (onSuccess) => {
    setGpsLoading(true);
    if (!navigator.geolocation) { showToast('GPS not supported','error'); setGpsLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { const {latitude:lat,longitude:lng}=pos.coords; const loc=`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`; setGpsCoords({lat,lng}); if(onSuccess)onSuccess(loc,lat,lng); setGpsLoading(false); showToast(`GPS: ${loc}`,'success'); },
      () => { showToast('GPS denied. Enable location access.','error'); setGpsLoading(false); },
      { enableHighAccuracy:true, timeout:10000 }
    );
  };
  const getGPSForSabha = () => { if(!navigator.geolocation){setSabhaGps('Location not available');return;} navigator.geolocation.getCurrentPosition(pos=>setSabhaGps(`${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`),()=>setSabhaGps('Location access denied')); };

  /* ─── HANDLERS ─── */
  const submitCert = async () => {
    try { await api.post('/certificates',{type:certType,purpose:certPurpose,applicantName:user?.name}); showToast('Certificate application submitted','success'); setCertModal(false); setCertPurpose(''); fetchAll(); }
    catch(e) { showToast(e.response?.data?.message||'Failed','error'); }
  };
  const submitComplaint = async () => {
    if(!cDesc){showToast('Please describe the issue','warning');return;}
    try { const fd=new FormData(); fd.append('category',cCat); fd.append('description',cDesc); fd.append('location',cLoc||'Not specified'); if(gpsCoords){fd.append('gpsLat',gpsCoords.lat);fd.append('gpsLong',gpsCoords.lng);} cPhotos.forEach(f=>fd.append('photos',f)); await api.post('/complaints',fd); showToast('Complaint filed successfully','success'); setComplainModal(false); setCDesc(''); setCLoc(''); setCPhotos([]); setGpsCoords(null); fetchAll(); }
    catch(e) { showToast(e.response?.data?.message||'Failed','error'); }
  };
  const processPayment = async () => {
    if(!selTax)return; setPayLoading(true);
    try {
      const orderRes=await api.post('/payments/create-order',{taxId:selTax._id||'manual',amount:selTax.amount,method:payMethod});
      const{orderId,key,amount:amt,demo}=orderRes.data;
      if(!demo&&window.Razorpay){
        const opts={key,amount:amt,currency:'INR',name:'GramSeva Panchayat',description:selTax.type||'Tax Payment',order_id:orderId,
          handler:async(response)=>{ await api.post('/payments/confirm',{taxId:selTax._id||'manual',amount:selTax.amount,method:payMethod,upiId,razorpayOrderId:response.razorpay_order_id,razorpayPaymentId:response.razorpay_payment_id,description:selTax.type}); showToast('Payment successful!','success'); setPayModal(false); fetchAll(); },
          prefill:{name:user?.name,contact:user?.mobile}};
        new window.Razorpay(opts).open();
      } else {
        const conf=await api.post('/payments/confirm',{taxId:selTax._id||'manual',amount:selTax.amount,method:payMethod,upiId,description:selTax.type||'Tax Payment'});
        showToast(`Payment ₹${selTax.amount} success! Receipt: ${conf.data.receiptNumber}`,'success'); setPayModal(false); setSelTax(null); fetchAll();
      }
    } catch(e){showToast(e.response?.data?.message||'Payment failed','error');} finally{setPayLoading(false);}
  };
  const applyScheme = async () => {
    if(!schemeForm.applicantName||!schemeForm.income){showToast('Fill required fields','warning');return;}
    setSchemeLoading(true);
    try { await api.post('/schemes/apply',{schemeId:schemeModal._id,...schemeForm}); showToast(`Applied for ${schemeModal.name}!`,'success'); setSchemeModal(null); setSchemeForm({applicantName:'',age:'',income:'',landAcres:'',bankAccount:'',ifsc:'',reason:''}); fetchAll(); }
    catch(e){showToast(e.response?.data?.message||'Failed','error');} finally{setSchemeLoading(false);}
  };
  const submitSabha = async () => {
    if(!sabhaPhoto){showToast('Please capture attendance photo','warning');return;}
    try { const fd=new FormData(); fd.append('photo',sabhaPhoto); fd.append('meetingId','mtg-001'); if(gpsCoords){fd.append('gpsLat',gpsCoords.lat);fd.append('gpsLong',gpsCoords.lng);fd.append('gpsLocation',sabhaGps||`${gpsCoords.lat}, ${gpsCoords.lng}`);} const res=await api.post('/gram-sabha/attend',fd); showToast(`Attendance marked! ${res.data.attendeeCount||''} attendees registered`,'success'); setSabhaModal(false); setSabhaPhoto(null); setSabhaGps(''); }
    catch(e){showToast(e.response?.data?.message||'Failed. Try again.','error');}
  };
  const addMember = async () => {
    if(!newMember.name){showToast('Member name required','warning');return;}
    setMemberLoading(true);
    try { await api.post('/families/members',newMember); showToast('Family member added!','success'); setAddMemberModal(false); setNewMember({name:'',aadhaarLast4:'',age:'',gender:'Male',relation:'Spouse'}); fetchAll(); }
    catch(e){showToast(e.response?.data?.message||'Failed','error');} finally{setMemberLoading(false);}
  };
  const removeMember = async (memberId) => {
    if(!window.confirm('Remove this family member?'))return;
    try { await api.delete(`/families/members/${memberId}`); showToast('Member removed','info'); fetchAll(); }
    catch{ showToast('Failed to remove','error'); }
  };
  const saveSettings = async () => {
    setSettingsSaving(true);
    try { await api.patch('/auth/profile',settingsData); updateUser(settingsData); showToast('Profile updated successfully','success'); }
    catch(e){showToast(e.response?.data?.message||'Update failed','error');} finally{setSettingsSaving(false);}
  };
  const downloadPdf = (certId) => { const token=localStorage.getItem('gs_token'); window.open(`/api/cert-pdf/pdf/${certId}?token=${token}`,'_blank'); };
  const viewReceipt = (paymentId) => { window.open(`/api/payments/receipt/${paymentId}?token=${localStorage.getItem('gs_token')}`,'_blank'); };

  const pendingTaxTotal = taxes.filter(t=>t.status==='Pending').reduce((s,t)=>s+t.amount,0);
  const go = (p) => setPage(p);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;} body{margin:0;background:${BG};}
        @keyframes vd-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes vd-spin{to{transform:rotate(360deg)}}
        @keyframes vd-pop{from{transform:scale(.4);opacity:0}60%{transform:scale(1.08)}to{transform:scale(1);opacity:1}}
        @keyframes vd-modal{from{opacity:0;transform:scale(0.94)translateY(14px)}to{opacity:1;transform:scale(1)translateY(0)}}
        .vd-nav{display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;border-left:3px solid transparent;transition:all .18s;border-radius:0 8px 8px 0;margin:1px 6px 1px 0;}
        .vd-nav:hover{background:${BG2};}
        .vd-nav.on{background:${PG};border-left-color:${P};}
        .vd-nav.on .vd-nl{color:${P};font-weight:700;}
        .vd-nav.on .vd-ni{background:rgba(22,163,74,.18);}
        .vd-nl{font-size:12.5px;color:${MUT};font-weight:500;font-family:'Plus Jakarta Sans',sans-serif;}
        .vd-ni{width:30px;height:30px;border-radius:8px;background:${BG2};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;transition:all .18s;}
        .vd-inp{width:100%;border:1.5px solid ${BDR};border-radius:10px;padding:10px 13px;font-size:13px;color:${TX};background:${BG2};outline:none;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s;}
        .vd-inp:focus{border-color:${P}!important;box-shadow:0 0 0 3px ${PG}!important;background:${CARD}!important;}
        .vd-inp::placeholder{color:${DIM};}
        select.vd-inp option{background:${CARD};color:${TX};}
        .vd-btn{border:none;border-radius:10px;padding:9px 18px;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px;}
        .vd-btn:hover{filter:brightness(1.06);transform:translateY(-1px);}
        .vd-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
        .vd-btn-p{background:linear-gradient(135deg,#22C55E,${PD});color:#fff;box-shadow:0 4px 16px rgba(22,163,74,.25);}
        .vd-btn-a{background:linear-gradient(135deg,#F59E0B,${AD});color:#fff;box-shadow:0 4px 16px rgba(217,119,6,.25);}
        .vd-btn-r{background:linear-gradient(135deg,#EF4444,${DNG});color:#fff;box-shadow:0 4px 16px rgba(220,38,38,.25);}
        .vd-btn-t{background:linear-gradient(135deg,#06B6D4,${TLD});color:#fff;box-shadow:0 4px 16px rgba(8,145,178,.25);}
        .vd-btn-ghost{background:transparent;color:${MUT};border:1.5px solid ${BDR};}
        .vd-btn-ghost:hover{border-color:${BDRH};color:${TX};background:${BG2};}
        .vd-hov{transition:all .22s;} .vd-hov:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.10);border-color:${BDRH}!important;}
        .vd-cat{border:1.5px solid ${BDR};border-radius:9px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;background:${CARD};color:${MUT};font-family:'Plus Jakarta Sans',sans-serif;text-transform:capitalize;}
        .vd-cat.sel{background:${PG};border-color:${P};color:${PD};}
        .vd-cat:hover:not(.sel){border-color:${BDRH};color:${TX};}
        .vd-overlay{position:fixed;inset:0;z-index:200;background:rgba(15,23,42,.42);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
        .vd-modal{background:${CARD};border:1px solid ${BDRH};border-radius:20px;padding:26px 28px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.15);animation:vd-modal .3s cubic-bezier(.34,1.4,.64,1) both;}
        ::-webkit-scrollbar{width:5px;height:5px;} ::-webkit-scrollbar-track{background:${BG2};} ::-webkit-scrollbar-thumb{background:${BDRH};border-radius:5px;}
        .vd-tog{width:42px;height:23px;border-radius:12px;position:relative;cursor:pointer;transition:background .3s;flex-shrink:0;}
        .vd-tog-k{position:absolute;top:3px;width:17px;height:17px;border-radius:50%;background:#fff;transition:left .3s cubic-bezier(.4,0,.2,1);box-shadow:0 1px 4px rgba(0,0,0,.2);}
        .vd-mob-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:${CARD};border-top:1px solid ${BDR};z-index:100;padding:5px 0 calc(5px + env(safe-area-inset-bottom));box-shadow:0 -2px 12px rgba(0,0,0,.08);}
        .vd-mob-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:7px 4px;background:none;border:none;color:${DIM};cursor:pointer;font-size:9.5px;gap:3px;font-family:'Plus Jakarta Sans',sans-serif;transition:color .18s;}
        .vd-mob-btn.on{color:${P};}
        @media(max-width:768px){
          .vd-sidebar{transform:translateX(-100%);transition:transform .3s;}.vd-main{margin-left:0!important;}
          .vd-mob-nav{display:flex!important;}.vd-page{padding:14px!important;padding-bottom:80px!important;}
          .vd-g4{grid-template-columns:1fr 1fr!important;}.vd-g3{grid-template-columns:1fr 1fr!important;}.vd-g2{grid-template-columns:1fr!important;}
          .vd-hide-mob{display:none!important;}.vd-modal{padding:20px 18px!important;}
        }
        @media(max-width:420px){.vd-g4{grid-template-columns:1fr 1fr!important;}.vd-g2c{grid-template-columns:1fr!important;}}
      `}</style>

      <div style={{display:'flex',minHeight:'100vh',fontFamily:"'Plus Jakarta Sans',sans-serif",background:BG,color:TX}}>

        {/* ── SIDEBAR ── */}
        <aside className="vd-sidebar" style={{width:230,background:CARD,position:'fixed',top:0,left:0,height:'100vh',display:'flex',flexDirection:'column',zIndex:100,overflowY:'auto',borderRight:`1px solid ${BDR}`,boxShadow:'2px 0 12px rgba(0,0,0,.06)',scrollbarWidth:'none'}}>
          {/* Brand */}
          <div style={{padding:'18px 16px',borderBottom:`1px solid ${BDR}`}}>
            <div style={{display:'flex',alignItems:'center',gap:11,marginBottom:14}}>
              <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${P},${PD})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,boxShadow:'0 0 20px rgba(34,197,94,.25)',flexShrink:0}}>🏛️</div>
              <div>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:13.5,fontWeight:800,color:TX}}>GrammConnect</div>
                <div style={{fontSize:9.5,color:MUT,letterSpacing:'0.07em',textTransform:'uppercase'}}>Village Portal</div>
              </div>
            </div>
            {/* Profile strip */}
            <div onClick={()=>setProfileModal(true)} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 12px',background:BG2,borderRadius:12,cursor:'pointer',border:`1px solid ${BDR}`,transition:'all .2s'}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=BDRH} onMouseLeave={e=>e.currentTarget.style.borderColor=BDR}>
              <div style={{width:34,height:34,borderRadius:'50%',background:`linear-gradient(135deg,${A},${AD})`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:15,color:'#fff',flexShrink:0,border:`2px solid ${A}44`}}>{user?.name?.[0]||'V'}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:TX,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name}</div>
                <div style={{fontSize:9.5,color:MUT}}>{user?.familyId} · edit profile</div>
              </div>
              <span style={{fontSize:11,color:DIM}}>✏️</span>
            </div>
          </div>

          {/* Nav */}
          <nav style={{flex:1,padding:'8px 0'}}>
            <div style={{padding:'8px 14px 4px',fontSize:8.5,textTransform:'uppercase',letterSpacing:1.5,color:DIM,fontWeight:700}}>Main</div>
            {PAGES.slice(0,6).map(p => (
              <div key={p.id} className={`vd-nav${page===p.id?' on':''}`} onClick={()=>go(p.id)}>
                <div className="vd-ni">{p.icon}</div>
                <span className="vd-nl">{p.label}</span>
                {p.id==='complaints'&&complaints.filter(c=>c.status==='Pending').length>0&&<span style={{marginLeft:'auto',background:DNG,color:'#fff',fontSize:9.5,fontWeight:700,padding:'2px 7px',borderRadius:10}}>{complaints.filter(c=>c.status==='Pending').length}</span>}
              </div>
            ))}
            <div style={{padding:'8px 14px 4px',fontSize:8.5,textTransform:'uppercase',letterSpacing:1.5,color:DIM,fontWeight:700}}>More</div>
            {PAGES.slice(6).map(p => (
              <div key={p.id} className={`vd-nav${page===p.id?' on':''}`} onClick={()=>go(p.id)}>
                <div className="vd-ni">{p.icon}</div>
                <span className="vd-nl">{p.label}</span>
              </div>
            ))}
          </nav>

          {/* Bottom actions */}
          <div style={{padding:'12px 14px',borderTop:`1px solid ${BDR}`,display:'flex',flexDirection:'column',gap:8}}>
            <button onClick={()=>setSOSModal(true)} className="vd-btn vd-btn-r" style={{width:'100%',justifyContent:'center',fontSize:12}}>🚨 SOS Emergency</button>
            <button onClick={()=>{logout();navigate('/');}} style={{width:'100%',background:'transparent',color:MUT,border:'none',padding:'6px',fontSize:12,cursor:'pointer',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>⬅ Logout</button>
          </div>
        </aside>

        {/* Mobile bottom nav */}
        <nav className="vd-mob-nav">
          {BOTTOM_NAV.map(p=>(
            <button key={p.id} className={`vd-mob-btn${page===p.id?' on':''}`} onClick={()=>go(p.id)}>
              <span style={{fontSize:18}}>{p.icon}</span>{p.label}
            </button>
          ))}
        </nav>

        {/* ── MAIN ── */}
        <main className="vd-main" style={{marginLeft:230,flex:1,minHeight:'100vh',display:'flex',flexDirection:'column'}}>
          {/* Header */}
          <header style={{height:62,background:CARD,borderBottom:`1px solid ${BDR}`,display:'flex',alignItems:'center',padding:'0 24px',gap:14,position:'sticky',top:0,zIndex:90,boxShadow:'0 1px 8px rgba(0,0,0,.06)'}}>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:TX}}>{PAGES.find(p=>p.id===page)?.icon} {PAGES.find(p=>p.id===page)?.label}</div>
              <div style={{fontSize:11,color:MUT}}>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div className="gc-lang-picker">
                {langs.map(l=><button key={l.code} className={`gc-lang-btn${lang===l.code?' active':''}`} onClick={()=>switchLang(l.code)}>{l.native}</button>)}
              </div>
              <button onClick={()=>setLivePhotoModal(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 11px',borderRadius:9,border:'1.5px solid var(--primary)',background:'var(--primaryG)',cursor:'pointer',fontSize:12,fontWeight:700,color:'var(--primaryD)',whiteSpace:'nowrap'}}>
                📸 {tr('livePhoto')}
              </button>
              {notifs.length>0 && (
                <div onClick={()=>setNotifBell(b=>!b)} style={{width:36,height:36,borderRadius:9,border:`1px solid ${BDR}`,background:BG2,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',position:'relative'}}>
                  🔔<span style={{position:'absolute',top:6,right:6,width:8,height:8,background:A,borderRadius:'50%',animation:'vd-pulse 2s ease-in-out infinite'}}/>
                </div>
              )}
              <div onClick={()=>setProfileModal(true)} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',borderRadius:9,border:`1px solid ${BDR}`,background:BG2,cursor:'pointer',transition:'all .2s'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=BDRH} onMouseLeave={e=>e.currentTarget.style.borderColor=BDR}>
                <div style={{width:26,height:26,borderRadius:'50%',background:`linear-gradient(135deg,${A},${AD})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:11}}>{user?.name?.[0]}</div>
                <span style={{fontSize:12,fontWeight:600,color:TX}}>{user?.name?.split(' ')[0]}</span>
              </div>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <div className="vd-page" style={{flex:1,padding:24,animation:'vd-up .32s ease both'}}>

            {/* ── HOME ── */}
            {page==='home' && (
              <>
                {/* Welcome banner */}
                <div style={{background:`linear-gradient(135deg,rgba(22,163,74,.25),rgba(8,145,178,.18))`,border:`1.5px solid rgba(34,197,94,.25)`,borderRadius:18,padding:'22px 26px',marginBottom:22,position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',top:-20,right:-20,width:100,height:100,background:'rgba(34,197,94,.12)',borderRadius:'50%',pointerEvents:'none'}}/>
                  <div style={{fontFamily:"'Sora',sans-serif",fontSize:20,fontWeight:700,marginBottom:4}}>Namaste, {user?.name?.split(' ')[0]} 🙏</div>
                  <div style={{fontSize:13,color:MUT,marginBottom:16}}>{user?.village} Village · {user?.familyId}</div>
                  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                    <button onClick={()=>setCertModal(true)} className="vd-btn vd-btn-a">📜 Apply Certificate</button>
                    <button onClick={()=>setComplainModal(true)} className="vd-btn vd-btn-ghost">📋 File Complaint</button>
                  </div>
                </div>

                {/* Stats */}
                <div className="vd-g4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:22}}>
                  {[{l:'Pending Dues',v:`₹${pendingTaxTotal.toLocaleString()}`,i:'💰',color:AG,accent:A,fn:()=>go('payments')},
                    {l:'Complaints',v:complaints.length,i:'📋',color:TLG,accent:TL,fn:()=>go('complaints')},
                    {l:'Certificates',v:certs.length,i:'📜',color:PG,accent:P,fn:()=>go('certificates')},
                    {l:'Notifications',v:notifs.length,i:'🔔',color:'rgba(239,68,68,.1)',accent:DNG}].map(s=>(
                    <div key={s.l} className="vd-hov" onClick={s.fn} style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:'16px 18px',display:'flex',alignItems:'center',gap:12,cursor:s.fn?'pointer':'default',backdropFilter:'blur(16px)'}}>
                      <div style={{width:42,height:42,borderRadius:11,background:s.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0,border:`1px solid ${s.accent}33`}}>{s.i}</div>
                      <div><div style={{fontSize:10.5,color:MUT,fontWeight:600}}>{s.l}</div><div style={{fontSize:20,fontWeight:800,color:TX,fontFamily:"'Sora',sans-serif"}}>{s.v}</div></div>
                    </div>
                  ))}
                </div>

                {/* Quick actions */}
                <div className="vd-g4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:22}}>
                  {[{i:'📜',l:'Apply Certificate',fn:()=>setCertModal(true)},{i:'📋',l:'File Complaint',fn:()=>setComplainModal(true)},
                    {i:'💳',l:'Pay Dues',fn:()=>go('payments')},{i:'🤝',l:'Gram Sabha',fn:()=>setSabhaModal(true)},
                    {i:'🗳️',l:'Cast Vote',fn:()=>go('vote')},{i:'🧾',l:'Scheme Checker',fn:()=>go('checker')},
                    {i:'🛒',l:'Marketplace',fn:()=>go('marketplace')},{i:'📻',l:'Voice Help',fn:()=>go('voice')}].map(a=>(
                    <div key={a.l} className="vd-hov" onClick={a.fn} style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:13,padding:'16px 14px',textAlign:'center',cursor:'pointer',backdropFilter:'blur(16px)'}}>
                      <div style={{fontSize:26,marginBottom:8}}>{a.i}</div>
                      <div style={{fontSize:12,fontWeight:600,lineHeight:1.3,color:TX}}>{a.l}</div>
                    </div>
                  ))}
                </div>

                {/* Weather + Market Price row */}
                <div className="vd-g2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:22}}>
                  {/* Weather Widget */}
                  <WeatherWidget weather={weather} loading={weatherLoading} locationName={weatherLoc} onRefresh={autoDetectWeather}/>
                  {/* Market Highlight */}
                  <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:16,padding:20}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                      <div style={{fontWeight:700,fontSize:14}}>📊 Today's Mandi Prices</div>
                      <button onClick={()=>go('marketplace')} style={{fontSize:11,color:P,background:PG,border:`1px solid rgba(34,197,94,.25)`,borderRadius:8,padding:'4px 10px',cursor:'pointer',fontWeight:700}}>View All →</button>
                    </div>
                    {mandiPrices.slice(0,6).map(mp=>(
                      <div key={mp.product} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${BDR}`}}>
                        <span style={{fontSize:13,fontWeight:500,color:TX}}>{mp.product}</span>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:13,fontWeight:700,color:TX}}>₹{mp.price.toLocaleString()}/{mp.unit==='quintal'?'q':mp.unit}</span>
                          <span style={{fontSize:11,fontWeight:700,color:mp.trend==='up'?SUC:mp.trend==='down'?DNG:MUT,background:mp.trend==='up'?PG:mp.trend==='down'?'rgba(220,38,38,.1)':BG2,padding:'2px 7px',borderRadius:20}}>
                            {mp.trend==='up'?'↑':mp.trend==='down'?'↓':'→'} {Math.abs(mp.change)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent complaints */}
                {complaints.length>0 && (
                  <VTable headers={['ID','Category','Status','Date']}>
                    {complaints.slice(0,5).map(c=>(
                      <tr key={c._id}><td style={td}><span style={{fontSize:11,fontFamily:'monospace',color:TL}}>{c.complaintId}</span></td><td style={{...td,textTransform:'capitalize'}}>{c.category}</td><td style={td}><VBadge s={c.status}/></td><td style={td}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td></tr>
                    ))}
                  </VTable>
                )}
              </>
            )}

            {/* ── MARKETPLACE ── */}
            {page==='marketplace' && (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700}}>🛒 Farmer Marketplace</div>
                  <button onClick={()=>setListingModal(true)} className="vd-btn vd-btn-p">+ Sell Your Produce</button>
                </div>

                {/* Tab bar */}
                <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
                  {[['browse','🏪 Browse Market'],['sell','📦 My Listings'],['mandi','📊 Mandi Prices']].map(([t,l])=>(
                    <button key={t} onClick={()=>setMarketTab(t)} style={{padding:'8px 18px',borderRadius:10,border:`1.5px solid ${marketTab===t?P:BDR}`,background:marketTab===t?PG:CARD,color:marketTab===t?PD:MUT,fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Plus Jakarta Sans',sans-serif",transition:'all .2s'}}>{l}</button>
                  ))}
                </div>

                {/* ── BROWSE TAB ── */}
                {marketTab==='browse' && (
                  <>
                    {/* Category filter */}
                    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
                      {['all','grain','vegetable','fruit','pulse','oilseed','spice','dairy','other'].map(cat=>(
                        <button key={cat} className={`vd-cat${marketCatFilter===cat?' sel':''}`} onClick={()=>setMarketCatFilter(cat)} style={{textTransform:'capitalize'}}>{cat}</button>
                      ))}
                    </div>
                    {marketListings.filter(l=>marketCatFilter==='all'||l.category===marketCatFilter).length===0 ? (
                      <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:'48px 24px',textAlign:'center',color:MUT}}>
                        <div style={{fontSize:42,marginBottom:12}}>🌾</div>
                        <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>No listings yet</div>
                        <div style={{fontSize:13}}>Be the first farmer to list your produce!</div>
                        <button onClick={()=>setListingModal(true)} className="vd-btn vd-btn-p" style={{marginTop:16}}>+ Post Your First Listing</button>
                      </div>
                    ) : (
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
                        {marketListings.filter(l=>marketCatFilter==='all'||l.category===marketCatFilter).map(listing=>(
                          <div key={listing._id} className="vd-hov" style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:20}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                              <div>
                                <div style={{fontWeight:700,fontSize:15,color:TX}}>{listing.product}</div>
                                <div style={{fontSize:11,color:MUT,textTransform:'capitalize',marginTop:2}}>{listing.category} {listing.isOrganic&&<span style={{background:'rgba(34,197,94,.15)',color:P,borderRadius:20,padding:'1px 7px',marginLeft:4,fontWeight:700}}>🌿 Organic</span>}</div>
                              </div>
                              <span style={{background:PG,color:P,borderRadius:10,padding:'3px 10px',fontSize:11,fontWeight:700,border:`1px solid rgba(34,197,94,.2)`}}>Active</span>
                            </div>
                            <div style={{fontSize:26,fontWeight:800,color:A,fontFamily:"'Sora',sans-serif",marginBottom:4}}>₹{listing.pricePerUnit.toLocaleString()}<span style={{fontSize:13,color:MUT,fontWeight:500}}>/{listing.unit}</span></div>
                            <div style={{fontSize:13,color:MUT,marginBottom:4}}>📦 Available: <strong style={{color:TX}}>{listing.quantity} {listing.unit}</strong></div>
                            {listing.minOrderQty>1&&<div style={{fontSize:12,color:DIM,marginBottom:4}}>Min order: {listing.minOrderQty} {listing.unit}</div>}
                            {listing.description&&<div style={{fontSize:12,color:MUT,marginBottom:10,lineHeight:1.5}}>{listing.description}</div>}
                            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,padding:'8px 10px',background:BG2,borderRadius:9}}>
                              <div style={{width:28,height:28,borderRadius:'50%',background:`linear-gradient(135deg,${P},${PD})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:11,flexShrink:0}}>{listing.sellerName?.[0]}</div>
                              <div><div style={{fontSize:12,fontWeight:600,color:TX}}>{listing.sellerName}</div><div style={{fontSize:11,color:MUT}}>{listing.sellerVillage}</div></div>
                            </div>
                            <button onClick={()=>setContactModal(listing)} className="vd-btn vd-btn-p" style={{width:'100%',justifyContent:'center'}}>📞 Contact Seller</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* ── MY LISTINGS TAB ── */}
                {marketTab==='sell' && (
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                      <div style={{fontWeight:700,fontSize:14,color:TX}}>Your Published Listings ({myListings.length})</div>
                      <button onClick={()=>setListingModal(true)} className="vd-btn vd-btn-p">+ New Listing</button>
                    </div>
                    {myListings.length===0 ? (
                      <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:'40px 24px',textAlign:'center',color:MUT}}>
                        <div style={{fontSize:40,marginBottom:10}}>🌱</div>
                        <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>No listings yet</div>
                        <div style={{fontSize:13,marginBottom:16}}>Start selling your farm produce at the best price</div>
                        <button onClick={()=>setListingModal(true)} className="vd-btn vd-btn-p">+ Post Listing</button>
                      </div>
                    ) : (
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
                        {myListings.map(listing=>(
                          <div key={listing._id} style={{background:CARD,border:`1.5px solid ${listing.status==='sold'?'rgba(16,185,129,.3)':BDR}`,borderRadius:14,padding:20}}>
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                              <div style={{fontWeight:700,fontSize:15}}>{listing.product}</div>
                              <VBadge s={listing.status==='active'?'Active':listing.status==='sold'?'Paid':'Inactive'}/>
                            </div>
                            <div style={{fontSize:24,fontWeight:800,color:A,fontFamily:"'Sora',sans-serif",marginBottom:6}}>₹{listing.pricePerUnit.toLocaleString()}/{listing.unit}</div>
                            <div style={{fontSize:13,color:MUT,marginBottom:4}}>Qty: {listing.quantity} {listing.unit}</div>
                            <div style={{display:'flex',gap:6,fontSize:12,color:MUT,marginBottom:14}}>
                              <span>👁 {listing.views} views</span>
                              <span>·</span>
                              <span>💬 {listing.inquiries} inquiries</span>
                            </div>
                            <div style={{display:'flex',gap:8}}>
                              {listing.status==='active'&&<button onClick={()=>markSold(listing._id)} className="vd-btn vd-btn-p" style={{flex:1,justifyContent:'center',fontSize:12,padding:'7px 0'}}>✅ Mark Sold</button>}
                              <button onClick={()=>removeListing(listing._id)} className="vd-btn vd-btn-r" style={{flex:1,justifyContent:'center',fontSize:12,padding:'7px 0'}}>🗑 Remove</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* ── MANDI PRICES TAB ── */}
                {marketTab==='mandi' && (
                  <>
                    <div style={{background:'rgba(8,145,178,.08)',border:`1px solid rgba(8,145,178,.25)`,borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13,color:TL}}>
                      ℹ️ Prices shown are MSP / prevailing mandi rates. Use these as reference before setting your listing price.
                    </div>
                    {/* Category filter */}
                    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
                      {['all','grain','vegetable','fruit','pulse','oilseed','spice','dairy'].map(cat=>(
                        <button key={cat} className={`vd-cat${marketCatFilter===cat?' sel':''}`} onClick={()=>setMarketCatFilter(cat)} style={{textTransform:'capitalize'}}>{cat}</button>
                      ))}
                    </div>
                    <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:14,overflow:'hidden'}}>
                      <table style={{width:'100%',borderCollapse:'collapse'}}>
                        <thead>
                          <tr style={{background:BG2}}>
                            {['Product','Category','Mandi Price','Unit','Today\'s Trend'].map(h=>(
                              <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:MUT,textTransform:'uppercase',letterSpacing:.7,borderBottom:`1px solid ${BDR}`}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {mandiPrices.filter(mp=>marketCatFilter==='all'||mp.category===marketCatFilter).map(mp=>(
                            <tr key={mp.product} style={{transition:'background .15s'}} onMouseEnter={e=>e.currentTarget.style.background=BG2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                              <td style={{...td,fontWeight:700}}>{mp.product}</td>
                              <td style={{...td,textTransform:'capitalize'}}>
                                <span style={{background:BG2,border:`1px solid ${BDR}`,borderRadius:20,padding:'2px 9px',fontSize:11,fontWeight:600}}>{mp.category}</span>
                              </td>
                              <td style={{...td}}><strong style={{fontSize:15,fontFamily:"'Sora',sans-serif",color:TX}}>₹{mp.price.toLocaleString()}</strong></td>
                              <td style={td}>per {mp.unit}</td>
                              <td style={td}>
                                <span style={{display:'inline-flex',alignItems:'center',gap:5,fontWeight:700,fontSize:12,color:mp.trend==='up'?SUC:mp.trend==='down'?DNG:MUT,background:mp.trend==='up'?PG:mp.trend==='down'?'rgba(220,38,38,.1)':BG2,padding:'4px 10px',borderRadius:20}}>
                                  {mp.trend==='up'?'▲':mp.trend==='down'?'▼':'▶'} {Math.abs(mp.change)}% {mp.trend}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── CERTIFICATES ── */}
            {page==='certificates' && (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700}}>📜 My Certificates</div>
                  <button onClick={()=>setCertModal(true)} className="vd-btn vd-btn-p">+ Apply New</button>
                </div>
                <VTable headers={['Application ID','Type','Purpose','Status','Applied On','Receipt']}>
                  {certs.length===0&&<tr><td colSpan={6} style={{...td,textAlign:'center',padding:32,color:MUT}}>No applications yet. Click "Apply New" to get started.</td></tr>}
                  {certs.map(c=>(
                    <tr key={c._id}>
                      <td style={td}><span style={{fontSize:11,fontFamily:'monospace',color:TL}}>{c.applicationId}</span></td>
                      <td style={{...td,textTransform:'capitalize'}}>{c.type}</td>
                      <td style={td}>{c.purpose}</td>
                      <td style={td}><VBadge s={c.status}/></td>
                      <td style={td}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={td}>{(c.status==='Approved'||c.status==='Ready') ? <button onClick={()=>downloadPdf(c._id)} className="vd-btn vd-btn-t" style={{padding:'4px 12px',fontSize:11}}>📄 PDF</button> : '—'}</td>
                    </tr>
                  ))}
                </VTable>
              </>
            )}

            {/* ── COMPLAINTS ── */}
            {page==='complaints' && (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700}}>📋 My Complaints</div>
                  <button onClick={()=>setComplainModal(true)} className="vd-btn vd-btn-r">+ File Complaint</button>
                </div>
                <VTable headers={['ID','Category','Description','Status','Date','Rating']}>
                  {complaints.length===0&&<tr><td colSpan={6} style={{...td,textAlign:'center',padding:32,color:MUT}}>No complaints filed yet.</td></tr>}
                  {complaints.map(c=>(
                    <tr key={c._id}>
                      <td style={td}><span style={{fontSize:11,fontFamily:'monospace',color:TL}}>{c.complaintId}</span></td>
                      <td style={{...td,textTransform:'capitalize'}}>{c.category}</td>
                      <td style={{...td,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.description}</td>
                      <td style={td}><VBadge s={c.status}/></td>
                      <td style={td}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={td}>{c.status==='Resolved'?<StarRating id={c._id} current={c.rating} onRate={r=>api.patch(`/complaints/${c._id}/rate`,{rating:r}).then(fetchAll)}/>:'—'}</td>
                    </tr>
                  ))}
                </VTable>
              </>
            )}

            {/* ── PAYMENTS ── */}
            {page==='payments' && (
              <>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,marginBottom:20}}>💳 Payments & Dues</div>
                {taxes.length===0&&<div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:32,textAlign:'center',color:MUT,marginBottom:20}}>No tax dues assigned. Contact Panchayat office.</div>}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14,marginBottom:26}}>
                  {taxes.map(t=>(
                    <div key={t._id} className="vd-hov" style={{background:CARD,border:`1.5px solid ${t.status==='Paid'?'rgba(16,185,129,.3)':BDR}`,borderRadius:14,padding:20,backdropFilter:'blur(16px)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><div style={{fontSize:14,fontWeight:700,textTransform:'capitalize'}}>{t.type} Tax</div><VBadge s={t.status}/></div>
                      <div style={{fontSize:26,fontWeight:800,color:t.status==='Paid'?SUC:A,marginBottom:6,fontFamily:"'Sora',sans-serif"}}>₹{t.amount?.toLocaleString()}</div>
                      <div style={{fontSize:12,color:MUT,marginBottom:14}}>Due: {new Date(t.dueDate).toLocaleDateString('en-IN')}</div>
                      {t.status==='Pending'
                        ? <button onClick={()=>{setSelTax(t);setPayModal(true);}} className="vd-btn vd-btn-a" style={{width:'100%',justifyContent:'center'}}>💳 Pay Now</button>
                        : <div style={{fontSize:12,color:SUC,fontWeight:600}}>✅ Paid {t.paidAt?'on '+new Date(t.paidAt).toLocaleDateString('en-IN'):''}</div>
                      }
                    </div>
                  ))}
                </div>
                {payments.length>0 && (
                  <>
                    <div style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,marginBottom:14}}>🧾 Payment History</div>
                    <VTable headers={['Receipt No.','Type','Amount','Method','Date','Download']}>
                      {payments.map(p=>(
                        <tr key={p._id}>
                          <td style={td}><span style={{fontFamily:'monospace',color:TL,fontSize:11}}>{p.receiptNumber}</span></td>
                          <td style={td}>{p.description||p.tax?.type||'Payment'}</td>
                          <td style={td}><strong style={{color:A}}>₹{p.amount?.toLocaleString()}</strong></td>
                          <td style={td}>{p.method}</td>
                          <td style={td}>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                          <td style={td}><button className="vd-btn vd-btn-t" style={{padding:'4px 12px',fontSize:11}} onClick={()=>viewReceipt(p._id)}>📄 Receipt</button></td>
                        </tr>
                      ))}
                    </VTable>
                  </>
                )}
              </>
            )}

            {/* ── SCHEMES ── */}
            {page==='schemes' && (
              <>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,marginBottom:20}}>🏛 Government Schemes</div>
                {schemeApps.length>0 && (
                  <div style={{marginBottom:24}}>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:P}}>📋 My Applications</div>
                    <VTable headers={['Scheme','Application ID','Status','Applied On','Note']}>
                      {schemeApps.map(a=>(
                        <tr key={a._id}><td style={td}>{a.scheme?.name||'—'}</td><td style={td}>{a.applicationId}</td><td style={td}><VBadge s={a.status}/></td><td style={td}>{new Date(a.createdAt).toLocaleDateString('en-IN')}</td><td style={td}>{a.adminNote||'—'}</td></tr>
                      ))}
                    </VTable>
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
                  {schemes.length===0&&<div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:32,textAlign:'center',color:MUT,gridColumn:'1/-1'}}>No schemes available yet.</div>}
                  {schemes.map(s=>{ const applied=schemeApps.find(a=>a.scheme?._id===s._id||a.scheme===s._id); return (
                    <div key={s._id} className="vd-hov" style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:20,backdropFilter:'blur(16px)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                        <div style={{fontWeight:700,fontSize:14}}>{s.name}</div>
                        <span style={{background:PG,color:P,fontSize:10,padding:'2px 8px',borderRadius:20,fontWeight:600,textTransform:'capitalize',border:`1px solid rgba(34,197,94,.2)`}}>{s.category}</span>
                      </div>
                      <div style={{fontSize:13,color:MUT,marginBottom:10}}>{s.description}</div>
                      <div style={{fontSize:13,fontWeight:700,color:A,marginBottom:4}}>💰 {s.benefit}</div>
                      {s.eligibility&&<div style={{fontSize:12,color:MUT,marginBottom:12}}>✅ {s.eligibility}</div>}
                      {applied
                        ? <div style={{textAlign:'center',padding:'8px',background:BG2,borderRadius:9,fontSize:13}}><VBadge s={applied.status}/> Already Applied</div>
                        : <button onClick={()=>{setSchemeModal(s);setSchemeForm({...schemeForm,applicantName:user?.name||''});}} className="vd-btn vd-btn-p" style={{width:'100%',justifyContent:'center'}}>Apply Now →</button>
                      }
                    </div>
                  );})}
                </div>
              </>
            )}

            {/* ── GRAM SABHA ── */}
            {page==='sabha' && (
              <div>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,marginBottom:20}}>🤝 Gram Sabha</div>
                <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:16,padding:24,marginBottom:16,backdropFilter:'blur(16px)'}}>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:16,color:P}}>📅 Upcoming Meeting</div>
                  <div className="vd-g2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
                    {[['📅 Date','15 March 2026'],['🕐 Time','10:00 AM – 1:00 PM'],['📍 Venue','Village Community Hall, Rajpur'],['📌 Agenda','Annual Budget Review & Road Works']].map(([k,v])=>(
                      <div key={k} style={{background:BG2,borderRadius:10,padding:'12px 14px'}}>
                        <div style={{fontSize:11,color:MUT}}>{k}</div><div style={{fontWeight:600,fontSize:14,marginTop:3}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>{setSabhaModal(true);getGPSForSabha();}} className="vd-btn vd-btn-p">📷 Mark Attendance with Photo</button>
                </div>
              </div>
            )}

            {/* ── SOS ── */}
            {page==='sos' && (
              <div>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,marginBottom:20}}>🚨 Emergency SOS</div>
                <div style={{background:'rgba(239,68,68,.08)',border:'1.5px solid rgba(239,68,68,.3)',borderRadius:14,padding:16,marginBottom:20,fontSize:13,color:'#fca5a5'}}>⚠️ Use SOS only for genuine emergencies. Your GPS location will be sent to Panchayat emergency services.</div>
                <div className="vd-g2" style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14,marginBottom:22}}>
                  {[{t:'medical',i:'🏥',l:'Medical Emergency',c:'#dc2626',d:'Ambulance & health team'},{t:'fire',i:'🔥',l:'Fire Emergency',c:'#ea580c',d:'Fire brigade dispatch'},{t:'police',i:'👮',l:'Police Help',c:TL,d:'Law enforcement'},{t:'general',i:'🆘',l:'General SOS',c:A,d:'General emergency'}].map(s=>(
                    <div key={s.t} className="vd-hov" style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:'22px 20px',textAlign:'center',backdropFilter:'blur(16px)'}}>
                      <div style={{fontSize:42,marginBottom:10}}>{s.i}</div>
                      <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>{s.l}</div>
                      <div style={{fontSize:12,color:MUT,marginBottom:16}}>{s.d}</div>
                      <button onClick={()=>getGPS((loc,lat,lng)=>{api.post('/sos',{type:s.t,location:loc,gpsLat:lat,gpsLong:lng}).then(()=>showToast(`SOS sent! Help is on the way.`,'success')).catch(()=>showToast('SOS sent (demo)','info'));})} className="vd-btn" style={{width:'100%',justifyContent:'center',background:s.c,color:'#fff',border:'none',padding:'11px',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer'}}>🚨 SEND SOS</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── FAMILY ── */}
            {page==='family' && (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700}}>👨‍👩‍👧‍👦 Family Members</div>
                  <button onClick={()=>setAddMemberModal(true)} className="vd-btn vd-btn-p">+ Add Member</button>
                </div>
                {family && (
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
                    {/* Head card */}
                    <div style={{background:CARD,border:`2px solid rgba(245,158,11,.4)`,borderRadius:14,padding:20,backdropFilter:'blur(16px)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                        <div style={{width:46,height:46,borderRadius:'50%',background:`linear-gradient(135deg,${A},${AD})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:20,flexShrink:0}}>{family.name?.[0]}</div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:15}}>{family.name}</div>
                          <div style={{fontSize:11,color:MUT}}>Head of Family</div>
                        </div>
                        <span style={{background:AG,color:A,border:`1px solid ${A}44`,borderRadius:20,fontSize:10,padding:'3px 10px',fontWeight:600}}>HEAD</span>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,fontSize:12,color:MUT}}>
                        <span>📱 {family.mobile}</span><span>🎂 Age {family.age}</span>
                        <span>🏘️ {family.village}</span><span>📍 {family.pincode}</span>
                      </div>
                    </div>
                    {/* Member cards */}
                    {(family.familyMembers||[]).map(m=>(
                      <div key={m._id} className="vd-hov" style={{background:CARD,border:`1.5px solid ${m.accessFrozen?'rgba(239,68,68,.3)':BDR}`,borderRadius:14,padding:20,backdropFilter:'blur(16px)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                          <div style={{width:46,height:46,borderRadius:'50%',background:`linear-gradient(135deg,${P},${PD})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:18,flexShrink:0}}>{m.name?.[0]}</div>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700,fontSize:14}}>{m.name}</div>
                            <div style={{fontSize:11,color:MUT}}>{m.relation} · Age {m.age} · {m.gender}</div>
                          </div>
                          <span style={{background:m.accessFrozen?'rgba(239,68,68,.12)':PG,color:m.accessFrozen?DNG:P,borderRadius:20,fontSize:10,padding:'3px 8px',fontWeight:600}}>{m.accessFrozen?'🔒 Frozen':'✅ Active'}</span>
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <button onClick={()=>api.patch(`/families/members/${m._id}/freeze`).then(()=>{showToast(m.accessFrozen?'Access restored':'Access frozen','info');fetchAll();})} className="vd-btn vd-btn-ghost" style={{flex:1,fontSize:11,padding:'6px',justifyContent:'center'}}>{m.accessFrozen?'🔓 Unfreeze':'🔒 Freeze'}</button>
                          <button onClick={()=>removeMember(m._id)} className="vd-btn vd-btn-r" style={{flex:1,fontSize:11,padding:'6px',justifyContent:'center'}}>🗑 Remove</button>
                        </div>
                      </div>
                    ))}
                    {(family.familyMembers||[]).length===0 && <div style={{gridColumn:'1/-1',textAlign:'center',padding:32,color:MUT,background:CARD,borderRadius:14,border:`1.5px dashed ${BDR}`}}>No family members added. Click "+ Add Member" above.</div>}
                  </div>
                )}
              </div>
            )}

            {/* ── VOTE ── */}
            {page==='vote' && <GramVote/>}
            {/* ── SCHEME CHECKER ── */}
            {page==='checker' && <SchemeChecker/>}
            {/* ── ASSETS ── */}
            {page==='assets' && <AssetTracker/>}
            {/* ── VOICE ── */}
            {page==='voice' && <div style={{maxWidth:600,margin:'0 auto'}}><VoiceAssistant/></div>}

            {/* ── SETTINGS ── */}
            {page==='settings' && (
              <div>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,marginBottom:20}}>⚙️ Settings & Profile</div>
                <div className="vd-g2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                  {/* Profile */}
                  <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:16,padding:24,backdropFilter:'blur(16px)'}}>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:16,color:P}}>👤 Edit Profile</div>
                    {[['Full Name','name'],['Address','address'],['Village','village'],['Pincode','pincode'],['Age','age']].map(([label,key])=>(
                      <div key={key} style={{marginBottom:13}}>
                        <label style={LBL}>{label}</label>
                        <input type="text" value={settingsData[key]||''} onChange={e=>setSettingsData({...settingsData,[key]:e.target.value})} className="vd-inp"/>
                      </div>
                    ))}
                    <div style={{marginBottom:16}}><label style={LBL}>Gender</label><select className="vd-inp" value={settingsData.gender} onChange={e=>setSettingsData({...settingsData,gender:e.target.value})}><option>Male</option><option>Female</option><option>Other</option></select></div>
                    <button onClick={saveSettings} disabled={settingsSaving} className="vd-btn vd-btn-p" style={{width:'100%',justifyContent:'center'}}>{settingsSaving?'Saving…':'💾 Save Changes'}</button>
                  </div>
                  {/* Preferences */}
                  <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:16,padding:24,backdropFilter:'blur(16px)'}}>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:16,color:P}}>🔔 Notification Preferences</div>
                    {[['SMS Alerts for Complaints',true],['Push Notifications',true],['Tax Due Reminders',true],['Gram Sabha Reminders',false],['Scheme Updates',true]].map(([l,d])=>(
                      <VToggleRow key={l} label={l} defaultOn={d}/>
                    ))}
                    <div style={{marginTop:18,paddingTop:18,borderTop:`1px solid ${BDR}`}}>
                      <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:P}}>🔒 Privacy</div>
                      {[['Show Profile Publicly',false],['Share GPS with Panchayat',true]].map(([l,d])=><VToggleRow key={l} label={l} defaultOn={d}/>)}
                    </div>
                    <button onClick={()=>{logout();navigate('/');}} className="vd-btn vd-btn-r" style={{marginTop:18,width:'100%',justifyContent:'center'}}>⬅ Logout</button>
                  </div>
                </div>
              </div>
            )}

          </div>{/* end page content */}
        </main>
      </div>

      {/* ══════ MODALS ══════ */}

      {/* Profile Modal */}
      <VProfileModal open={profileModal} onClose={()=>setProfileModal(false)} user={user} settingsData={settingsData} setSettingsData={setSettingsData} saveSettings={saveSettings} settingsSaving={settingsSaving}/>

      {/* Certificate Modal */}
      {certModal && (
        <VModal title="📜 Apply for Certificate" onClose={()=>setCertModal(false)}>
          <div style={{marginBottom:14}}><label style={LBL}>Certificate Type</label><select value={certType} onChange={e=>setCertType(e.target.value)} className="vd-inp">{['income','residence','caste','birth','death','marriage','character','land'].map(t=><option key={t} style={{textTransform:'capitalize'}}>{t}</option>)}</select></div>
          <div style={{marginBottom:14}}><label style={LBL}>Purpose / Reason *</label><input type="text" value={certPurpose} onChange={e=>setCertPurpose(e.target.value)} placeholder="e.g. Bank loan, School admission" className="vd-inp"/></div>
          <div style={{marginBottom:14}}><label style={LBL}>Applicant Name</label><input type="text" value={user?.name||''} readOnly className="vd-inp" style={{opacity:.6}}/></div>
          <div style={{background:AG,border:`1px solid ${A}44`,borderRadius:9,padding:'10px 12px',fontSize:12,color:A,marginBottom:20}}>⚠ Original documents may be required at Panchayat office.</div>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setCertModal(false)} className="vd-btn vd-btn-ghost">Cancel</button>
            <button onClick={submitCert} className="vd-btn vd-btn-p">Submit Application</button>
          </div>
        </VModal>
      )}

      {/* Complaint Modal */}
      {complainModal && (
        <VModal title="📋 File a Complaint" onClose={()=>setComplainModal(false)} maxWidth={540}>
          <div style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.25)',borderRadius:9,padding:'10px 12px',fontSize:12,color:'#fca5a5',marginBottom:16}}>⚠ False complaints may result in suspension as per Panchayat bylaws.</div>
          <div style={{marginBottom:14}}>
            <label style={LBL}>Category</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {['water','electricity','road','drainage','corruption'].map(cat=>(
                <button key={cat} className={`vd-cat${cCat===cat?' sel':''}`} onClick={()=>setCCat(cat)}>{cat}</button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:14}}><label style={LBL}>Description *</label><textarea value={cDesc} onChange={e=>setCDesc(e.target.value)} placeholder="Describe the issue in detail. Include location, time, and impact…" className="vd-inp" style={{minHeight:80,resize:'vertical'}}/></div>
          <div style={{marginBottom:14}}>
            <label style={LBL}>Upload Photos (max 5)</label>
            <input type="file" accept="image/*" multiple onChange={e=>{const fs=[...e.target.files].slice(0,5);setCPhotos(fs);showToast(`${fs.length} photo(s) selected`,'info');}} className="vd-inp" style={{padding:'7px'}}/>
            {cPhotos.length>0&&<div style={{fontSize:12,color:P,marginTop:4}}>✅ {cPhotos.length} photo(s) selected</div>}
          </div>
          <div style={{marginBottom:18}}>
            <label style={LBL}>Location</label>
            <div style={{display:'flex',gap:8}}>
              <input type="text" value={cLoc} onChange={e=>setCLoc(e.target.value)} placeholder="Enter location or use GPS" className="vd-inp" style={{flex:1}}/>
              <button onClick={()=>getGPS(loc=>setCLoc(loc))} className="vd-btn vd-btn-t" style={{padding:'0 14px',fontSize:12,flexShrink:0}}>{gpsLoading?'…':'📍'}</button>
            </div>
            {gpsCoords&&<div style={{fontSize:11,color:P,marginTop:4}}>📍 GPS Verified: {gpsCoords.lat.toFixed(4)}° N</div>}
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setComplainModal(false)} className="vd-btn vd-btn-ghost">Cancel</button>
            <button onClick={submitComplaint} className="vd-btn vd-btn-r">Submit Complaint</button>
          </div>
        </VModal>
      )}

      {/* Payment Modal */}
      {payModal && (
        <VModal title="💳 Online Payment" onClose={()=>setPayModal(false)} maxWidth={420}>
          <div style={{textAlign:'center',padding:20,background:'rgba(245,158,11,.08)',border:`1px solid ${A}44`,borderRadius:12,marginBottom:20}}>
            <div style={{fontSize:34,fontWeight:800,color:A,fontFamily:"'Sora',sans-serif"}}>₹{selTax?.amount?.toLocaleString()}</div>
            <div style={{fontSize:13,color:MUT,marginTop:4,textTransform:'capitalize'}}>{selTax?.type} Tax</div>
            <div style={{fontSize:11,color:DIM,marginTop:2}}>Due: {selTax?.dueDate?new Date(selTax.dueDate).toLocaleDateString('en-IN'):'—'}</div>
          </div>
          <div style={{marginBottom:14}}><label style={LBL}>Payment Method</label><select value={payMethod} onChange={e=>setPayMethod(e.target.value)} className="vd-inp"><option>UPI</option><option>NetBanking</option><option>Card</option><option>Cash</option></select></div>
          {payMethod==='UPI'&&<div style={{marginBottom:14}}><label style={LBL}>UPI ID</label><input type="text" value={upiId} onChange={e=>setUpiId(e.target.value)} placeholder="yourname@upi" className="vd-inp"/></div>}
          <div style={{background:PG,border:`1px solid rgba(34,197,94,.25)`,borderRadius:9,padding:'10px 12px',fontSize:12,color:P,marginBottom:20}}>🔒 Secure payment via Razorpay. Your card details are never stored.</div>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setPayModal(false)} className="vd-btn vd-btn-ghost">Cancel</button>
            <button onClick={processPayment} disabled={payLoading} className="vd-btn vd-btn-a">{payLoading?'Processing…':'💳 Pay Now'}</button>
          </div>
        </VModal>
      )}

      {/* Gram Sabha Modal */}
      {sabhaModal && (
        <VModal title="🤝 Mark Attendance" onClose={()=>setSabhaModal(false)}>
          <div style={{marginBottom:14}}><label style={LBL}>Meeting Date</label><input type="date" defaultValue="2026-03-15" className="vd-inp"/></div>
          <div style={{background:PG,border:`1px solid rgba(34,197,94,.25)`,borderRadius:13,padding:'16px 18px',marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:14,color:P,marginBottom:6}}>🤖 AI Face Recognition (Recommended)</div>
            <div style={{fontSize:12,color:MUT,marginBottom:12,lineHeight:1.55}}>Use biometric face scan for tamper-proof attendance. No fake attendance possible.</div>
            <button onClick={()=>{setSabhaModal(false);setFaceModal(true);}} className="vd-btn vd-btn-p" style={{width:'100%',justifyContent:'center'}}>📷 Start Face Scan</button>
          </div>
          <div style={{textAlign:'center',fontSize:12,color:DIM,marginBottom:14}}>── or use manual photo upload ──</div>
          <div style={{marginBottom:14}}>
            <label style={LBL}>Attendance Photo</label>
            <div onClick={()=>sabhaFileRef.current?.click()} style={{border:`2px dashed ${sabhaPhoto?P:BDR}`,borderRadius:10,padding:22,textAlign:'center',cursor:'pointer',background:BG2,transition:'all .2s'}}>
              {sabhaPhoto
                ? <><img src={URL.createObjectURL(sabhaPhoto)} alt="att" style={{maxHeight:130,borderRadius:8,marginBottom:8}}/><div style={{fontSize:12,color:P,fontWeight:600}}>{sabhaPhoto.name}</div></>
                : <><div style={{fontSize:30,marginBottom:8}}>📷</div><div style={{fontSize:13,color:MUT}}>Take or upload attendance photo</div></>}
            </div>
            <input ref={sabhaFileRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={e=>{if(e.target.files[0])setSabhaPhoto(e.target.files[0]);}}/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={LBL}>GPS Location</label>
            <div style={{display:'flex',gap:8}}>
              <input type="text" value={sabhaGps||''} onChange={e=>setSabhaGps(e.target.value)} placeholder="Auto-detected or enter manually" className="vd-inp" style={{flex:1}}/>
              <button onClick={getGPSForSabha} className="vd-btn vd-btn-t" style={{padding:'0 14px'}}>📍</button>
            </div>
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setSabhaModal(false)} className="vd-btn vd-btn-ghost">Cancel</button>
            <button onClick={submitSabha} className="vd-btn vd-btn-p">Submit Manually</button>
          </div>
        </VModal>
      )}

      {/* Face Attendance Modal */}
      {faceModal && (
        <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,.75)',backdropFilter:'blur(12px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <FaceAttendance sabhaId="sabha-2026-03" onSuccess={result=>{setFaceModal(false);showToast(`Attendance marked for ${result.name} (${result.confidence}% confidence)`,'success');}} onClose={()=>setFaceModal(false)}/>
        </div>
      )}

      {/* Scheme Application Modal */}
      {!!schemeModal && (
        <VModal title={`Apply: ${schemeModal?.name}`} onClose={()=>setSchemeModal(null)} maxWidth={540}>
          {schemeModal && <>
            <div style={{background:PG,border:`1px solid rgba(34,197,94,.2)`,borderRadius:9,padding:12,marginBottom:16,fontSize:13}}>
              <div style={{fontWeight:600,marginBottom:4,color:P}}>Benefit: {schemeModal.benefit}</div>
              <div style={{color:MUT}}>{schemeModal.description}</div>
              {schemeModal.eligibility&&<div style={{color:P,marginTop:4,fontSize:12}}>✅ Eligibility: {schemeModal.eligibility}</div>}
            </div>
            <div style={{marginBottom:13}}><label style={LBL}>Applicant Name *</label><input type="text" value={schemeForm.applicantName} onChange={e=>setSchemeForm({...schemeForm,applicantName:e.target.value})} className="vd-inp"/></div>
            <div className="vd-g2c" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:13}}>
              <div><label style={LBL}>Age *</label><input type="tel" value={schemeForm.age} onChange={e=>setSchemeForm({...schemeForm,age:e.target.value})} className="vd-inp"/></div>
              <div><label style={LBL}>Annual Income (₹) *</label><input type="text" value={schemeForm.income} onChange={e=>setSchemeForm({...schemeForm,income:e.target.value})} className="vd-inp"/></div>
            </div>
            {schemeModal.category==='agriculture'&&<div style={{marginBottom:13}}><label style={LBL}>Land Area (Acres)</label><input type="text" value={schemeForm.landAcres} onChange={e=>setSchemeForm({...schemeForm,landAcres:e.target.value})} className="vd-inp"/></div>}
            <div style={{marginBottom:13}}><label style={LBL}>Bank Account Number</label><input type="text" value={schemeForm.bankAccount} onChange={e=>setSchemeForm({...schemeForm,bankAccount:e.target.value})} className="vd-inp"/></div>
            <div style={{marginBottom:13}}><label style={LBL}>IFSC Code</label><input type="text" value={schemeForm.ifsc} onChange={e=>setSchemeForm({...schemeForm,ifsc:e.target.value})} className="vd-inp"/></div>
            <div style={{marginBottom:18}}><label style={LBL}>Why are you applying? *</label><textarea value={schemeForm.reason} onChange={e=>setSchemeForm({...schemeForm,reason:e.target.value})} placeholder="Explain your need for this scheme…" className="vd-inp" style={{minHeight:70,resize:'vertical'}}/></div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setSchemeModal(null)} className="vd-btn vd-btn-ghost">Cancel</button>
              <button onClick={applyScheme} disabled={schemeLoading} className="vd-btn vd-btn-p">{schemeLoading?'Submitting…':'Submit Application'}</button>
            </div>
          </>}
        </VModal>
      )}

      {/* Add Member Modal */}
      {addMemberModal && (
        <VModal title="➕ Add Family Member" onClose={()=>setAddMemberModal(false)} maxWidth={480}>
          <div style={{marginBottom:13}}><label style={LBL}>Full Name *</label><input type="text" value={newMember.name} onChange={e=>setNewMember({...newMember,name:e.target.value})} className="vd-inp"/></div>
          <div className="vd-g2c" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:13}}>
            <div><label style={LBL}>Aadhaar Last 4</label><input type="tel" value={newMember.aadhaarLast4} onChange={e=>setNewMember({...newMember,aadhaarLast4:e.target.value})} className="vd-inp" maxLength={4}/></div>
            <div><label style={LBL}>Age</label><input type="tel" value={newMember.age} onChange={e=>setNewMember({...newMember,age:e.target.value})} className="vd-inp" maxLength={3}/></div>
          </div>
          <div className="vd-g2c" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
            <div><label style={LBL}>Gender</label><select className="vd-inp" value={newMember.gender} onChange={e=>setNewMember({...newMember,gender:e.target.value})}>{['Male','Female','Other'].map(g=><option key={g}>{g}</option>)}</select></div>
            <div><label style={LBL}>Relation *</label><select className="vd-inp" value={newMember.relation} onChange={e=>setNewMember({...newMember,relation:e.target.value})}>{['Spouse','Son','Daughter','Father','Mother','Brother','Sister','Grandfather','Grandmother','Other'].map(r=><option key={r}>{r}</option>)}</select></div>
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setAddMemberModal(false)} className="vd-btn vd-btn-ghost">Cancel</button>
            <button onClick={addMember} disabled={memberLoading} className="vd-btn vd-btn-p">{memberLoading?'Adding…':'Add Member ✓'}</button>
          </div>
        </VModal>
      )}

      {/* SOS Modal */}
      {sosModal && (
        <VModal title="🚨 Emergency SOS" onClose={()=>setSOSModal(false)} maxWidth={380}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[{t:'medical',i:'🏥',l:'Medical',c:'#dc2626'},{t:'fire',i:'🔥',l:'Fire',c:'#ea580c'},{t:'police',i:'👮',l:'Police',c:TL},{t:'general',i:'🆘',l:'General',c:A}].map(s=>(
              <button key={s.t} onClick={()=>{getGPS((loc,lat,lng)=>{api.post('/sos',{type:s.t,location:loc,gpsLat:lat,gpsLong:lng}).catch(()=>{});showToast(`${s.l} SOS sent! Help on the way.`,'success');setSOSModal(false);});}} style={{background:s.c,color:'#fff',border:'none',padding:18,borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                <span style={{fontSize:28}}>{s.i}</span>{s.l}
              </button>
            ))}
          </div>
          <div style={{marginTop:14,fontSize:12,color:MUT,textAlign:'center'}}>GPS location will be shared with emergency services.</div>
        </VModal>
      )}

      {/* ── Sell / New Listing Modal ── */}
      {listingModal && (
        <VModal title="🌾 List Your Produce for Sale" onClose={()=>setListingModal(false)} maxWidth={520}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div><label style={LBL}>Product Name *</label><input className="vd-inp" placeholder="e.g. Wheat, Tomato" value={sellForm.product} onChange={e=>setSellForm({...sellForm,product:e.target.value})}/></div>
            <div><label style={LBL}>Category</label>
              <select className="vd-inp" value={sellForm.category} onChange={e=>setSellForm({...sellForm,category:e.target.value})}>
                {['grain','vegetable','fruit','pulse','oilseed','spice','dairy','other'].map(c=><option key={c} style={{textTransform:'capitalize'}} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
            <div><label style={LBL}>Quantity *</label><input className="vd-inp" type="number" min="1" placeholder="e.g. 100" value={sellForm.quantity} onChange={e=>setSellForm({...sellForm,quantity:e.target.value})}/></div>
            <div><label style={LBL}>Unit</label>
              <select className="vd-inp" value={sellForm.unit} onChange={e=>setSellForm({...sellForm,unit:e.target.value})}>
                {['kg','quintal','ton','litre','dozen','piece'].map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
            <div><label style={LBL}>Price / Unit (₹) *</label><input className="vd-inp" type="number" min="1" placeholder="₹ per unit" value={sellForm.pricePerUnit} onChange={e=>setSellForm({...sellForm,pricePerUnit:e.target.value})}/></div>
          </div>
          <div style={{marginBottom:12}}><label style={LBL}>Min Order Qty</label><input className="vd-inp" type="number" min="1" value={sellForm.minOrderQty} onChange={e=>setSellForm({...sellForm,minOrderQty:e.target.value})}/></div>
          <div style={{marginBottom:12}}><label style={LBL}>Description (Optional)</label><textarea className="vd-inp" rows={3} placeholder="Quality, harvest date, special notes…" value={sellForm.description} onChange={e=>setSellForm({...sellForm,description:e.target.value})}/></div>
          <div style={{marginBottom:12}}>
            <label style={LBL}>Pickup Location</label>
            <div style={{display:'flex',gap:8}}>
              <input className="vd-inp" placeholder="Village / area" value={sellForm.location} onChange={e=>setSellForm({...sellForm,location:e.target.value})} style={{flex:1}}/>
              <button onClick={()=>getGPS((loc)=>setSellForm({...sellForm,location:loc}))} className="vd-btn vd-btn-t" style={{padding:'0 14px',fontSize:12,flexShrink:0}}>{gpsLoading?'…':'📍 GPS'}</button>
            </div>
          </div>
          <div style={{marginBottom:18,display:'flex',alignItems:'center',gap:10}}>
            <div onClick={()=>setSellForm({...sellForm,isOrganic:!sellForm.isOrganic})} className="vd-tog" style={{background:sellForm.isOrganic?P:BDR}}>
              <div className="vd-tog-k" style={{left:sellForm.isOrganic?22:3}}/>
            </div>
            <span style={{fontSize:13,color:TX}}>🌿 Certified Organic / Natural Farming</span>
          </div>
          {/* Mandi reference */}
          {sellForm.product && mandiPrices.find(m=>m.product.toLowerCase()===sellForm.product.toLowerCase()) && (
            <div style={{background:'rgba(8,145,178,.08)',border:`1px solid rgba(8,145,178,.3)`,borderRadius:10,padding:'10px 12px',marginBottom:14,fontSize:12,color:TL}}>
              📊 Mandi Reference: <strong>₹{mandiPrices.find(m=>m.product.toLowerCase()===sellForm.product.toLowerCase())?.price.toLocaleString()}</strong> per {mandiPrices.find(m=>m.product.toLowerCase()===sellForm.product.toLowerCase())?.unit}
            </div>
          )}
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setListingModal(false)} className="vd-btn vd-btn-ghost">Cancel</button>
            <button onClick={submitListing} disabled={sellLoading} className="vd-btn vd-btn-p">{sellLoading?'Publishing…':'🌾 Publish Listing'}</button>
          </div>
        </VModal>
      )}

      {/* ── Contact Seller Modal ── */}
      {contactModal && (
        <VModal title="📞 Contact Seller" onClose={()=>setContactModal(null)} maxWidth={420}>
          <div style={{textAlign:'center',padding:'16px 0 20px'}}>
            <div style={{width:56,height:56,borderRadius:'50%',background:`linear-gradient(135deg,${P},${PD})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:22,margin:'0 auto 10px'}}>{contactModal.sellerName?.[0]}</div>
            <div style={{fontWeight:700,fontSize:17,color:TX}}>{contactModal.sellerName}</div>
            <div style={{fontSize:13,color:MUT,marginTop:2}}>📍 {contactModal.sellerVillage || 'Village Farmer'}</div>
          </div>
          <div style={{background:BG2,borderRadius:14,padding:16,marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:700,color:TX,marginBottom:4}}>{contactModal.product} {contactModal.isOrganic&&<span style={{fontSize:11,color:P}}>🌿 Organic</span>}</div>
            <div style={{fontSize:22,fontWeight:800,color:A,fontFamily:"'Sora',sans-serif",marginBottom:4}}>₹{contactModal.pricePerUnit.toLocaleString()}/{contactModal.unit}</div>
            <div style={{fontSize:13,color:MUT}}>Available: {contactModal.quantity} {contactModal.unit} · Min order: {contactModal.minOrderQty} {contactModal.unit}</div>
          </div>
          {contactModal.sellerMobile ? (
            <a href={`tel:${contactModal.sellerMobile}`} className="vd-btn vd-btn-p" style={{width:'100%',justifyContent:'center',display:'flex',textDecoration:'none',marginBottom:10}}>📞 Call Seller: {contactModal.sellerMobile}</a>
          ) : (
            <div style={{background:AG,border:`1px solid ${A}44`,borderRadius:10,padding:'12px 14px',fontSize:13,color:A,marginBottom:10,textAlign:'center'}}>
              Contact details shared with Panchayat. Visit Panchayat office to get seller's contact.
            </div>
          )}
          <button onClick={async()=>{ await api.post(`/marketplace/${contactModal._id}/inquire`).catch(()=>{}); showToast('Interest registered!','success'); setContactModal(null); }} className="vd-btn vd-btn-t" style={{width:'100%',justifyContent:'center'}}>✉️ Register Interest</button>
        </VModal>
      )}

      {/* AI Chatbot */}
      <GramMitraBot user={user}/>
      {livePhotoModal && <LivePhotoCapture onClose={()=>setLivePhotoModal(false)} onSuccess={()=>setLivePhotoModal(false)} purpose="record"/>}
    </>
  );
}
/* ─────────────────────────────────────────────
   HELPER COMPONENTS
─────────────────────────────────────────────── */

/* Generic Modal */
function VModal({ title, onClose, children, maxWidth = 500 }) {
  return (
    <div className="vd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="vd-modal" style={{ maxWidth }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, paddingBottom:14, borderBottom:`1px solid ${BDR}` }}>
          <div style={{ fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:700, color:TX }}>{title}</div>
          <button onClick={onClose} style={{ width:30, height:30, background:BG2, border:`1px solid ${BDR}`, borderRadius:8, cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', color:MUT }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* Table wrapper */
function VTable({ headers, children }) {
  return (
    <div style={{ background:CARD, border:`1px solid ${BDR}`, borderRadius:14, overflow:'hidden', overflowX:'auto', marginBottom:20, boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ background:BG2 }}>
            {headers.map(h => (
              <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:MUT, textTransform:'uppercase', letterSpacing:.7, whiteSpace:'nowrap', borderBottom:`1px solid ${BDR}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/* Status Badge */
function VBadge({ s }) {
  const map = {
    Pending:       ['#FFF7ED','#D97706'],
    Approved:      ['#ECFDF5','#059669'],
    'In Progress': ['#EFF6FF','#2563EB'],
    Rejected:      ['#FEF2F2','#DC2626'],
    Paid:          ['#ECFDF5','#059669'],
    'Under Review':['#EFF6FF','#2563EB'],
    Ready:         ['#ECFDF5','#065F46'],
    Active:        ['#ECFDF5','#059669'],
    Inactive:      ['#FEF2F2','#DC2626'],
    Resolved:      ['#ECFDF5','#059669'],
  };
  const [bg, c] = map[s] || ['#F1F5F9','#64748B'];
  return (
    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:bg, color:c, whiteSpace:'nowrap', display:'inline-block' }}>{s}</span>
  );
}

/* Toggle row for settings */
function VToggleRow({ label, defaultOn }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${BDR}` }}>
      <span style={{ fontSize:13, color:TX }}>{label}</span>
      <div onClick={() => setOn(v => !v)} className="vd-tog" style={{ background: on ? P : BDR }}>
        <div className="vd-tog-k" style={{ left: on ? 22 : 3 }}/>
      </div>
    </div>
  );
}

/* Star Rating */
function StarRating({ id, current, onRate }) {
  const [hov, setHov] = useState(0);
  return (
    <div style={{ display:'flex', gap:2 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onMouseEnter={() => setHov(n)} onMouseLeave={() => setHov(0)} onClick={() => onRate(n)}
          style={{ fontSize:16, cursor:'pointer', color: n <= (hov || current || 0) ? '#F59E0B' : BDR, transition:'color .15s' }}>★</span>
      ))}
    </div>
  );
}

/* Profile Modal */
function VProfileModal({ open, onClose, user, settingsData, setSettingsData, saveSettings, settingsSaving }) {
  if (!open) return null;
  return (
    <VModal title="👤 Edit Profile" onClose={onClose} maxWidth={480}>
      {[['Full Name','name','text'],['Address','address','text'],['Village','village','text'],['Pincode','pincode','tel'],['Age','age','tel']].map(([label, key, type]) => (
        <div key={key} style={{ marginBottom:13 }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:MUT, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:7 }}>{label}</label>
          <input type={type} value={settingsData[key] || ''} onChange={e => setSettingsData({ ...settingsData, [key]: e.target.value })} className="vd-inp"/>
        </div>
      ))}
      <div style={{ marginBottom:18 }}>
        <label style={{ display:'block', fontSize:11, fontWeight:700, color:MUT, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:7 }}>Gender</label>
        <select className="vd-inp" value={settingsData.gender || ''} onChange={e => setSettingsData({ ...settingsData, gender: e.target.value })}>
          <option>Male</option><option>Female</option><option>Other</option>
        </select>
      </div>
      <div style={{ background:BG2, borderRadius:9, padding:'10px 12px', fontSize:12, color:MUT, marginBottom:18 }}>
        <strong>Family ID:</strong> {user?.familyId} &nbsp;·&nbsp; <strong>Mobile:</strong> {user?.mobile}
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button onClick={onClose} className="vd-btn vd-btn-ghost">Cancel</button>
        <button onClick={() => { saveSettings(); onClose(); }} disabled={settingsSaving} className="vd-btn vd-btn-p">
          {settingsSaving ? 'Saving…' : '💾 Save Changes'}
        </button>
      </div>
    </VModal>
  );
}

/* ─────────────────────────────────────────────
   WEATHER WIDGET
─────────────────────────────────────────────── */
const WMO_MAP = {
  0:'☀️ Clear',1:'🌤 Mostly Clear',2:'⛅ Partly Cloudy',3:'☁️ Overcast',
  45:'🌫 Foggy',48:'🌫 Icy Fog',
  51:'🌦 Light Drizzle',53:'🌦 Drizzle',55:'🌧 Heavy Drizzle',
  61:'🌧 Light Rain',63:'🌧 Rain',65:'🌧 Heavy Rain',
  71:'🌨 Light Snow',73:'🌨 Snow',75:'❄️ Heavy Snow',
  80:'🌦 Showers',81:'🌧 Heavy Showers',82:'⛈ Violent Showers',
  95:'⛈ Thunderstorm',96:'⛈ Hail Storm',99:'⛈ Severe Storm',
};
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function WeatherWidget({ weather, loading, locationName, onRefresh }) {
  if (loading) {
    return (
      <div style={{background:`linear-gradient(135deg,#0891B2,#0e7490)`,borderRadius:16,padding:20,color:'#fff',minHeight:160,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8}}>
        <div style={{fontSize:28,animation:'vd-spin 1s linear infinite'}}>🌀</div>
        <div style={{fontSize:13,opacity:.8}}>Detecting your location…</div>
      </div>
    );
  }
  if (!weather || !weather.current) {
    return (
      <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:16,padding:20,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10,minHeight:160}}>
        <div style={{fontSize:32}}>🌡️</div>
        <div style={{fontSize:13,color:MUT,textAlign:'center'}}>Weather unavailable</div>
        <button onClick={onRefresh} style={{fontSize:12,color:TL,background:'rgba(8,145,178,.1)',border:`1px solid rgba(8,145,178,.3)`,borderRadius:8,padding:'5px 14px',cursor:'pointer',fontWeight:700}}>🔄 Retry</button>
      </div>
    );
  }

  const c = weather.current;
  const daily = weather.daily;
  const desc = WMO_MAP[c.weather_code] || '🌡️ Unknown';
  const emoji = desc.split(' ')[0];
  const label = desc.split(' ').slice(1).join(' ');

  return (
    <div style={{background:`linear-gradient(135deg,#0369a1 0%,#0891B2 50%,#06b6d4 100%)`,borderRadius:16,padding:20,color:'#fff',overflow:'hidden',position:'relative'}}>
      {/* Decorative circles */}
      <div style={{position:'absolute',top:-24,right:-24,width:90,height:90,background:'rgba(255,255,255,.07)',borderRadius:'50%',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:-30,left:-20,width:110,height:110,background:'rgba(255,255,255,.05)',borderRadius:'50%',pointerEvents:'none'}}/>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10,position:'relative'}}>
        <div>
          <div style={{fontSize:11,opacity:.75,fontWeight:600,textTransform:'uppercase',letterSpacing:.6}}>🌍 {locationName || 'Your Location'}</div>
          <div style={{fontSize:11,opacity:.6,marginTop:2}}>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'short'})}</div>
        </div>
        <button onClick={onRefresh} style={{background:'rgba(255,255,255,.18)',border:'none',color:'#fff',borderRadius:8,padding:'4px 9px',cursor:'pointer',fontSize:12,fontWeight:700,flexShrink:0}}>🔄</button>
      </div>

      {/* Current temp */}
      <div style={{display:'flex',alignItems:'flex-end',gap:10,marginBottom:14,position:'relative'}}>
        <div style={{fontSize:52,lineHeight:1}}>{emoji}</div>
        <div>
          <div style={{fontSize:36,fontWeight:800,fontFamily:"'Sora',sans-serif",lineHeight:1}}>{Math.round(c.temperature_2m)}°C</div>
          <div style={{fontSize:12,opacity:.8}}>Feels {Math.round(c.apparent_temperature)}°C · {label}</div>
        </div>
      </div>

      {/* Extra info */}
      <div style={{display:'flex',gap:14,marginBottom:14,position:'relative'}}>
        <div style={{background:'rgba(255,255,255,.15)',borderRadius:9,padding:'6px 10px',textAlign:'center',minWidth:60}}>
          <div style={{fontSize:10,opacity:.75}}>Humidity</div>
          <div style={{fontSize:14,fontWeight:700}}>{c.relative_humidity_2m}%</div>
        </div>
        <div style={{background:'rgba(255,255,255,.15)',borderRadius:9,padding:'6px 10px',textAlign:'center',minWidth:60}}>
          <div style={{fontSize:10,opacity:.75}}>Wind</div>
          <div style={{fontSize:14,fontWeight:700}}>{Math.round(c.wind_speed_10m)} km/h</div>
        </div>
        <div style={{background:'rgba(255,255,255,.15)',borderRadius:9,padding:'6px 10px',textAlign:'center',minWidth:60}}>
          <div style={{fontSize:10,opacity:.75}}>Rain</div>
          <div style={{fontSize:14,fontWeight:700}}>{c.precipitation} mm</div>
        </div>
      </div>

      {/* 5-day forecast strip */}
      {daily && (
        <div style={{display:'flex',gap:6,position:'relative'}}>
          {daily.time.slice(0,5).map((date,i)=>{
            const dayName = i===0?'Today':DAY_NAMES[new Date(date).getDay()];
            const icon = (WMO_MAP[daily.weather_code[i]] || '🌡️').split(' ')[0];
            return (
              <div key={date} style={{flex:1,background:'rgba(255,255,255,.15)',borderRadius:10,padding:'7px 4px',textAlign:'center'}}>
                <div style={{fontSize:10,opacity:.75,marginBottom:3}}>{dayName}</div>
                <div style={{fontSize:16,marginBottom:3}}>{icon}</div>
                <div style={{fontSize:10,fontWeight:700}}>{Math.round(daily.temperature_2m_max[i])}°</div>
                <div style={{fontSize:9,opacity:.7}}>{Math.round(daily.temperature_2m_min[i])}°</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
