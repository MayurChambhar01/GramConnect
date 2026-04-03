import { useState, useCallback, useRef, useEffect } from 'react';

const TYPES = {
  success: { icon:'✓', bg:'rgba(16,185,129,0.15)', border:'rgba(16,185,129,0.4)', accent:'#10B981', label:'Success' },
  error:   { icon:'✕', bg:'rgba(239,68,68,0.15)',  border:'rgba(239,68,68,0.4)',  accent:'#EF4444', label:'Error' },
  warning: { icon:'!', bg:'rgba(245,158,11,0.15)', border:'rgba(245,158,11,0.4)', accent:'#F59E0B', label:'Warning' },
  info:    { icon:'i', bg:'rgba(6,182,212,0.15)',  border:'rgba(6,182,212,0.4)',  accent:'#06B6D4', label:'Info' },
  loading: { icon:'⟳', bg:'rgba(139,92,246,0.15)', border:'rgba(139,92,246,0.4)', accent:'#8B5CF6', label:'Processing' },
};
const DURATION = 4200;
let _add = null;

function detect(msg) {
  const m = String(msg);
  if (/✅|success|Success|registered|Verified|verified|\bsent\b|Done|added|updated|created|approved|Approved|paid|Paid|reset|Reset/i.test(m)) return 'success';
  if (/⚠|Please|invalid|Invalid|required|Required|Fill|enter|Enter/i.test(m)) return 'warning';
  if (/🚨|Error|error|Failed|failed|denied|Denied|reject|Reject|offline|Offline/i.test(m)) return 'error';
  if (/Loading|loading|…|ing…/.test(m)) return 'loading';
  return 'info';
}

export const showToast = (msg, type) => { if (_add) _add(String(msg), type || detect(msg)); };

export default function Toast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  _add = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p.slice(-3), { id, msg, type, prog: 100, out: false }]);
    const t0 = Date.now();
    const tick = () => {
      const prog = Math.max(0, 100 - ((Date.now() - t0) / DURATION) * 100);
      setToasts(p => p.map(t => t.id === id ? { ...t, prog } : t));
      if (prog > 0) timers.current[id] = requestAnimationFrame(tick);
    };
    timers.current[id] = requestAnimationFrame(tick);
    setTimeout(() => dismiss(id), DURATION);
  }, []);

  const dismiss = (id) => {
    cancelAnimationFrame(timers.current[id]);
    setToasts(p => p.map(t => t.id === id ? { ...t, out: true } : t));
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 380);
  };

  useEffect(() => () => Object.values(timers.current).forEach(cancelAnimationFrame), []);

  return (
    <>
      <style>{`
        @keyframes _tin { from{opacity:0;transform:translateX(110%) scale(0.88)} to{opacity:1;transform:translateX(0) scale(1)} }
        @keyframes _tout{ from{opacity:1;transform:translateX(0) scale(1)} to{opacity:0;transform:translateX(110%) scale(0.88)} }
        @keyframes _spin{ to{transform:rotate(360deg)} }
        ._tw{ position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:min(380px,calc(100vw - 40px)); }
        ._tc{ pointer-events:all;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.7);animation:_tin .38s cubic-bezier(0.34,1.56,0.64,1) both;font-family:'Plus Jakarta Sans',sans-serif; }
        ._tc._to{ animation:_tout .36s ease forwards }
        ._ti{ display:flex;align-items:flex-start;gap:12px;padding:14px 16px 10px;border-left:3px solid var(--a); }
        ._tico{ width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;flex-shrink:0;margin-top:1px;background:var(--bg);color:var(--a); }
        ._tico._sp{ animation:_spin .8s linear infinite; }
        ._tb{ flex:1;min-width:0; }
        ._tl{ font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;opacity:.65;margin-bottom:1px;color:var(--a); }
        ._tm{ font-size:13px;font-weight:600;color:#f0f6ff;line-height:1.5;word-break:break-word; }
        ._tcl{ width:22px;height:22px;border-radius:6px;border:none;background:rgba(255,255,255,0.08);color:rgba(200,215,240,0.5);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .18s; }
        ._tcl:hover{ background:rgba(255,255,255,.18);color:#f0f6ff; }
        ._tp{ height:2.5px;transition:width .1s linear; }
        @media(max-width:520px){ ._tw{bottom:72px;right:10px;left:10px;max-width:100%;} }
      `}</style>
      <div className="_tw">
        {toasts.map(t => {
          const c = TYPES[t.type] || TYPES.info;
          return (
            <div key={t.id} className={`_tc${t.out ? ' _to' : ''}`}
              style={{ '--a': c.accent, '--bg': c.bg, background: 'rgba(7,14,26,0.97)', border: `1.5px solid ${c.border}` }}>
              <div className="_ti">
                <div className={`_tico${t.type === 'loading' ? ' _sp' : ''}`}>{c.icon}</div>
                <div className="_tb">
                  <div className="_tl">{c.label}</div>
                  <div className="_tm">{t.msg.replace(/^[\u2705\u26A0\uD83D\uDE28\uD83D\uDCF1\uD83D\uDCF2\uD83D\uDD10\uD83D\uDCAC\uD83D\uDD11\u2192\u2190\uD83C\uDF89]/u, '').trim()}</div>
                </div>
                <button className="_tcl" onClick={() => dismiss(t.id)}>×</button>
              </div>
              <div className="_tp" style={{ width: `${t.prog}%`, background: c.accent, opacity: .55 }} />
            </div>
          );
        })}
      </div>
    </>
  );
}
