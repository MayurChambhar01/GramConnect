import { useState, useEffect } from 'react';
import api from '../api/axios';
import { showToast } from './Toast';

const F='#1A3A2A', FM='#2D5A3D', G='#C9962A';
const BORDER='#E2D9C8', LIGHT='#F7F4EF';

const ASSET_ICONS = { well:'🪣', streetlight:'💡', road:'🛣️', toilet:'🚽', school:'🏫', hospital:'🏥', bridge:'🌉', pond:'🏞️', temple:'⛪', other:'📍' };
const STATUS_COLORS = {
  Good:          ['#F0FDF4','#15803D'],
  'Needs Repair':['#FFF7ED','#C2410C'],
  Critical:      ['#FEF2F2','#B91C1C'],
  'Under Repair':['#EFF6FF','#1D4ED8'],
  Inactive:      ['#F3F4F6','#6B7280'],
};

// Static demo assets pre-populated (since no seeder)
const DEMO_ASSETS = [
  { _id:'a1', name:'Main Bore Well #1', type:'well', location:'Near Panchayat Bhavan', ward:'Ward 1', status:'Good', lat:20.5937, lng:78.9629, reports:[], description:'Primary drinking water source for Ward 1', lastChecked:new Date().toISOString() },
  { _id:'a2', name:'Street Light Cluster B', type:'streetlight', location:'Market Road', ward:'Ward 2', status:'Needs Repair', lat:20.5940, lng:78.9635, reports:[{issue:'3 lights not working',reportedAt:new Date(Date.now()-86400000*2).toISOString()}], description:'12 LED street lights on market road', lastChecked:new Date().toISOString() },
  { _id:'a3', name:'Community Toilet Block', type:'toilet', location:'Bus Stand Area', ward:'Ward 1', status:'Good', lat:20.5930, lng:78.9625, reports:[], description:'8-seat community toilet with running water', lastChecked:new Date().toISOString() },
  { _id:'a4', name:'Village Primary School', type:'school', location:'Education Zone', ward:'Ward 3', status:'Under Repair', lat:20.5945, lng:78.9640, reports:[{issue:'Roof leaking in classroom 3',reportedAt:new Date(Date.now()-86400000*5).toISOString()}], description:'Government primary school, classes 1-8', lastChecked:new Date().toISOString() },
  { _id:'a5', name:'Rajpur–Khurd Road', type:'road', location:'Main Village Entry Road', ward:'All', status:'Critical', lat:20.5920, lng:78.9615, reports:[{issue:'Large pothole near temple',reportedAt:new Date(Date.now()-86400000).toISOString()},{issue:'Road flooded near bridge',reportedAt:new Date(Date.now()-86400000*3).toISOString()}], description:'2.4 km main access road', lastChecked:new Date().toISOString() },
  { _id:'a6', name:'Village Pond', type:'pond', location:'South Side', ward:'Ward 4', status:'Good', lat:20.5950, lng:78.9645, reports:[], description:'Traditional village pond — used for irrigation', lastChecked:new Date().toISOString() },
];

