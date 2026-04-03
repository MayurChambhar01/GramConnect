import { useState, useEffect } from 'react';
import api from '../api/axios';
import { showToast } from './Toast';

const F='#1A3A2A', FM='#2D5A3D', G='#C9962A', GL='#E8B84B';
const BORDER='#E2D9C8', LIGHT='#F7F4EF';

export default function GramVote() {
  const [polls, setPolls]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting]   = useState({});
  const [expand, setExpand]   = useState({});

  const load = async () => {
    try {
      const { data } = await api.get('/voting');
      setPolls(data.polls || []);
    } catch { showToast('Could not load polls'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const vote = async (pollId, option) => {
    setVoting(v => ({ ...v, [pollId]: true }));
    try {
      const { data } = await api.post(`/voting/${pollId}/vote`, { option });
      showToast('✅ Vote recorded!');
      setPolls(p => p.map(poll => poll._id === pollId
        ? { ...poll, userVoted: true, userOption: option, results: data.results, totalVotes: data.totalVotes }
        : poll));
    } catch(e) { showToast(e.response?.data?.message || 'Vote failed'); }
    finally { setVoting(v => ({ ...v, [pollId]: false })); }
  };

  const daysLeft = (end) => {
    const d = Math.ceil((new Date(end) - Date.now()) / 86400000);
    return d > 0 ? `${d}d left` : 'Ended';
  };

  const catColors = { budget:'#FEF3C7', infrastructure:'#DBEAFE', welfare:'#FCE7F3', event:'#D1FAE5', other:'#F3F4F6' };
  const catText   = { budget:'#92400E', infrastructure:'#1E40AF', welfare:'#9D174D', event:'#065F46', other:'#374151' };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:48,color:FM}}>
      <div style={{width:28,height:28,border:`3px solid ${F}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',marginRight:12}}/>
      Loading polls…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!polls.length) return (
    <div style={{textAlign:'center',padding:52,color:'#9CA3AF'}}>
      <div style={{fontSize:52,marginBottom:12}}>🗳️</div>
      <div style={{fontSize:16,fontWeight:700,color:F,marginBottom:6}}>No Active Polls</div>
      <div style={{fontSize:13}}>The Panchayat will publish voting polls here for Gram Sabha decisions.</div>
    </div>
  );

  return (
    <div>
      <style>{`
        @keyframes fill{from{width:0}to{width:var(--w)}}
        @keyframes pop{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}
        .vote-opt:hover{border-color:${F}!important;background:rgba(26,58,42,.04)!important;}
        .vote-opt.voted{border-color:${G}!important;background:rgba(201,150,42,.08)!important;}
      `}</style>

      <div style={{marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800,color:F}}>🗳️ Gram Sabha Voting</div>
        <div style={{fontSize:12,color:'#9CA3AF',marginTop:3}}>{polls.length} active poll{polls.length>1?'s':''} — your vote shapes the village</div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        {polls.map(poll => {
          const open = expand[poll._id];
          const ended = new Date(poll.endDate) < Date.now();
          const showResults = poll.userVoted || ended;
          const winner = showResults && poll.results ? poll.results.reduce((a,b)=>a.count>b.count?a:b, poll.results[0]) : null;

          return (
            <div key={poll._id} style={{background:'#fff',border:`1.5px solid ${BORDER}`,borderRadius:16,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,.04)',animation:'pop .3s ease'}}>
              {/* Header */}
              <div style={{padding:'18px 20px',borderBottom:`1.5px solid ${BORDER}`,cursor:'pointer'}} onClick={()=>setExpand(e=>({...e,[poll._id]:!open}))}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                      <span style={{background:catColors[poll.category]||'#F3F4F6',color:catText[poll.category]||'#374151',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:12,textTransform:'capitalize'}}>{poll.category}</span>
                      <span style={{fontSize:11,color:ended?'#EF4444':'#10B981',fontWeight:600,background:ended?'#FEF2F2':'#F0FDF4',padding:'2px 8px',borderRadius:12}}>{ended?'Ended':daysLeft(poll.endDate)}</span>
                      {poll.userVoted && <span style={{fontSize:11,color:G,fontWeight:700,background:'#FEF3C7',padding:'2px 8px',borderRadius:12}}>✓ Voted</span>}
                    </div>
                    <div style={{fontSize:15,fontWeight:800,color:F}}>{poll.title}</div>
                    {poll.description && <div style={{fontSize:12,color:'#6B7280',marginTop:4,lineHeight:1.5}}>{poll.description}</div>}
                  </div>
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:22,fontWeight:800,color:F}}>{poll.totalVotes}</div>
                    <div style={{fontSize:10,color:'#9CA3AF'}}>votes</div>
                  </div>
                </div>
              </div>

              {/* Options / Results */}
              {open && (
                <div style={{padding:'20px',animation:'pop .2s ease'}}>
                  {showResults ? (
                    <>
                      {winner && <div style={{background:'#F0FDF4',border:'1.5px solid #BBF7D0',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#065F46',fontWeight:600}}>🏆 Leading: {winner.label} ({winner.pct}%)</div>}
                      <div style={{display:'flex',flexDirection:'column',gap:10}}>
                        {(poll.results||[]).map((r,i)=>(
                          <div key={i} style={{padding:'12px 14px',border:`1.5px solid ${poll.userOption===i?G:BORDER}`,borderRadius:10,background:poll.userOption===i?'#FFFBEB':'#FAFAF8'}}>
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                              <span style={{fontWeight:700,fontSize:13,color:F}}>{r.label}</span>
                              <span style={{fontWeight:800,color:G,fontSize:13}}>{r.pct}% <span style={{color:'#9CA3AF',fontWeight:400,fontSize:11}}>({r.count})</span></span>
                            </div>
                            <div style={{height:8,background:'#E5E7EB',borderRadius:999,overflow:'hidden'}}>
                              <div style={{height:'100%',width:`${r.pct}%`,background:`linear-gradient(to right,${F},${FM})`,borderRadius:999,transition:'width 1s ease'}}/>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{fontSize:11,color:'#9CA3AF',textAlign:'center',marginTop:12}}>Total votes: {poll.totalVotes}</div>
                    </>
                  ) : (
                    <>
                      <div style={{fontSize:12,color:'#6B7280',marginBottom:12}}>Select your choice — your vote is anonymous</div>
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        {poll.options.map((opt,i)=>(
                          <button key={i} className="vote-opt" onClick={()=>vote(poll._id,i)} disabled={voting[poll._id]}
                            style={{padding:'13px 16px',border:`1.5px solid ${BORDER}`,borderRadius:10,background:'#FAFAF8',textAlign:'left',cursor:'pointer',fontFamily:'inherit',transition:'all .15s',opacity:voting[poll._id]?.5:1}}>
                            <div style={{fontWeight:700,fontSize:13,color:F,marginBottom:opt.description?2:0}}>{String.fromCharCode(65+i)}. {opt.label}</div>
                            {opt.description && <div style={{fontSize:11.5,color:'#6B7280'}}>{opt.description}</div>}
                          </button>
                        ))}
                      </div>
                      {voting[poll._id] && <div style={{textAlign:'center',marginTop:12,fontSize:12,color:FM}}>Recording your vote…</div>}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
