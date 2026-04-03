import { useState } from 'react';
import api from '../api/axios';
import { showToast } from './Toast';

const F='#1A3A2A', FM='#2D5A3D', G='#C9962A';
const BORDER='#E2D9C8', LIGHT='#F7F4EF';

const CAT_ICONS = { agriculture:'🌾', housing:'🏠', welfare:'🛡️', health:'🏥', education:'🎓', employment:'💼', infrastructure:'🏗️' };
const CAT_COLORS = { agriculture:['#ECFDF5','#065F46'], housing:['#EFF6FF','#1E40AF'], welfare:['#FFF7ED','#C2410C'], health:['#FDF2F8','#9D174D'], education:['#F5F3FF','#5B21B6'], employment:['#F0FDF4','#15803D'], infrastructure:['#F0F9FF','#0369A1'] };

export default function SchemeChecker() {
  const [form, setForm] = useState({
    age:'', gender:'Male', caste:'General', annualIncome:'', occupation:'farmer',
    landAcres:'', bpl:false, hasBankAccount:true, hasPuccaHouse:false,
    hasLpg:false, hasToilet:false, hasPropertyCard:false
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const check = async () => {
    if (!form.age || !form.annualIncome) { showToast('Please fill Age and Annual Income'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/schemes/check', form);
      setResult(data);
      setFilter('all');
    } catch(e) { showToast(e.response?.data?.message || 'Check failed'); }
    finally { setLoading(false); }
  };

  const F2 = { display:'block', fontSize:11.5, fontWeight:700, color:'#475569', marginBottom:6, textTransform:'uppercase', letterSpacing:.4 };
  const I = { width:'100%', border:`1.5px solid ${BORDER}`, borderRadius:8, padding:'9px 12px', fontSize:13, color:'#1A1A1A', background:'#fff', outline:'none', fontFamily:'inherit' };
  const Toggle = ({label, k}) => (
    <div onClick={()=>setForm(f=>({...f,[k]:!f[k]}))} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${BORDER}`,cursor:'pointer'}}>
      <span style={{fontSize:13,color:'#374151'}}>{label}</span>
      <div style={{width:38,height:22,borderRadius:999,background:form[k]?F:'#D1D5DB',transition:'background .2s',position:'relative',flexShrink:0}}>
        <div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:form[k]?18:2,transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)'}}/>
      </div>
    </div>
  );

  const displayed = result?.schemes.filter(s => filter==='all' || s.category===filter) || [];

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800,color:F}}>🧾 Scheme Eligibility Checker</div>
        <div style={{fontSize:12,color:'#9CA3AF',marginTop:3}}>Find all government schemes you qualify for — instantly</div>
      </div>

      {!result ? (
        <div style={{background:'#fff',border:`1.5px solid ${BORDER}`,borderRadius:16,padding:24}}>
          <div style={{fontSize:13,fontWeight:700,color:FM,marginBottom:16,paddingBottom:10,borderBottom:`1.5px solid ${BORDER}`}}>📝 Fill Your Details</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
            <div><label style={F2}>Age *</label><input type="number" value={form.age} onChange={e=>setForm(f=>({...f,age:e.target.value}))} placeholder="e.g. 35" style={I}/></div>
            <div><label style={F2}>Gender</label>
              <select value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))} style={I}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div><label style={F2}>Caste Category</label>
              <select value={form.caste} onChange={e=>setForm(f=>({...f,caste:e.target.value}))} style={I}>
                <option>General</option><option>OBC</option><option>SC</option><option>ST</option>
              </select>
            </div>
            <div><label style={F2}>Occupation</label>
              <select value={form.occupation} onChange={e=>setForm(f=>({...f,occupation:e.target.value}))} style={I}>
                <option value="farmer">Farmer</option><option value="labour">Daily Labour</option>
                <option value="business">Small Business</option><option value="service">Service/Job</option><option value="other">Other</option>
              </select>
            </div>
            <div><label style={F2}>Annual Family Income (₹) *</label><input type="number" value={form.annualIncome} onChange={e=>setForm(f=>({...f,annualIncome:e.target.value}))} placeholder="e.g. 120000" style={I}/></div>
            <div><label style={F2}>Land Holdings (Acres)</label><input type="number" step="0.1" value={form.landAcres} onChange={e=>setForm(f=>({...f,landAcres:e.target.value}))} placeholder="0 if no land" style={I}/></div>
          </div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,fontWeight:700,color:FM,marginBottom:8,textTransform:'uppercase',letterSpacing:.4}}>Your Situation</div>
            <Toggle label="BPL Card holder" k="bpl"/>
            <Toggle label="Have bank account" k="hasBankAccount"/>
            <Toggle label="Have pucca (concrete) house" k="hasPuccaHouse"/>
            <Toggle label="Have LPG connection" k="hasLpg"/>
            <Toggle label="Have toilet at home" k="hasToilet"/>
            <Toggle label="Have property / land document" k="hasPropertyCard"/>
          </div>
          <button onClick={check} disabled={loading}
            style={{width:'100%',padding:'14px',background:loading?'#9CA3AF':`linear-gradient(135deg,${F},${FM})`,border:'none',borderRadius:10,fontSize:15,fontWeight:700,color:'#fff',cursor:loading?'not-allowed':'pointer',letterSpacing:.3}}>
            {loading ? '🔍 Checking 30+ Schemes…' : '🔍 Check My Eligibility →'}
          </button>
        </div>
      ) : (
        <div>
          {/* Result summary */}
          <div style={{background:`linear-gradient(135deg,${F},${FM})`,borderRadius:16,padding:'20px 24px',marginBottom:20,color:'#fff'}}>
            <div style={{fontSize:32,fontWeight:900,marginBottom:4}}>{result.total} Schemes</div>
            <div style={{fontSize:14,opacity:.85}}>You qualify for {result.total} out of 30 government schemes</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:12}}>
              {result.categories.map(cat=>(
                <span key={cat} style={{background:'rgba(255,255,255,.15)',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:600,textTransform:'capitalize'}}>
                  {CAT_ICONS[cat]||'📋'} {cat}
                </span>
              ))}
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
            {['all',...result.categories].map(cat=>(
              <button key={cat} onClick={()=>setFilter(cat)}
                style={{padding:'5px 14px',borderRadius:20,border:`1.5px solid ${filter===cat?F:BORDER}`,background:filter===cat?F:'#fff',color:filter===cat?'#fff':'#374151',fontSize:12,fontWeight:600,cursor:'pointer',textTransform:'capitalize',transition:'all .15s'}}>
                {cat==='all'?'All':((CAT_ICONS[cat]||'')+ ' ' +cat)}
              </button>
            ))}
          </div>

          {/* Scheme cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14,marginBottom:20}}>
            {displayed.map(s=>{
              const [bg,color] = CAT_COLORS[s.category]||['#F3F4F6','#374151'];
              return (
                <div key={s.id} style={{background:'#fff',border:`1.5px solid ${BORDER}`,borderRadius:14,overflow:'hidden',transition:'box-shadow .2s'}}>
                  <div style={{background:bg,padding:'14px 16px',borderBottom:`1px solid ${BORDER}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:24}}>{s.emoji}</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:800,color:F,lineHeight:1.3}}>{s.name}</div>
                        <div style={{fontSize:10,color,fontWeight:600,textTransform:'capitalize',marginTop:2}}>{s.category} • {s.dept}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{padding:'12px 16px'}}>
                    <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:8,padding:'7px 10px',marginBottom:10}}>
                      <div style={{fontSize:10,color:'#065F46',fontWeight:700,marginBottom:1}}>BENEFIT</div>
                      <div style={{fontSize:12.5,color:'#065F46',fontWeight:600}}>{s.benefit}</div>
                    </div>
                    <div style={{fontSize:11,color:'#6B7280',marginBottom:10}}>
                      {s.criteria.map((c,i)=><div key={i} style={{marginBottom:2}}>✓ {c}</div>)}
                    </div>
                    <a href={`https://www.india.gov.in/search/site/${encodeURIComponent(s.name)}`} target="_blank" rel="noreferrer"
                      style={{display:'block',textAlign:'center',padding:'8px',background:`linear-gradient(135deg,${F},${FM})`,color:'#fff',borderRadius:8,fontSize:12,fontWeight:700,textDecoration:'none'}}>
                      Apply Now →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={()=>setResult(null)} style={{width:'100%',padding:'11px',background:LIGHT,border:`1.5px solid ${BORDER}`,borderRadius:10,fontSize:13,fontWeight:600,color:'#374151',cursor:'pointer'}}>
            🔄 Check Again with Different Details
          </button>
        </div>
      )}
    </div>
  );
}