export default function AssetTracker() {
  const [assets, setAssets]         = useState(DEMO_ASSETS);
  const [selected, setSelected]     = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [reportForm, setReportForm] = useState({ issue:'', show:false });
  const [reporting, setReporting]   = useState(false);

  useEffect(() => {
    api.get('/assets').then(r => {
      if (r.data.assets?.length) setAssets(r.data.assets);
    }).catch(() => {}); // fallback to demo data
  }, []);

  const submitReport = async () => {
    if (!reportForm.issue.trim()) { showToast('Describe the issue'); return; }
    setReporting(true);
    try {
      await api.post(`/assets/${selected._id}/report`, { issue: reportForm.issue });
      showToast('✅ Issue reported to Panchayat!');
      setAssets(a => a.map(x => x._id===selected._id
        ? { ...x, status: x.status==='Good'?'Needs Repair':x.status, reports: [...x.reports, { issue:reportForm.issue, reportedAt:new Date().toISOString() }] }
        : x));
      setReportForm({ issue:'', show:false });
      setSelected(a => a ? { ...a, status:a.status==='Good'?'Needs Repair':a.status } : a);
    } catch(e) { showToast(e.response?.data?.message||'Failed'); }
    finally { setReporting(false); }
  };

  const types = ['all', ...new Set(assets.map(a=>a.type))];
  const statuses = ['all', ...Object.keys(STATUS_COLORS)];
  const filtered = assets.filter(a =>
    (filterType==='all' || a.type===filterType) &&
    (filterStatus==='all' || a.status===filterStatus)
  );

  const summary = Object.fromEntries(Object.keys(STATUS_COLORS).map(s => [s, assets.filter(a=>a.status===s).length]));

  return (
    <div>
      <style>{`
        .asset-card:hover{box-shadow:0 4px 20px rgba(26,58,42,.1)!important;transform:translateY(-2px);}
        .asset-card{transition:all .2s;}
        @keyframes pop{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div style={{marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800,color:F}}>📍 Village Asset Tracker</div>
        <div style={{fontSize:12,color:'#9CA3AF',marginTop:3}}>Track and report issues with village infrastructure</div>
      </div>

      {/* Summary bar */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:20}}>
        {Object.entries(STATUS_COLORS).map(([s,[bg,color]])=>(
          <div key={s} onClick={()=>setFilterStatus(filterStatus===s?'all':s)}
            style={{background:filterStatus===s?color:'#fff',border:`1.5px solid ${filterStatus===s?color:BORDER}`,borderRadius:10,padding:'10px 12px',textAlign:'center',cursor:'pointer',transition:'all .15s'}}>
            <div style={{fontSize:18,fontWeight:800,color:filterStatus===s?'#fff':color}}>{summary[s]||0}</div>
            <div style={{fontSize:10,fontWeight:700,color:filterStatus===s?'rgba(255,255,255,.8)':color,marginTop:1}}>{s}</div>
          </div>
        ))}
      </div>

      {/* Type filter */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {types.map(t=>(
          <button key={t} onClick={()=>setFilterType(t)}
            style={{padding:'4px 14px',borderRadius:20,border:`1.5px solid ${filterType===t?F:BORDER}`,background:filterType===t?F:'#fff',color:filterType===t?'#fff':'#374151',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all .15s',textTransform:'capitalize'}}>
            {t==='all'?'All':`${ASSET_ICONS[t]||'📍'} ${t}`}
          </button>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:selected?'1fr 380px':'1fr',gap:16,alignItems:'start'}}>
        {/* Asset grid */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
          {filtered.map(asset=>{
            const [bg,color] = STATUS_COLORS[asset.status]||['#F3F4F6','#6B7280'];
            const isSelected = selected?._id===asset._id;
            return (
              <div key={asset._id} className="asset-card" onClick={()=>setSelected(isSelected?null:asset)}
                style={{background:'#fff',border:`2px solid ${isSelected?F:BORDER}`,borderRadius:14,padding:'14px 16px',cursor:'pointer',boxShadow:isSelected?`0 0 0 3px rgba(26,58,42,.1)`:undefined,animation:'pop .25s ease'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:10}}>
                  <div style={{width:44,height:44,borderRadius:12,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{ASSET_ICONS[asset.type]||'📍'}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:F,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{asset.name}</div>
                    <div style={{fontSize:11,color:'#6B7280',marginTop:2}}>📍 {asset.location}</div>
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{background:bg,color,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:20}}>{asset.status}</span>
                  {asset.reports.length>0 && <span style={{fontSize:11,color:'#9CA3AF'}}>⚠️ {asset.reports.length} issue{asset.reports.length>1?'s':''}</span>}
                </div>
              </div>
            );
          })}
          {filtered.length===0 && (
            <div style={{gridColumn:'1/-1',textAlign:'center',padding:40,color:'#9CA3AF'}}>
              <div style={{fontSize:40,marginBottom:8}}>🔍</div>No assets match filter
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (() => {
          const [bg,color] = STATUS_COLORS[selected.status]||['#F3F4F6','#6B7280'];
          return (
            <div style={{background:'#fff',border:`1.5px solid ${BORDER}`,borderRadius:16,overflow:'hidden',position:'sticky',top:80,animation:'pop .2s ease'}}>
              <div style={{background:`linear-gradient(135deg,${F},${FM})`,padding:'18px 20px',color:'#fff'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontSize:28,marginBottom:6}}>{ASSET_ICONS[selected.type]||'📍'}</div>
                    <div style={{fontSize:15,fontWeight:800}}>{selected.name}</div>
                    <div style={{fontSize:11,opacity:.75,marginTop:3}}>{selected.type} • {selected.ward}</div>
                  </div>
                  <button onClick={()=>setSelected(null)} style={{background:'rgba(255,255,255,.15)',border:'none',color:'#fff',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:12}}>✕</button>
                </div>
              </div>
              <div style={{padding:'16px 18px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <span style={{fontSize:12,color:'#6B7280'}}>Current Status</span>
                  <span style={{background:bg,color,fontWeight:700,fontSize:12,padding:'3px 12px',borderRadius:20}}>{selected.status}</span>
                </div>
                {selected.description && <div style={{fontSize:12,color:'#6B7280',marginBottom:12,lineHeight:1.5}}>{selected.description}</div>}
                <div style={{fontSize:11,color:'#9CA3AF',marginBottom:14}}>📍 {selected.location} &nbsp;·&nbsp; Last checked: {new Date(selected.lastChecked).toLocaleDateString('en-IN')}</div>

                {selected.reports.length>0 && (
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:F,marginBottom:8}}>⚠️ Recent Issues ({selected.reports.length})</div>
                    {selected.reports.slice(-3).reverse().map((r,i)=>(
                      <div key={i} style={{background:LIGHT,borderRadius:8,padding:'8px 10px',marginBottom:6,fontSize:12}}>
                        <div style={{color:'#374151'}}>{r.issue}</div>
                        <div style={{fontSize:10,color:'#9CA3AF',marginTop:3}}>{new Date(r.reportedAt).toLocaleDateString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                )}

                {!reportForm.show ? (
                  <button onClick={()=>setReportForm(f=>({...f,show:true}))}
                    style={{width:'100%',padding:'11px',background:`linear-gradient(135deg,${F},${FM})`,border:'none',borderRadius:10,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                    🚨 Report an Issue
                  </button>
                ) : (
                  <div style={{animation:'pop .2s ease'}}>
                    <div style={{fontSize:12,fontWeight:700,color:F,marginBottom:6}}>Describe the issue:</div>
                    <textarea value={reportForm.issue} onChange={e=>setReportForm(f=>({...f,issue:e.target.value}))}
                      placeholder="e.g. Streetlight not working since 2 days..." rows={3}
                      style={{width:'100%',border:`1.5px solid ${BORDER}`,borderRadius:8,padding:'9px',fontSize:13,fontFamily:'inherit',resize:'vertical',outline:'none',marginBottom:8}}/>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={submitReport} disabled={reporting}
                        style={{flex:1,padding:'10px',background:F,border:'none',borderRadius:8,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                        {reporting?'Sending…':'Submit Report'}
                      </button>
                      <button onClick={()=>setReportForm({issue:'',show:false})}
                        style={{padding:'10px 14px',background:LIGHT,border:`1.5px solid ${BORDER}`,borderRadius:8,fontSize:13,color:'#374151',cursor:'pointer',fontWeight:600}}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
