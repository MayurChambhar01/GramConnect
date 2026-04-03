import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { showToast } from '../components/Toast';
import api from '../api/axios';
import FakeDetector from '../components/FakeDetector';
import FaceRegister from '../components/FaceAttendance';

/* ─── WHITE THEME TOKENS ─── */
const P = '#16A34A', PD = '#15803D', PG = 'rgba(22,163,74,0.10)';
const A = '#D97706', AD = '#B45309', AG = 'rgba(217,119,6,0.10)';
const TL = '#0891B2', TLD = '#0e7490', TLG = 'rgba(8,145,178,0.10)';
const BG = '#F0F4F8', BG2 = '#E8EDF5', CARD = '#FFFFFF';
const BDR = '#E2E8F0', BDRH = '#CBD5E1';
const TX = '#0F172A', MUT = '#64748B', DIM = '#94A3B8';
const DNG = '#DC2626', SUC = '#16A34A', WRN = '#D97706';
const LBL = { display:'block',fontSize:11,fontWeight:700,color:MUT,letterSpacing:'0.07em',textTransform:'uppercase',marginBottom:7 };
const TD  = { padding:'11px 14px',fontSize:13,borderBottom:`1px solid ${BDR}`,color:TX,verticalAlign:'middle' };

const MENU = [
  { id:'dashboard',     icon:'📊', label:'Dashboard' },
  { id:'users',         icon:'👥', label:'Users' },
  { id:'certificates',  icon:'📋', label:'Certificates' },
  { id:'complaints',    icon:'🔧', label:'Complaints' },
  { id:'tax',           icon:'💰', label:'Tax Management' },
  { id:'sos',           icon:'🚨', label:'SOS Alerts' },
  { id:'notifications', icon:'📢', label:'Notifications' },
  { id:'documents',     icon:'📁', label:'Documents' },
  { id:'voting',        icon:'🗳️', label:'Voting Polls' },
  { id:'assets',        icon:'📍', label:'Assets' },
  { id:'face',          icon:'🧑‍💻', label:'Face Register' },
  { id:'captures',      icon:'📸', label:'Live Captures' },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t: tr, lang, switchLang, langs } = useLang();
  const [panel, setPanel]           = useState('dashboard');
  const [stats, setStats]           = useState({});
  const [users, setUsers]           = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [certs, setCerts]           = useState([]);
  const [taxes, setTaxes]           = useState([]);
  const [sosList, setSosList]       = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [documents, setDocuments]   = useState([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [notifForm, setNotifForm]   = useState({ title:'', message:'', target:'all', method:'push' });
  const [taxForm, setTaxForm]       = useState({ userId:'', type:'property', amount:'', dueDate:'', year: new Date().getFullYear() });
  const [taxModal, setTaxModal]     = useState(false);
  const [taxBusy, setTaxBusy]       = useState(false);
  const [docView, setDocView]       = useState(null);
  const [aiModal, setAiModal]       = useState(null);
  const [polls, setPolls]           = useState([]);
  const [pollForm, setPollForm]     = useState({ title:'', description:'', category:'other', endDate:'', options:[{label:'',description:''},{label:'',description:''}] });
  const [pollModal, setPollModal]   = useState(false);
  const [pollLoading, setPollLoading] = useState(false);
  const [adminAssets, setAdminAssets] = useState([]);
  const [assetForm, setAssetForm]   = useState({ name:'', type:'well', location:'', ward:'', status:'Good', description:'', lat:'', lng:'' });
  const [assetModal, setAssetModal] = useState(false);
  const [assetLoading, setAssetLoading] = useState(false);
  const [sideOpen, setSideOpen]     = useState(false);
  const [captures, setCaptures]     = useState([]);

  const fetchAll = useCallback(async () => {
    try {
      const [s,u,c,cert,t,sos,notif,docs] = await Promise.all([
        api.get('/admin/stats'), api.get('/admin/users?limit=100'), api.get('/complaints?limit=100'),
        api.get('/certificates?limit=100'), api.get('/taxes?limit=100'), api.get('/sos'),
        api.get('/notifications'), api.get('/documents/admin/all').catch(()=>({data:{documents:[]}})),
      ]);
      setStats(s.data.stats||{}); setUsers(u.data.users||[]); setComplaints(c.data.complaints||[]);
      setCerts(cert.data.certificates||[]); setTaxes(t.data.taxes||[]); setSosList(sos.data.alerts||[]);
      setNotifications(notif.data.notifications||[]); setDocuments(docs.data.documents||[]);
      try { const vr = await api.get('/voting/all'); setPolls(vr.data.polls||[]); } catch{}
      try { const ar = await api.get('/assets'); setAdminAssets(ar.data.assets||[]); } catch{}
      try { const cr = await api.get('/documents/live-captures'); setCaptures(cr.data.captures||[]); } catch{}
    } catch(e) { console.error(e); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateComplaint = async (id,status) => { await api.patch(`/complaints/${id}/status`,{status}); showToast(`Complaint ${status}`,'success'); fetchAll(); };
  const updateCert = async (id,status) => { await api.patch(`/certificates/${id}/status`,{status}); showToast(`Certificate ${status}`,'success'); fetchAll(); };
  const toggleUser = async (id,isActive) => {
    try { await api.patch(`/admin/users/${id}/status`,{isActive:!isActive}); fetchAll(); showToast(isActive?'User deactivated':'User activated','info'); }
    catch(e) { showToast(e.response?.data?.message||'Failed','error'); }
  };
  const assignTax = async () => {
    if(!taxForm.userId||!taxForm.amount||!taxForm.dueDate){showToast('Fill all required fields','warning');return;}
    setTaxBusy(true);
    try { await api.post('/admin/taxes/assign',taxForm); showToast('Tax assigned successfully','success'); setTaxModal(false); setTaxForm({userId:'',type:'property',amount:'',dueDate:'',year:new Date().getFullYear()}); fetchAll(); }
    catch(e){ showToast(e.response?.data?.message||'Failed','error'); }
    finally { setTaxBusy(false); }
  };
  const sendNotif = async () => {
    if(!notifForm.title||!notifForm.message){showToast('Fill all fields','warning');return;}
    setLoading(true);
    try { await api.post('/notifications',notifForm); showToast('Notification sent!','success'); setNotifForm({title:'',message:'',target:'all',method:'push'}); fetchAll(); }
    catch{ showToast('Failed','error'); } finally { setLoading(false); }
  };
  const createPoll = async () => {
    const valid = pollForm.options.filter(o=>o.label.trim()).length >= 2;
    if (!pollForm.title||!pollForm.endDate||!valid) { showToast('Fill title, end date and 2+ options','warning'); return; }
    setPollLoading(true);
    try { await api.post('/voting',{...pollForm,options:pollForm.options.filter(o=>o.label.trim())}); showToast('Poll created!','success'); setPollModal(false); setPollForm({title:'',description:'',category:'other',endDate:'',options:[{label:'',description:''},{label:'',description:''}]}); fetchAll(); }
    catch(e) { showToast(e.response?.data?.message||'Failed','error'); }
    finally { setPollLoading(false); }
  };
  const closePoll = async (id) => { await api.patch(`/voting/${id}/close`); showToast('Poll closed','info'); fetchAll(); };
  const deletePoll = async (id) => { await api.delete(`/voting/${id}`); showToast('Poll deleted','info'); fetchAll(); };
  const createAsset = async () => {
    if (!assetForm.name||!assetForm.location) { showToast('Fill name and location','warning'); return; }
    setAssetLoading(true);
    try { await api.post('/assets',assetForm); showToast('Asset added!','success'); setAssetModal(false); setAssetForm({name:'',type:'well',location:'',ward:'',status:'Good',description:''}); fetchAll(); }
    catch(e) { showToast(e.response?.data?.message||'Failed','error'); }
    finally { setAssetLoading(false); }
  };
  const updateAssetStatus = async (id,status) => { await api.patch(`/assets/${id}`,{status}); fetchAll(); showToast('Status updated','success'); };
  const resolveSOSAlert = async (id) => { await api.patch(`/sos/${id}/resolve`); showToast('SOS resolved','success'); fetchAll(); };

  const filtered = users.filter(u=>!search||u.name?.toLowerCase().includes(search.toLowerCase())||u.mobile?.includes(search)||u.familyId?.toLowerCase().includes(search.toLowerCase()));

  const navigate2 = (p) => { setPanel(p); setSideOpen(false); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;} body{margin:0;background:${BG};}
        @keyframes ad-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ad-spin{to{transform:rotate(360deg)}}
        @keyframes ad-modal{from{opacity:0;transform:scale(0.94)translateY(14px)}to{opacity:1;transform:scale(1)translateY(0)}}
        .ad-nav{display:flex;align-items:center;gap:9px;padding:9px 14px;cursor:pointer;border-left:3px solid transparent;transition:all .18s;font-family:'Plus Jakarta Sans',sans-serif;border-radius:0 8px 8px 0;margin:1px 6px 1px 0;}
        .ad-nav:hover{background:${BG2};}
        .ad-nav.on{background:${PG};border-left-color:${P};}
        .ad-nav.on .ad-nl{color:${P};font-weight:700;}
        .ad-nav.on .ad-ni{background:rgba(22,163,74,.18);}
        .ad-ni{width:28px;height:28px;border-radius:8px;background:${BG2};display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;transition:all .18s;}
        .ad-nl{font-size:12.5px;color:${MUT};font-weight:500;}
        .ad-card{background:${CARD};border:1px solid ${BDR};border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);transition:all .22s;}
        .ad-card:hover{border-color:${BDRH};box-shadow:0 6px 20px rgba(0,0,0,.08);}
        .ad-inp{width:100%;border:1.5px solid ${BDR};border-radius:10px;padding:10px 13px;font-size:13px;color:${TX};background:${BG2};outline:none;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s;}
        .ad-inp:focus{border-color:${P}!important;box-shadow:0 0 0 3px rgba(22,163,74,.15)!important;background:${CARD}!important;}
        .ad-inp::placeholder{color:${DIM};}
        select.ad-inp option{background:${CARD};color:${TX};}
        .ad-btn{border:none;border-radius:9px;padding:8px 16px;font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}
        .ad-btn:hover:not(:disabled){filter:brightness(1.06);transform:translateY(-1px);}
        .ad-btn:disabled{opacity:.5;cursor:not-allowed;}
        .ad-btn-g{background:linear-gradient(135deg,#22C55E,${PD});color:#fff;box-shadow:0 3px 14px rgba(22,163,74,.25);}
        .ad-btn-a{background:linear-gradient(135deg,#F59E0B,${AD});color:#fff;box-shadow:0 3px 14px rgba(217,119,6,.25);}
        .ad-btn-r{background:linear-gradient(135deg,#EF4444,${DNG});color:#fff;box-shadow:0 3px 14px rgba(220,38,38,.25);}
        .ad-btn-t{background:linear-gradient(135deg,#06B6D4,${TLD});color:#fff;box-shadow:0 3px 14px rgba(8,145,178,.25);}
        .ad-btn-ghost{background:transparent;color:${MUT};border:1.5px solid ${BDR};}
        .ad-btn-ghost:hover{border-color:${BDRH};color:${TX};background:${BG2};}
        .ad-tr:hover td{background:${BG2}!important;}
        .ad-overlay{position:fixed;inset:0;z-index:200;background:rgba(15,23,42,.42);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
        .ad-modal{background:${CARD};border:1px solid ${BDRH};border-radius:20px;padding:28px 30px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.15);animation:ad-modal .3s cubic-bezier(.34,1.4,.64,1) both;}
        .ad-chip{padding:3px 11px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;display:inline-block;cursor:pointer;}
        ::-webkit-scrollbar{width:5px;height:5px;} ::-webkit-scrollbar-track{background:${BG2};} ::-webkit-scrollbar-thumb{background:${BDRH};border-radius:5px;}
        @media(max-width:768px){.ad-sidebar{transform:translateX(-100%);transition:transform .3s;}.ad-sidebar.open{transform:translateX(0);}.ad-main{margin-left:0!important;}.ad-mob-nav{display:flex!important;}.ad-page{padding:14px!important;padding-bottom:80px!important;}.ad-g4{grid-template-columns:1fr 1fr!important;}.ad-g3{grid-template-columns:1fr 1fr!important;}.ad-hide-mob{display:none!important;}}
        .ad-mob-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:${CARD};border-top:1.5px solid ${BDR};z-index:100;padding:5px 0 calc(5px + env(safe-area-inset-bottom));box-shadow:0 -2px 12px rgba(0,0,0,.08);}
        .ad-mob-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:7px 4px;background:none;border:none;color:${DIM};cursor:pointer;font-size:9.5px;gap:3px;font-family:'Plus Jakarta Sans',sans-serif;transition:color .18s;}
        .ad-mob-btn.on{color:${P};}
      `}</style>

      <div style={{display:'flex',minHeight:'100vh',fontFamily:"'Plus Jakarta Sans',sans-serif",background:BG,color:TX}}>

        {/* ── SIDEBAR ── */}
        <aside className="ad-sidebar" style={{width:230,background:CARD,display:'flex',flexDirection:'column',position:'fixed',height:'100vh',overflowY:'auto',zIndex:100,flexShrink:0,borderRight:`1.5px solid ${BDR}`,boxShadow:'2px 0 12px rgba(0,0,0,.06)'}}>
          {/* Brand */}
          <div style={{padding:'18px 16px',borderBottom:`1px solid ${BDR}`}}>
            <div style={{display:'flex',alignItems:'center',gap:11}}>
              <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${P},${PD})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,boxShadow:'0 0 20px rgba(34,197,94,.3)',flexShrink:0}}>🛡️</div>
              <div>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:800,color:TX,letterSpacing:.1}}>GrammConnect</div>
                <div style={{fontSize:9.5,color:MUT,letterSpacing:'0.08em',textTransform:'uppercase'}}>Admin Portal</div>
              </div>
            </div>
          </div>
          {/* Nav */}
          <nav style={{flex:1,padding:'8px 0'}}>
            <div style={{padding:'10px 14px 4px',fontSize:8.5,textTransform:'uppercase',letterSpacing:1.5,color:DIM,fontWeight:700}}>Management</div>
            {MENU.map(m => (
              <div key={m.id} className={`ad-nav${panel===m.id?' on':''}`} onClick={()=>setPanel(m.id)}>
                <div className="ad-ni">{m.icon}</div>
                <span className="ad-nl">{m.label}</span>
                {m.id==='sos'&&stats.liveSOS>0 && <span style={{marginLeft:'auto',background:DNG,color:'#fff',fontSize:9.5,fontWeight:700,padding:'2px 7px',borderRadius:10}}>{stats.liveSOS}</span>}
              </div>
            ))}
          </nav>
          {/* User */}
          <div style={{padding:'12px 14px',borderTop:`1px solid ${BDR}`}}>
            <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:10}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:`linear-gradient(135deg,${A},${AD})`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,color:'#fff',flexShrink:0}}>{user?.name?.[0]||'A'}</div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:TX,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name||'Admin'}</div>
                <div style={{fontSize:9.5,color:MUT}}>Super Administrator</div>
              </div>
            </div>
            <button onClick={()=>{logout();navigate('/');}} style={{width:'100%',background:'rgba(220,38,38,.08)',border:'1px solid rgba(220,38,38,.2)',color:DNG,borderRadius:8,padding:'7px',fontSize:11.5,fontWeight:600,cursor:'pointer',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>← {tr('logout')}</button>
          </div>
        </aside>

        {/* Mobile bottom nav */}
        <nav className="ad-mob-nav">
          {MENU.slice(0,5).map(m => (
            <button key={m.id} className={`ad-mob-btn${panel===m.id?' on':''}`} onClick={()=>setPanel(m.id)}>
              <span style={{fontSize:18}}>{m.icon}</span>{m.label}
            </button>
          ))}
        </nav>

        {/* ── MAIN ── */}
        <main className="ad-main" style={{marginLeft:230,flex:1,minWidth:0}}>
          {/* Topbar */}
          <div style={{background:CARD,borderBottom:`1.5px solid ${BDR}`,padding:'12px 22px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50,backdropFilter:'blur(20px)',flexWrap:'wrap',gap:10}}>
            <div>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:TX}}>{MENU.find(m=>m.id===panel)?.icon} {MENU.find(m=>m.id===panel)?.label}</div>
              <div style={{fontSize:11,color:MUT,marginTop:1}}>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              {stats.liveSOS>0 && <AChip label={`🚨 ${stats.liveSOS} Live SOS`} color={DNG} onClick={()=>setPanel('sos')}/>}
              <AChip label={`⏳ ${stats.pendingComplaints||0} Pending`} color={WRN} onClick={()=>setPanel('complaints')}/>
              <div className="gc-lang-picker">
                {langs.map(l=><button key={l.code} className={`gc-lang-btn${lang===l.code?' active':''}`} onClick={()=>switchLang(l.code)}>{l.native}</button>)}
              </div>
              <button onClick={fetchAll} title="Refresh" className="ad-btn ad-btn-ghost" style={{padding:'6px 10px'}}>🔄</button>
            </div>
          </div>

          {/* Content */}
          <div className="ad-page" style={{padding:'20px 22px',animation:'ad-up .3s ease both'}}>

            {/* ── DASHBOARD ── */}
            {panel==='dashboard' && (
              <>
                <div className="ad-g4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
                  <AStat icon="👥" label="Total Families" val={stats.totalFamilies||0} color={PG} accent={P} onClick={()=>setPanel('users')}/>
                  <AStat icon="📋" label="Complaints" val={stats.totalComplaints||0} color={AG} accent={A} onClick={()=>setPanel('complaints')}/>
                  <AStat icon="📜" label="Pending Certs" val={stats.pendingCerts||0} color={TLG} accent={TL} onClick={()=>setPanel('certificates')}/>
                  <AStat icon="🚨" label="Live SOS" val={stats.liveSOS||0} color="rgba(239,68,68,.12)" accent={DNG} onClick={()=>setPanel('sos')}/>
                </div>
                <div className="ad-g3" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                  <ACard title="📈 Monthly Complaints">
                    <div style={{display:'flex',alignItems:'flex-end',gap:8,height:110,padding:'0 4px'}}>
                      {[{l:'Oct',v:32},{l:'Nov',v:48},{l:'Dec',v:29},{l:'Jan',v:63},{l:'Feb',v:45},{l:'Mar',v:71}].map(b=>(
                        <div key={b.l} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,flex:1}}>
                          <span style={{fontSize:9,color:P,fontWeight:700}}>{b.v}</span>
                          <div style={{width:'100%',height:`${(b.v/71)*100}px`,background:`linear-gradient(to top,${PD},${P})`,borderRadius:'4px 4px 0 0'}}/>
                          <span style={{fontSize:9,color:MUT}}>{b.l}</span>
                        </div>
                      ))}
                    </div>
                  </ACard>
                  <ACard title="🏢 Department Status">
                    {[{l:'Water Supply',p:78},{l:'Electricity',p:91},{l:'Roads',p:54},{l:'Sanitation',p:67}].map(r=>(
                      <div key={r.l} style={{marginBottom:10}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:MUT,marginBottom:4}}><span>{r.l}</span><span style={{fontWeight:700,color:P}}>{r.p}%</span></div>
                        <div style={{height:6,background:BG2,borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',width:`${r.p}%`,background:`linear-gradient(to right,${PD},${P})`,borderRadius:4}}/></div>
                      </div>
                    ))}
                  </ACard>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:16}}>
                  {[{t:'Certificate Actions',a:['Approve Income Cert #2341','Reject Caste Cert #2290','Send SMS for Ready Certs']},
                    {t:'Complaint Tasks',a:['Assign CMP-0042 to Water Dept','Close 3 Resolved Complaints','Update Complainants']},
                    {t:'Tax & Payments',a:['Remind 87 Tax Defaulters','Generate Monthly Report','Update Water Bill Rates']}
                  ].map(card=>(
                    <ACard key={card.t} title={card.t}>
                      {card.a.map(a=><QBtn key={a} label={a}/>)}
                    </ACard>
                  ))}
                </div>
              </>
            )}

            {/* ── USERS ── */}
            {panel==='users' && (
              <>
                <div className="ad-g3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
                  <AStat icon="👥" label="Total Families" val={stats.totalFamilies||0} color={PG} accent={P}/>
                  <AStat icon="✅" label="Active" val={users.filter(u=>u.isActive).length} color={PG} accent={P}/>
                  <AStat icon="⛔" label="Inactive" val={users.filter(u=>!u.isActive).length} color="rgba(239,68,68,.12)" accent={DNG}/>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{position:'relative',maxWidth:400}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,pointerEvents:'none'}}>🔍</span>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, mobile, family ID…" className="ad-inp" style={{paddingLeft:36}}/></div>
                </div>
                <ATable headers={['Family ID','Name','Mobile','Village','Members','Status','Action']}>
                  {filtered.length===0 && <Blank cols={7} msg="No users found"/>}
                  {filtered.map(u=>(
                    <tr key={u._id} className="ad-tr">
                      <td style={TD}><span style={{fontSize:11,fontFamily:'monospace',color:TL}}>{u.familyId}</span></td>
                      <td style={TD}><strong>{u.name}</strong></td>
                      <td style={TD}>{u.mobile}</td>
                      <td style={TD}>{u.village}</td>
                      <td style={TD} align="center">{u.familyMembers?.length||0}</td>
                      <td style={TD}><ABadge s={u.isActive?'Active':'Inactive'}/></td>
                      <td style={TD}><button className={`ad-btn ${u.isActive?'ad-btn-r':'ad-btn-g'}`} style={{padding:'5px 12px',fontSize:11}} onClick={()=>toggleUser(u._id,u.isActive)}>{u.isActive?'Deactivate':'Activate'}</button></td>
                    </tr>
                  ))}
                </ATable>
              </>
            )}

            {/* ── CERTIFICATES ── */}
            {panel==='certificates' && (
              <>
                <div className="ad-g3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
                  <AStat icon="📋" label="Total" val={certs.length} color={PG} accent={P}/>
                  <AStat icon="⏳" label="Pending" val={certs.filter(c=>c.status==='Pending').length} color={AG} accent={A}/>
                  <AStat icon="✅" label="Approved" val={certs.filter(c=>c.status==='Approved').length} color={PG} accent={P}/>
                </div>
                <ATable headers={['App ID','Applicant','Type','Village','Status','Date','Actions']}>
                  {certs.length===0 && <Blank cols={7} msg="No certificate applications"/>}
                  {certs.map(c=>(
                    <tr key={c._id} className="ad-tr">
                      <td style={TD}><span style={{fontSize:11,fontFamily:'monospace',color:TL}}>{c.applicationId}</span></td>
                      <td style={TD}><strong>{c.user?.name||c.applicantName||'—'}</strong></td>
                      <td style={TD}><ATag label={c.type}/></td>
                      <td style={TD}>{c.user?.village||'—'}</td>
                      <td style={TD}><ABadge s={c.status}/></td>
                      <td style={{...TD,whiteSpace:'nowrap'}}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={TD}>
                        {c.status==='Pending'&&<><button className="ad-btn ad-btn-g" style={{padding:'4px 10px',fontSize:11,marginRight:4}} onClick={()=>updateCert(c._id,'Approved')}>✓ Approve</button><button className="ad-btn ad-btn-r" style={{padding:'4px 10px',fontSize:11}} onClick={()=>updateCert(c._id,'Rejected')}>✕ Reject</button></>}
                        {c.status==='Approved'&&<button className="ad-btn ad-btn-t" style={{padding:'4px 10px',fontSize:11}} onClick={()=>updateCert(c._id,'Ready')}>Mark Ready</button>}
                        {!['Pending','Approved'].includes(c.status)&&<span style={{fontSize:11,color:MUT}}>{c.status}</span>}
                      </td>
                    </tr>
                  ))}
                </ATable>
              </>
            )}

            {/* ── COMPLAINTS ── */}
            {panel==='complaints' && (
              <>
                <div className="ad-g4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
                  <AStat icon="📋" label="Total" val={complaints.length} color={PG} accent={P}/>
                  <AStat icon="⏳" label="Pending" val={complaints.filter(c=>c.status==='Pending').length} color={AG} accent={A}/>
                  <AStat icon="🔄" label="In Progress" val={complaints.filter(c=>c.status==='In Progress').length} color={TLG} accent={TL}/>
                  <AStat icon="✅" label="Resolved" val={complaints.filter(c=>c.status==='Resolved').length} color={PG} accent={P}/>
                </div>
                <ATable headers={['ID','Villager','Category','Location','Status','Date','Actions']}>
                  {complaints.length===0 && <Blank cols={7} msg="No complaints"/>}
                  {complaints.map(c=>(
                    <tr key={c._id} className="ad-tr">
                      <td style={TD}><span style={{fontSize:11,fontFamily:'monospace',color:TL}}>{c.complaintId}</span></td>
                      <td style={TD}><strong>{c.user?.name||'—'}</strong></td>
                      <td style={TD}><ATag label={c.category}/></td>
                      <td style={{...TD,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.location}</td>
                      <td style={TD}><ABadge s={c.status}/></td>
                      <td style={{...TD,whiteSpace:'nowrap'}}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={TD}>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                          {c.status==='Pending'&&<button className="ad-btn ad-btn-g" style={{padding:'4px 9px',fontSize:11}} onClick={()=>updateComplaint(c._id,'In Progress')}>Start</button>}
                          {c.status==='In Progress'&&<button className="ad-btn ad-btn-g" style={{padding:'4px 9px',fontSize:11}} onClick={()=>updateComplaint(c._id,'Resolved')}>Resolve</button>}
                          {c.status==='Pending'&&<button className="ad-btn ad-btn-r" style={{padding:'4px 9px',fontSize:11}} onClick={()=>updateComplaint(c._id,'Rejected')}>Reject</button>}
                          <button className="ad-btn" style={{padding:'4px 9px',fontSize:11,background:'rgba(139,92,246,.15)',color:'#A78BFA',border:'1.5px solid rgba(139,92,246,.3)'}} onClick={()=>setAiModal(c)}>🔍 AI</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </ATable>
              </>
            )}

            {/* ── TAX ── */}
            {panel==='tax' && (
              <>
                <div className="ad-g3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
                  <AStat icon="💰" label="Total Records" val={taxes.length} color={PG} accent={P}/>
                  <AStat icon="⏳" label="Pending" val={taxes.filter(t=>t.status==='Pending').length} color={AG} accent={A}/>
                  <AStat icon="✅" label="Paid" val={taxes.filter(t=>t.status==='Paid').length} color={PG} accent={P}/>
                </div>
                <ACard title="💰 Assign Tax to Villager" extra={<button className={`ad-btn ${taxModal?'ad-btn-r':'ad-btn-g'}`} onClick={()=>setTaxModal(!taxModal)}>{taxModal?'✕ Close':'+ Assign Tax'}</button>}>
                  {taxModal && (
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:4}}>
                      <div><label style={LBL}>Villager *</label><select value={taxForm.userId} onChange={e=>setTaxForm({...taxForm,userId:e.target.value})} className="ad-inp"><option value="">-- Select Villager --</option>{users.map(u=><option key={u._id} value={u._id}>{u.name} – {u.village}</option>)}</select></div>
                      <div><label style={LBL}>Tax Type *</label><select value={taxForm.type} onChange={e=>setTaxForm({...taxForm,type:e.target.value})} className="ad-inp">{['property','water','house','sewage','electricity','land'].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)} Tax</option>)}</select></div>
                      <div><label style={LBL}>Amount (₹) *</label><input type="number" value={taxForm.amount} onChange={e=>setTaxForm({...taxForm,amount:e.target.value})} placeholder="e.g. 2500" className="ad-inp"/></div>
                      <div><label style={LBL}>Due Date *</label><input type="date" value={taxForm.dueDate} onChange={e=>setTaxForm({...taxForm,dueDate:e.target.value})} className="ad-inp"/></div>
                      <div><label style={LBL}>Financial Year</label><input type="number" value={taxForm.year} onChange={e=>setTaxForm({...taxForm,year:e.target.value})} className="ad-inp"/></div>
                      <div style={{display:'flex',alignItems:'flex-end'}}><button onClick={assignTax} disabled={taxBusy} className="ad-btn ad-btn-g" style={{width:'100%',justifyContent:'center',padding:'10px'}}>{taxBusy?'Assigning…':'✓ Assign Tax'}</button></div>
                    </div>
                  )}
                </ACard>
                <ATable headers={['Villager','Village','Type','Amount','Due Date','Status','Txn ID']}>
                  {taxes.length===0 && <Blank cols={7} msg="No tax records. Assign taxes above."/>}
                  {taxes.map(t=>(
                    <tr key={t._id} className="ad-tr">
                      <td style={TD}><strong>{t.user?.name||'—'}</strong></td>
                      <td style={TD}>{t.user?.village||'—'}</td>
                      <td style={TD}><ATag label={t.type}/></td>
                      <td style={TD}><strong style={{color:A}}>₹{t.amount?.toLocaleString()}</strong></td>
                      <td style={{...TD,whiteSpace:'nowrap'}}>{t.dueDate?new Date(t.dueDate).toLocaleDateString('en-IN'):'—'}</td>
                      <td style={TD}><ABadge s={t.status}/></td>
                      <td style={TD}><span style={{fontSize:11,color:MUT,fontFamily:'monospace'}}>{t.transactionId||'—'}</span></td>
                    </tr>
                  ))}
                </ATable>
              </>
            )}

            {/* ── SOS ── */}
            {panel==='sos' && (
              <>
                <div className="ad-g3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
                  <AStat icon="🚨" label="Live Alerts" val={sosList.filter(s=>s.status==='Active').length} color="rgba(239,68,68,.12)" accent={DNG}/>
                  <AStat icon="🚒" label="Dispatched" val={sosList.filter(s=>s.status==='Dispatched').length} color={AG} accent={A}/>
                  <AStat icon="✅" label="Resolved" val={sosList.filter(s=>s.status==='Resolved').length} color={PG} accent={P}/>
                </div>
                {sosList.length===0 && <div style={{background:CARD,border:`1.5px solid ${BDR}`,borderRadius:14,padding:40,textAlign:'center',color:MUT}}><div style={{fontSize:40,marginBottom:8}}>🎉</div>No active SOS alerts</div>}
                <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:20}}>
                  {sosList.map(s=>(
                    <div key={s._id} style={{background:CARD,border:'1.5px solid rgba(239,68,68,.35)',borderRadius:14,padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                      <div>
                        <div style={{fontWeight:700,color:DNG,display:'flex',alignItems:'center',gap:8,fontSize:14}}>
                          <span style={{width:8,height:8,background:DNG,borderRadius:'50%',animation:'ad-pulse 1.2s infinite',display:'inline-block'}}/>
                          {s.user?.name} — {s.type?.toUpperCase()}
                        </div>
                        <div style={{fontSize:12,color:MUT,marginTop:4}}>📍 {s.location||`Lat ${s.gpsLat||'?'}`} · {new Date(s.createdAt).toLocaleTimeString('en-IN')}</div>
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button className="ad-btn ad-btn-r" onClick={()=>showToast('Calling '+s.user?.mobile,'info')}>📞 Call</button>
                        <button className="ad-btn ad-btn-g" onClick={()=>resolveSOSAlert(s._id)}>✓ Resolve</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── NOTIFICATIONS ── */}
            {panel==='notifications' && (
              <>
                <ACard title="📢 Send Notification" style={{maxWidth:560,marginBottom:20}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div><label style={LBL}>Target</label><select value={notifForm.target} onChange={e=>setNotifForm({...notifForm,target:e.target.value})} className="ad-inp"><option value="all">All Villagers</option><option value="ward">Selected Ward</option><option value="staff">Staff Only</option></select></div>
                    <div><label style={LBL}>Delivery Method</label><select value={notifForm.method} onChange={e=>setNotifForm({...notifForm,method:e.target.value})} className="ad-inp"><option value="push">Push Notification</option><option value="sms">SMS</option><option value="both">Both</option></select></div>
                    <div style={{gridColumn:'1/3'}}><label style={LBL}>Title *</label><input value={notifForm.title} onChange={e=>setNotifForm({...notifForm,title:e.target.value})} placeholder="Notification title" className="ad-inp"/></div>
                    <div style={{gridColumn:'1/3'}}><label style={LBL}>Message *</label><textarea value={notifForm.message} onChange={e=>setNotifForm({...notifForm,message:e.target.value})} rows={3} placeholder="Notification message…" className="ad-inp" style={{resize:'vertical'}}/></div>
                    <div style={{gridColumn:'1/3'}}><button onClick={sendNotif} disabled={loading} className="ad-btn ad-btn-g">{loading?<span style={{display:'inline-block',animation:'ad-spin .8s linear infinite'}}>⟳</span>:'📢 Send Notification'}</button></div>
                  </div>
                </ACard>
                <ATable headers={['Title','Message','Target','Method','Date']}>
                  {notifications.length===0 && <Blank cols={5} msg="No notifications sent yet."/>}
                  {notifications.map(n=>(
                    <tr key={n._id} className="ad-tr">
                      <td style={TD}><strong>{n.title}</strong></td>
                      <td style={{...TD,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.message}</td>
                      <td style={TD}><ATag label={n.target||'all'}/></td>
                      <td style={TD}>{n.method||'push'}</td>
                      <td style={{...TD,whiteSpace:'nowrap'}}>{new Date(n.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </ATable>
              </>
            )}

            {/* ── DOCUMENTS ── */}
            {panel==='documents' && (
              <>
                <div style={{marginBottom:20,fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:700}}>📁 Uploaded Documents</div>
                <ATable headers={['User','Village','Document Type','Filename','Uploaded','View']}>
                  {documents.length===0 && <Blank cols={6} msg="No documents uploaded yet."/>}
                  {documents.map(d=>(
                    <tr key={d._id} className="ad-tr">
                      <td style={TD}><strong>{d.user?.name||'—'}</strong></td>
                      <td style={TD}>{d.user?.village||'—'}</td>
                      <td style={TD}><ATag label={d.documentType||'document'}/></td>
                      <td style={{...TD,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.filename||d.originalName||'—'}</td>
                      <td style={{...TD,whiteSpace:'nowrap'}}>{new Date(d.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={TD}>{d.url&&<a href={d.url} target="_blank" rel="noreferrer" style={{color:TL,fontSize:12,fontWeight:600}}>📄 View</a>}</td>
                    </tr>
                  ))}
                </ATable>
              </>
            )}

            {/* ── VOTING ── */}
            {panel==='voting' && (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <div style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:700}}>🗳️ Voting Polls</div>
                  <button className="ad-btn ad-btn-g" onClick={()=>setPollModal(true)}>+ Create Poll</button>
                </div>
                {polls.length===0 && <div style={{background:CARD,border:`1.5px solid ${BDR}`,borderRadius:14,padding:40,textAlign:'center',color:MUT}}>No polls yet. Create one above.</div>}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
                  {polls.map(p=>(
                    <div key={p._id} style={{background:CARD,border:`1.5px solid ${BDR}`,borderRadius:14,padding:20}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                        <div style={{fontSize:14,fontWeight:700,color:TX}}>{p.title}</div>
                        <ABadge s={p.status==='active'?'Active':p.status==='closed'?'Resolved':'Pending'}/>
                      </div>
                      <div style={{fontSize:12,color:MUT,marginBottom:10}}>{p.description}</div>
                      <div style={{fontSize:11,color:MUT,marginBottom:12}}>⏰ Ends: {p.endDate?new Date(p.endDate).toLocaleDateString('en-IN'):'—'} · {p.votes?.length||0} votes</div>
                      <div style={{display:'flex',gap:8}}>
                        {p.status==='active'&&<button className="ad-btn ad-btn-a" style={{padding:'5px 12px',fontSize:11}} onClick={()=>closePoll(p._id)}>Close Poll</button>}
                        <button className="ad-btn ad-btn-r" style={{padding:'5px 12px',fontSize:11}} onClick={()=>deletePoll(p._id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── ASSETS ── */}
            {panel==='assets' && (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <div style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:700}}>📍 Village Assets</div>
                  <button className="ad-btn ad-btn-g" onClick={()=>setAssetModal(true)}>+ Add Asset</button>
                </div>
                <ATable headers={['Asset','Type','Location','Ward','Status','Reports','Update']}>
                  {adminAssets.length===0 && <Blank cols={7} msg="No assets. Add village infrastructure."/>}
                  {adminAssets.map(a=>(
                    <tr key={a._id} className="ad-tr">
                      <td style={TD}><strong>{a.name}</strong>{a.description&&<div style={{fontSize:11,color:MUT,marginTop:1}}>{a.description.substring(0,36)}</div>}</td>
                      <td style={TD}><ATag label={a.type}/></td>
                      <td style={TD}>{a.location}</td>
                      <td style={TD}>{a.ward||'—'}</td>
                      <td style={TD}><ABadge s={a.status}/></td>
                      <td style={TD}><span style={{fontWeight:700,color:a.reports?.length>0?DNG:MUT}}>{a.reports?.length||0}</span></td>
                      <td style={TD}>
                        <select value={a.status} onChange={e=>updateAssetStatus(a._id,e.target.value)} className="ad-inp" style={{padding:'5px 8px',width:'auto',fontSize:11}}>
                          {['Good','Needs Repair','Critical','Under Repair','Inactive'].map(s=><option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </ATable>
              </>
            )}

            {/* ── LIVE CAPTURES ── */}
            {panel==='captures' && (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <div>
                    <div style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:700,color:TX}}>📸 Live Photo Captures</div>
                    <div style={{fontSize:12,color:MUT,marginTop:3}}>Photos taken by villagers with GPS location proof</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <span style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:800,color:P}}>{captures.length}</span>
                    <span style={{fontSize:13,color:MUT}}>total captures</span>
                  </div>
                </div>
                {captures.length===0 && (
                  <div style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:14,padding:48,textAlign:'center',color:MUT}}>
                    <div style={{fontSize:40,marginBottom:12}}>📸</div>
                    <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>No live captures yet</div>
                    <div style={{fontSize:13}}>When villagers take live photos, they will appear here with GPS data.</div>
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
                  {captures.map(c=>(
                    <div key={c._id} style={{background:CARD,border:`1px solid ${BDR}`,borderRadius:14,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.06)',transition:'all .22s'}}>
                      {/* Photo */}
                      <div style={{position:'relative',background:BG2,height:160,overflow:'hidden'}}>
                        <img
                          src={`${c.viewUrl}?token=${localStorage.getItem('gs_token')}`}
                          alt="Live capture"
                          style={{width:'100%',height:'100%',objectFit:'cover'}}
                          onLoad={e=>{e.target.style.opacity=1;}}
                          onError={e=>{e.target.parentNode.innerHTML='<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#94A3B8;gap:6px"><span style=\"font-size:32px\">📷</span><span style=\"font-size:11px\">Photo loading failed</span></div>';}}
                          style={{width:'100%',height:'100%',objectFit:'cover',opacity:0,transition:'opacity .3s'}}
                        />
                        <div style={{position:'absolute',top:8,left:8,background:'rgba(0,0,0,.55)',color:'#fff',fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:20,backdropFilter:'blur(4px)'}}>
                          {c.purpose?.toUpperCase() || 'RECORD'}
                        </div>
                      </div>
                      {/* Info */}
                      <div style={{padding:'14px 16px'}}>
                        <div style={{fontWeight:700,fontSize:13,color:TX,marginBottom:2}}>{c.user?.name||'—'}</div>
                        <div style={{fontSize:11,color:MUT,marginBottom:10}}>{c.user?.village} · {c.user?.familyId}</div>
                        {c.lat && c.lng && (
                          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,background:PG,borderRadius:8,padding:'7px 10px'}}>
                            <span style={{fontSize:13}}>📍</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:11,fontWeight:700,color:PD}}>GPS Verified</div>
                              <div style={{fontSize:10,color:MUT,fontFamily:'monospace'}}>{parseFloat(c.lat).toFixed(5)}, {parseFloat(c.lng).toFixed(5)}</div>
                            </div>
                          </div>
                        )}
                        <div style={{fontSize:11,color:DIM,marginBottom:12}}>🕐 {new Date(c.createdAt).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                        <div style={{display:'flex',gap:8}}>
                          <a href={`${c.viewUrl}?token=${localStorage.getItem('gs_token')}`} target="_blank" rel="noreferrer" className="ad-btn ad-btn-t" style={{flex:1,textAlign:'center',textDecoration:'none',justifyContent:'center',padding:'6px 10px',fontSize:11}}>📥 View Full</a>
                          {c.mapsLink && <a href={c.mapsLink} target="_blank" rel="noreferrer" className="ad-btn ad-btn-g" style={{flex:1,textAlign:'center',textDecoration:'none',justifyContent:'center',padding:'6px 10px',fontSize:11}}>🗺 Maps</a>}
                          <button onClick={async()=>{if(!window.confirm('Delete this capture?'))return;await api.delete(`/documents/live-captures/${c._id}`);fetchAll();showToast('Deleted','info');}} className="ad-btn ad-btn-r" style={{padding:'6px 10px',fontSize:11}}>🗑</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── FACE ── */}
            {panel==='face' && (
              <div>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:700,marginBottom:4,color:TX}}>🧑‍💻 Face Registration</div>
                <div style={{fontSize:13,color:MUT,marginBottom:22}}>Register villager faces for Gram Sabha attendance verification</div>
                <FaceRegPanel users={users} showToast={showToast}/>
              </div>
            )}

          </div>{/* end content */}
        </main>
      </div>

      {/* ── CREATE POLL MODAL ── */}
      {pollModal && (
        <div className="ad-overlay" onClick={e=>e.target===e.currentTarget&&setPollModal(false)}>
          <div className="ad-modal">
            <MHead title="🗳️ Create Voting Poll" onClose={()=>setPollModal(false)}/>
            <div style={{marginBottom:14}}><label style={LBL}>Poll Title *</label><input value={pollForm.title} onChange={e=>setPollForm({...pollForm,title:e.target.value})} placeholder="Poll title" className="ad-inp"/></div>
            <div style={{marginBottom:14}}><label style={LBL}>Description</label><textarea value={pollForm.description} onChange={e=>setPollForm({...pollForm,description:e.target.value})} rows={2} placeholder="Optional description" className="ad-inp" style={{resize:'vertical'}}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
              <div><label style={LBL}>Category</label><select value={pollForm.category} onChange={e=>setPollForm({...pollForm,category:e.target.value})} className="ad-inp">{['infrastructure','welfare','budget','election','other'].map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label style={LBL}>End Date *</label><input type="date" value={pollForm.endDate} onChange={e=>setPollForm({...pollForm,endDate:e.target.value})} className="ad-inp"/></div>
            </div>
            <label style={LBL}>Options (min 2) *</label>
            {pollForm.options.map((o,i)=>(
              <div key={i} style={{display:'flex',gap:8,marginBottom:8}}>
                <input value={o.label} onChange={e=>{const opts=[...pollForm.options];opts[i]={...opts[i],label:e.target.value};setPollForm({...pollForm,options:opts});}} placeholder={`Option ${i+1}`} className="ad-inp" style={{flex:2}}/>
                <input value={o.description} onChange={e=>{const opts=[...pollForm.options];opts[i]={...opts[i],description:e.target.value};setPollForm({...pollForm,options:opts});}} placeholder="Details (optional)" className="ad-inp" style={{flex:1}}/>
                {pollForm.options.length>2&&<button onClick={()=>setPollForm({...pollForm,options:pollForm.options.filter((_,j)=>j!==i)})} style={{background:'rgba(239,68,68,.15)',border:'none',borderRadius:8,color:DNG,padding:'0 10px',cursor:'pointer',fontSize:16}}>×</button>}
              </div>
            ))}
            <button onClick={()=>setPollForm({...pollForm,options:[...pollForm.options,{label:'',description:''}]})} style={{background:TLG,border:`1px dashed ${TL}`,borderRadius:9,color:TL,padding:'8px 14px',fontSize:12,fontWeight:600,cursor:'pointer',marginBottom:18,width:'100%'}}>+ Add Option</button>
            <button onClick={createPoll} disabled={pollLoading} className="ad-btn ad-btn-g" style={{width:'100%',justifyContent:'center',padding:'11px'}}>{pollLoading?'Creating…':'✅ Create Poll'}</button>
          </div>
        </div>
      )}

      {/* ── ADD ASSET MODAL ── */}
      {assetModal && (
        <div className="ad-overlay" onClick={e=>e.target===e.currentTarget&&setAssetModal(false)}>
          <div className="ad-modal">
            <MHead title="📍 Add Village Asset" onClose={()=>setAssetModal(false)}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div style={{gridColumn:'1/3'}}><label style={LBL}>Asset Name *</label><input value={assetForm.name} onChange={e=>setAssetForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Community Well" className="ad-inp"/></div>
              <div><label style={LBL}>Type</label><select value={assetForm.type} onChange={e=>setAssetForm(f=>({...f,type:e.target.value}))} className="ad-inp">{['well','road','school','hospital','toilet','streetlight','park','other'].map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={LBL}>Ward</label><input value={assetForm.ward} onChange={e=>setAssetForm(f=>({...f,ward:e.target.value}))} placeholder="Ward number" className="ad-inp"/></div>
              <div style={{gridColumn:'1/3'}}><label style={LBL}>Location *</label><input value={assetForm.location} onChange={e=>setAssetForm(f=>({...f,location:e.target.value}))} placeholder="Location / address" className="ad-inp"/></div>
              <div><label style={LBL}>Status</label><select value={assetForm.status} onChange={e=>setAssetForm(f=>({...f,status:e.target.value}))} className="ad-inp">{['Good','Needs Repair','Critical','Under Repair','Inactive'].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={LBL}>Description</label><input value={assetForm.description} onChange={e=>setAssetForm(f=>({...f,description:e.target.value}))} placeholder="Brief description" className="ad-inp"/></div>
              <div style={{gridColumn:'1/3'}}><button onClick={createAsset} disabled={assetLoading} className="ad-btn ad-btn-g" style={{width:'100%',justifyContent:'center',padding:'11px'}}>{assetLoading?'Adding…':'✅ Add Asset'}</button></div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI MODAL ── */}
      {aiModal && (
        <div className="ad-overlay" onClick={e=>e.target===e.currentTarget&&setAiModal(null)}>
          <div className="ad-modal">
            <MHead title="🔍 AI Fake Detection" onClose={()=>setAiModal(null)}/>
            <div style={{background:'rgba(139,92,246,.08)',border:'1px solid rgba(139,92,246,.25)',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:12,color:MUT}}>
              <strong style={{color:'#A78BFA'}}>{aiModal.complaintId}</strong> · {aiModal.user?.name} · {aiModal.category}
            </div>
            <FakeDetector onResult={r=>{ if(r.action==='REJECT'){ updateComplaint(aiModal._id,'Rejected'); setAiModal(null); } }}/>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Shared style tokens ─── */

/* ─── Helper Components ─── */
function AChip({label,color,onClick}) {
  return <span onClick={onClick} style={{background:`${color}18`,color,border:`1.5px solid ${color}44`,fontSize:11,padding:'4px 12px',borderRadius:20,fontWeight:700,cursor:onClick?'pointer':'default',whiteSpace:'nowrap',display:'inline-block'}}>{label}</span>;
}
function AStat({icon,label,val,color,accent,onClick}) {
  return (
    <div onClick={onClick} style={{background:CARD,border:`1.5px solid ${BDR}`,borderRadius:14,padding:'16px 18px',display:'flex',alignItems:'center',gap:14,cursor:onClick?'pointer':'default',transition:'all .22s',backdropFilter:'blur(20px)'}}
      onMouseEnter={e=>{if(onClick){e.currentTarget.style.borderColor='rgba(255,255,255,.18)';e.currentTarget.style.transform='translateY(-2px)';}}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=BDR;e.currentTarget.style.transform='translateY(0)';}}>
      <div style={{width:46,height:46,borderRadius:12,background:color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,border:`1px solid ${accent}33`}}>{icon}</div>
      <div><div style={{fontSize:11,color:MUT,fontWeight:600}}>{label}</div><div style={{fontSize:24,fontWeight:800,color:TX,fontFamily:"'Sora',sans-serif"}}>{val}</div></div>
    </div>
  );
}
function ACard({title,children,extra}) {
  return (
    <div style={{background:CARD,border:`1.5px solid ${BDR}`,borderRadius:14,padding:'18px 20px',marginBottom:20,backdropFilter:'blur(20px)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${BDR}`}}>
        <span style={{fontSize:13,fontWeight:700,color:TX,fontFamily:"'Sora',sans-serif"}}>{title}</span>
        {extra}
      </div>
      {children}
    </div>
  );
}
function ATable({headers,children}) {
  return (
    <div style={{background:CARD,border:`1.5px solid ${BDR}`,borderRadius:14,overflow:'hidden',overflowX:'auto',marginBottom:20,backdropFilter:'blur(20px)'}}>
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr style={{background:BG2}}>{headers.map(h=><th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:MUT,textTransform:'uppercase',letterSpacing:.7,whiteSpace:'nowrap',borderBottom:`1.5px solid ${BDR}`}}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function ABadge({s}) {
  const map = {Pending:['#FFF7ED','#D97706'],Approved:['#ECFDF5','#059669'],'In Progress':['#EFF6FF','#2563EB'],Rejected:['#FEF2F2','#DC2626'],Paid:['#ECFDF5','#059669'],'Under Review':['#EFF6FF','#2563EB'],Ready:['#ECFDF5','#065F46'],Active:['#ECFDF5','#059669'],Inactive:['#FEF2F2','#DC2626'],Resolved:['#ECFDF5','#059669'],Dispatched:['#FFF7ED','#D97706'],Good:['#ECFDF5','#059669'],'Needs Repair':['#FFF7ED','#D97706'],Critical:['#FEF2F2','#DC2626']};
  const [bg,c] = map[s]||['#F1F5F9','#64748B'];
  return <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:bg,color:c,whiteSpace:'nowrap',display:'inline-block'}}>{s}</span>;
}
function ATag({label}) {
  return <span style={{background:PG,color:P,padding:'2px 9px',borderRadius:12,fontSize:11,fontWeight:700,textTransform:'capitalize',border:'1px solid rgba(34,197,94,.2)'}}>{label}</span>;
}
function Blank({cols,msg}) {
  return <tr><td colSpan={cols} style={{...TD,textAlign:'center',padding:36,color:MUT}}>{msg}</td></tr>;
}
function MHead({title,onClose}) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22,paddingBottom:16,borderBottom:`1px solid ${BDR}`}}>
      <div style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:700,color:TX}}>{title}</div>
      <button onClick={onClose} style={{width:30,height:30,background:BG2,border:'none',borderRadius:8,color:MUT,fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>×</button>
    </div>
  );
}
function QBtn({label}) {
  const [done,setDone] = useState(false);
  return (
    <button onClick={()=>{setDone(true);showToast(label+' — Done!','success');setTimeout(()=>setDone(false),2000);}}
      style={{width:'100%',background:done?PG:BG2,border:`1.5px solid ${done?'rgba(34,197,94,.4)':BDR}`,borderRadius:9,padding:'9px 12px',fontSize:12.5,color:done?'#4ade80':TX,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:8,fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:600,transition:'all .18s',marginBottom:7}}>
      <span style={{width:5,height:5,background:done?'#4ade80':'#F59E0B',borderRadius:'50%',flexShrink:0}}/>
      {done?'✓ Done':label}
    </button>
  );
}

/* ─── Face Register Panel ─── */
function FaceRegPanel({users,showToast}) {
  const [regFaces,setRegFaces] = useState([]);
  const [sel,setSel] = useState('');
  const [images,setImages] = useState([]);
  const [loading,setLoading] = useState(false);
  const [aiStatus,setAiStatus] = useState(null);
  const [capturing,setCapturing] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    api.get('/ai/health').then(r=>setAiStatus(r.data.status==='ok'?'online':'offline')).catch(()=>setAiStatus('offline'));
    api.get('/ai/face/list').then(r=>setRegFaces(r.data.users||[])).catch(()=>{});
  }, []);

  const startCam = async () => {
    try { const s=await navigator.mediaDevices.getUserMedia({video:{width:320,height:240,facingMode:'user'},audio:false}); streamRef.current=s; if(videoRef.current){videoRef.current.srcObject=s;await videoRef.current.play();} setCapturing(true); }
    catch { showToast('Camera access denied','error'); }
  };
  const stopCam = () => { streamRef.current?.getTracks().forEach(t=>t.stop()); setCapturing(false); };
  const snap = () => {
    const v=videoRef.current; if(!v)return;
    const c=document.createElement('canvas'); c.width=320; c.height=240; c.getContext('2d').drawImage(v,0,0,320,240);
    if(images.length>=5){showToast('Max 5 photos','warning');return;}
    setImages(i=>[...i,c.toDataURL('image/jpeg',.8)]); showToast(`Photo ${images.length+1}/5 captured`,'success');
  };
  const register = async () => {
    if(!sel){showToast('Select a user','warning');return;} if(images.length<1){showToast('Capture at least 1 photo','warning');return;}
    const u=users.find(x=>x._id===sel); setLoading(true);
    try { const{data}=await api.post('/ai/face/register',{userId:sel,name:u?.name||'Unknown',images}); if(data.success){showToast(data.message,'success');setImages([]);setSel('');stopCam();api.get('/ai/face/list').then(r=>setRegFaces(r.data.users||[])).catch(()=>{});}else showToast(data.message||'Failed','error'); }
    catch(e){showToast(e.response?.data?.message||'AI service offline','error');} finally{setLoading(false);}
  };
  const deleteFace = async(uid) => { await api.delete(`/ai/face/${uid}`).catch(()=>{}); showToast('Face data deleted','info'); setRegFaces(f=>f.filter(x=>x.userId!==uid)); };

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>
      <div style={{background:CARD,border:`1.5px solid ${BDR}`,borderRadius:16,padding:24}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:15,color:TX}}>Register New Face</div>
          <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,background:aiStatus==='online'?'rgba(16,185,129,.15)':'rgba(239,68,68,.15)',color:aiStatus==='online'?'#10B981':'#EF4444'}}>{aiStatus==='online'?'🟢 Online':'🔴 Offline'}</span>
        </div>
        {aiStatus==='offline'&&<div style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.3)',borderRadius:10,padding:'12px 14px',marginBottom:16,fontSize:12,color:'#f87171'}}>⚠️ AI service offline. Run: <code style={{fontFamily:'monospace',background:'rgba(0,0,0,.2)',padding:'2px 6px',borderRadius:4}}>cd ai-service && python app.py</code></div>}
        <div style={{marginBottom:14}}>
          <label style={LBL}>Select Villager *</label>
          <select value={sel} onChange={e=>setSel(e.target.value)} className="ad-inp"><option value="">— Select user —</option>{users.map(u=><option key={u._id} value={u._id}>{u.name} ({u.mobile})</option>)}</select>
        </div>
        <div style={{background:BG2,borderRadius:12,overflow:'hidden',marginBottom:12,position:'relative',minHeight:120}}>
          <video ref={videoRef} style={{width:'100%',display:'block',borderRadius:12,background:'#000'}} playsInline muted/>
          {!capturing&&<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:MUT,gap:8}}><div style={{fontSize:32}}>📷</div><div style={{fontSize:12,fontWeight:600}}>Camera preview</div></div>}
        </div>
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          {!capturing ? <button onClick={startCam} className="ad-btn ad-btn-g" style={{flex:1,justifyContent:'center'}}>📷 Start Camera</button>
            : <><button onClick={snap} className="ad-btn ad-btn-t" style={{flex:2,justifyContent:'center'}}>📸 Capture ({images.length}/5)</button><button onClick={stopCam} className="ad-btn ad-btn-ghost" style={{flex:1,justifyContent:'center'}}>■ Stop</button></>}
        </div>
        {images.length>0&&<div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
          {images.map((img,i)=>(
            <div key={i} style={{position:'relative'}}>
              <img src={img} style={{width:52,height:52,objectFit:'cover',borderRadius:8,border:`2px solid ${P}`}}/>
              <button onClick={()=>setImages(imgs=>imgs.filter((_,j)=>j!==i))} style={{position:'absolute',top:-5,right:-5,width:18,height:18,borderRadius:'50%',background:DNG,border:'none',color:'#fff',fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
            </div>
          ))}
        </div>}
        <button onClick={register} disabled={loading||!sel||images.length<1} className="ad-btn ad-btn-g" style={{width:'100%',justifyContent:'center',padding:'11px',opacity:loading||!sel||images.length<1?.45:1,cursor:loading||!sel||images.length<1?'not-allowed':'pointer'}}>{loading?'Registering…':'✅ Register Face'}</button>
      </div>
      <div style={{background:CARD,border:`1.5px solid ${BDR}`,borderRadius:16,padding:24}}>
        <div style={{fontWeight:700,fontSize:15,color:TX,marginBottom:4}}>Registered Faces</div>
        <div style={{fontSize:12,color:MUT,marginBottom:16}}>{regFaces.length} villager{regFaces.length!==1?'s':''} registered</div>
        {regFaces.length===0
          ? <div style={{textAlign:'center',padding:36,color:MUT}}><div style={{fontSize:36,marginBottom:8}}>🧑‍💻</div><div style={{fontSize:13}}>No faces registered yet</div></div>
          : <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {regFaces.map(f=>(
                <div key={f.userId} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',background:BG2,borderRadius:10}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:`linear-gradient(135deg,${P},${PD})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:14,flexShrink:0}}>🧑</div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:TX}}>{f.name}</div><div style={{fontSize:11,color:MUT}}>{f.embeddings} photo{f.embeddings!==1?'s':''} · {new Date(f.registered_at*1000).toLocaleDateString('en-IN')}</div></div>
                  <button onClick={()=>deleteFace(f.userId)} style={{padding:'4px 10px',background:'rgba(239,68,68,.12)',border:'1px solid rgba(239,68,68,.3)',borderRadius:7,color:'#f87171',fontSize:11,fontWeight:600,cursor:'pointer'}}>🗑</button>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}


