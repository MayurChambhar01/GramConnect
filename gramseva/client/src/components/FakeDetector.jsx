import { useState, useCallback } from 'react';
import api from '../api/axios';

export default function FakeDetector({ onResult }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please upload an image file (JPG, PNG, etc.)'); return; }
    setError(''); setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const analyze = useCallback(async () => {
    if (!preview) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await api.post('/ai/complaint/check', { image: preview, save: false });
      setResult(data);
      if (onResult) onResult(data);
    } catch (e) {
      setError(e?.response?.data?.message || 'AI service not running. Start: python3 ai-service/app.py');
    } finally { setLoading(false); }
  }, [preview, onResult]);

  const reset = () => { setPreview(null); setResult(null); setError(''); setLoading(false); };

  const scoreColor = (s) => s < 30 ? '#16a34a' : s < 60 ? '#d97706' : '#dc2626';
  const verdictStyle = (v) => {
    if (v === 'AUTHENTIC') return { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', icon: '✅' };
    if (v === 'SUSPICIOUS') return { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: '⚠️' };
    if (v === 'FAKE')       return { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: '🚫' };
    return { bg: '#f8fafc', border: '#e2e8f0', color: '#334155', icon: '❓' };
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
      <style>{`@keyframes fd-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Drop zone */}
      {!result && (
        <div
          style={{
            border: `2px dashed ${dragOver ? '#1A3A2A' : '#d1d5db'}`,
            borderRadius: 12, padding: preview ? 0 : 32, textAlign: 'center',
            cursor: preview ? 'default' : 'pointer',
            background: dragOver ? '#f0fdf4' : '#f9fafb',
            overflow: 'hidden', marginBottom: 14,
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => !preview && document.getElementById('fd-input').click()}
        >
          <input id="fd-input" type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])} />
          {preview ? (
            <div style={{ position: 'relative' }}>
              <img src={preview} alt="Selected"
                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
              <button onClick={(e) => { e.stopPropagation(); reset(); }}
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.65)',
                  color: '#fff', border: 'none', borderRadius: 20, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>
                ✕ Change
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1A3A2A', marginBottom: 4 }}>Upload Complaint Photo</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Click or drag &amp; drop — AI checks for duplicates &amp; manipulation</div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '10px 14px', color: '#991b1b', fontSize: 13, marginBottom: 12 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Analyze button */}
      {preview && !result && (
        <button onClick={analyze} disabled={loading}
          style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', fontSize: 14,
            fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 12,
            background: loading ? '#94a3b8' : 'linear-gradient(135deg,#1A3A2A,#2D5A3D)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {loading ? (
            <>
              <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)',
                borderTopColor: '#fff', borderRadius: '50%', animation: 'fd-spin .8s linear infinite' }} />
              AI Analyzing...
            </>
          ) : '🤖 Analyze for Authenticity'}
        </button>
      )}

      {/* Result */}
      {result && (() => {
        const vs = verdictStyle(result.verdict);
        return (
          <div>
            {/* Verdict card */}
            <div style={{ background: vs.bg, border: `2px solid ${vs.border}`, borderRadius: 12,
              padding: '18px 20px', textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 44, marginBottom: 6 }}>{vs.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: vs.color }}>{result.verdict}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{result.message}</div>
            </div>

            {/* Score bar */}
            {typeof result.fake_score === 'number' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Fake Score</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor(result.fake_score) }}>
                    {result.fake_score}<span style={{ fontSize: 12 }}>/100</span>
                  </span>
                </div>
                <div style={{ height: 10, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${result.fake_score}%`, borderRadius: 999,
                    background: `linear-gradient(90deg,#16a34a,${scoreColor(result.fake_score)})`,
                    transition: 'width 1s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', marginTop: 3 }}>
                  <span>0 Safe</span><span>50 Suspicious</span><span>100 Fake</span>
                </div>
              </div>
            )}

            {/* Flags */}
            {Array.isArray(result.flags) && result.flags.length > 0 && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
                padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8 }}>🔍 Findings</div>
                {result.flags.map((f, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: '#334155', marginBottom: 5, lineHeight: 1.4 }}>{f}</div>
                ))}
              </div>
            )}

            {/* Detail grid */}
            {result.details && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { label: '🔄 Duplicates', val: `${result.details.duplicates?.length || 0} found`, bad: (result.details.duplicates?.length || 0) > 0 },
                  { label: '✂️ Manipulation', val: `Score: ${result.details.ela?.manipulation_score || 0}`, bad: result.details.ela?.is_manipulated },
                  { label: '📊 Clarity', val: `${result.details.blur?.clarity_score || 0}/100`, bad: result.details.blur?.is_too_blurry },
                  { label: '📋 Metadata', val: result.details.metadata?.suspicious ? 'Issues' : 'Clean', bad: result.details.metadata?.suspicious },
                ].map(({ label, val, bad }) => (
                  <div key={label} style={{ borderRadius: 8, padding: '10px 12px',
                    background: bad ? '#fef2f2' : '#f0fdf4', border: `1px solid ${bad ? '#fecaca' : '#bbf7d0'}` }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: bad ? '#dc2626' : '#16a34a' }}>{val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
                padding: '10px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>💡 Recommended Action</div>
                {result.recommendations.map((r, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#78350f', marginBottom: 3 }}>→ {r}</div>
                ))}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={reset}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid #e2e8f0',
                  background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                🔄 Check Another
              </button>
              {result.action === 'REJECT' && onResult && (
                <button onClick={() => onResult(result)}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                    background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  🚫 Auto Reject
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
