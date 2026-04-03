import { useState, useRef, useCallback, useEffect } from 'react';
import api from '../api/axios';

const C = {
  forest: '#1A3A2A', forestMid: '#2D5A3D', gold: '#C9962A',
  cream: '#F4EFE4', border: '#E8E0CE', danger: '#C0392B',
  success: '#27AE60', warning: '#E67E22',
};

/* ─── Canvas overlay: draw detection box on video ─── */
function drawFaceBox(canvas, rect, color = '#27AE60') {
  if (!canvas || !rect) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const { x, y, w, h } = rect;
  const scaleX = canvas.width / 640;
  const scaleY = canvas.height / 480;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  // Corner brackets style
  const cx = x * scaleX, cy = y * scaleY, cw = w * scaleX, ch = h * scaleY;
  const s = 20;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s); ctx.lineTo(cx, cy); ctx.lineTo(cx + s, cy);
  ctx.moveTo(cx + cw - s, cy); ctx.lineTo(cx + cw, cy); ctx.lineTo(cx + cw, cy + s);
  ctx.moveTo(cx, cy + ch - s); ctx.lineTo(cx, cy + ch); ctx.lineTo(cx + s, cy + ch);
  ctx.moveTo(cx + cw - s, cy + ch); ctx.lineTo(cx + cw, cy + ch); ctx.lineTo(cx + cw, cy + ch - s);
  ctx.stroke();
}

export default function FaceAttendance({ sabhaId, onSuccess, onClose }) {
  const [phase, setPhase] = useState('intro'); // intro | camera | scanning | result
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [stream, setStream] = useState(null);
  const [aiOnline, setAiOnline] = useState(null);

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);

  /* ── Check AI service status ── */
  useEffect(() => {
    api.get('/ai/health').then(() => setAiOnline(true)).catch(() => setAiOnline(false));
  }, []);

  /* ── Start webcam ── */
  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setPhase('camera');
      // Start countdown
      let c = 3;
      setCountdown(c);
      const t = setInterval(() => {
        c--;
        setCountdown(c);
        if (c === 0) { clearInterval(t); captureAndVerify(); }
      }, 1000);
    } catch (e) {
      setError('Camera access denied. Please allow camera permission.');
    }
  }, []);

  /* ── Stop camera ── */
  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  }, [stream]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  /* ── Capture frame and send to AI ── */
  const captureAndVerify = useCallback(async () => {
    setPhase('scanning');
    try {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) throw new Error('Camera not ready');

      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      const b64 = canvas.toDataURL('image/jpeg', 0.85);
      stopCamera();

      const { data } = await api.post('/ai/face/verify', {
        image: b64,
        requireLiveness: true,
      });
      setResult(data);
      setPhase('result');

      // Draw face box on overlay
      if (data.face_rect && overlayRef.current) {
        const color = data.matched ? '#27AE60' : '#C0392B';
        drawFaceBox(overlayRef.current, data.face_rect, color);
      }

      if (data.matched) {
        setTimeout(() => onSuccess?.({ ...data, sabhaId, image: b64 }), 2000);
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Verification failed');
      setPhase('result');
      stopCamera();
    }
  }, [stopCamera, onSuccess, sabhaId]);

  /* ─── RENDER ─── */
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: 28,
      width: '100%', maxWidth: 520,
      boxShadow: '0 24px 64px rgba(0,0,0,.25)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{`
        @keyframes faceScan { 0%,100%{top:0} 50%{top:calc(100% - 4px)} }
        @keyframes facePulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        @keyframes faceIn { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
        .face-btn:hover { filter:brightness(.88); transform:scale(1.02); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.forest }}>
            🤖 AI Face Attendance
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            Gram Sabha — Secure Biometric Verification
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
            background: aiOnline ? '#f0fdf4' : '#fef2f2',
            color: aiOnline === null ? '#888' : aiOnline ? C.success : C.danger,
            border: `1px solid ${aiOnline ? '#bbf7d0' : '#fecaca'}`,
          }}>
            {aiOnline === null ? '⏳ Checking...' : aiOnline ? '🟢 AI Online' : '🔴 AI Offline'}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999', lineHeight: 1
          }}>×</button>
        </div>
      </div>

      {/* INTRO phase */}
      {phase === 'intro' && (
        <div style={{ animation: 'faceIn .3s ease', textAlign: 'center' }}>
          <div style={{
            width: 110, height: 110, borderRadius: '50%', margin: '0 auto 20px',
            background: `linear-gradient(135deg, ${C.forest}, #3E7A55)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52,
            boxShadow: '0 8px 32px rgba(26,58,42,.3)',
          }}>👤</div>

          <div style={{ fontSize: 15, fontWeight: 600, color: C.forest, marginBottom: 8 }}>
            Face Recognition Attendance
          </div>
          <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 20, maxWidth: 360, margin: '0 auto 20px' }}>
            The AI will scan your face and automatically mark your attendance.
            No fake attendance possible — biometric verification only.
          </div>

          <div style={{
            background: '#f0fdf4', borderRadius: 10, padding: '12px 16px',
            border: '1px solid #bbf7d0', marginBottom: 20, textAlign: 'left',
          }}>
            {[
              '📸 Camera will activate for 3 seconds',
              '🤖 AI detects and identifies your face',
              '✅ Attendance marked automatically',
              '🔒 Liveness check prevents photo spoofing',
            ].map((t, i) => (
              <div key={i} style={{ fontSize: 12.5, color: '#166534', marginBottom: i < 3 ? 6 : 0 }}>{t}</div>
            ))}
          </div>

          {aiOnline === false && (
            <div style={{
              background: '#fef9f0', borderRadius: 8, padding: '10px 14px',
              border: '1px solid #fed7aa', marginBottom: 16, fontSize: 12, color: '#9a3412',
            }}>
              ⚠️ AI service offline. Start it: <code style={{ fontSize: 11 }}>python3 ai-service/app.py</code>
            </div>
          )}

          <button
            onClick={startCamera}
            disabled={aiOnline === false}
            className="face-btn"
            style={{
              background: aiOnline === false ? '#e5e7eb' : `linear-gradient(135deg, ${C.forest}, #3E7A55)`,
              color: '#fff', border: 'none', borderRadius: 12,
              padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: aiOnline === false ? 'not-allowed' : 'pointer',
              width: '100%', transition: 'all .2s', boxShadow: '0 4px 16px rgba(26,58,42,.3)',
            }}
          >
            📷 Start Face Scan
          </button>
        </div>
      )}

      {/* CAMERA phase */}
      {(phase === 'camera' || phase === 'scanning') && (
        <div style={{ animation: 'faceIn .3s ease', position: 'relative' }}>
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
            <video
              ref={videoRef}
              style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'cover' }}
              muted playsInline
            />
            {/* Overlay canvas for face box */}
            <canvas ref={overlayRef} style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none'
            }} />
            {/* Scan line */}
            {phase === 'camera' && (
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
                animation: 'faceScan 2s ease-in-out infinite',
                boxShadow: `0 0 12px ${C.gold}`,
              }} />
            )}
            {/* Corner brackets overlay */}
            <div style={{
              position: 'absolute', inset: '15%', border: `2px solid rgba(201,150,42,.6)`,
              borderRadius: 8, pointerEvents: 'none',
              boxShadow: 'inset 0 0 20px rgba(201,150,42,.1)',
            }} />
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            {phase === 'camera' ? (
              <>
                <div style={{ fontSize: 40, fontWeight: 800, color: C.gold, lineHeight: 1 }}>{countdown}</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                  Look directly at camera...
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{ animation: 'facePulse 1s ease-in-out infinite', fontSize: 24 }}>🤖</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.forest }}>
                  AI analyzing face...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULT phase */}
      {phase === 'result' && (
        <div style={{ animation: 'faceIn .4s ease', textAlign: 'center' }}>
          {error ? (
            <div>
              <div style={{ fontSize: 56, marginBottom: 12 }}>❌</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.danger, marginBottom: 8 }}>Verification Failed</div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>{error}</div>
              <button onClick={() => { setPhase('intro'); setError(''); setResult(null); }}
                style={{ background: C.forest, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                Try Again
              </button>
            </div>
          ) : result?.matched ? (
            <div>
              <div style={{ fontSize: 64, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.success, marginBottom: 4 }}>
                Attendance Marked!
              </div>
              <div style={{
                background: '#f0fdf4', borderRadius: 12, padding: '16px 20px', margin: '16px 0',
                border: '1.5px solid #bbf7d0', textAlign: 'left',
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.forest, marginBottom: 8 }}>
                  👤 {result.name}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['Confidence', `${result.confidence}%`],
                    ['Liveness', result.liveness?.is_live ? '✅ Real' : '❌ Fake'],
                    ['Clarity', `${result.liveness?.details?.sharpness?.toFixed(0)} pts`],
                    ['Status', '✅ Verified'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #d1fae5' }}>
                      <div style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>{k}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.forest }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>Redirecting automatically...</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 56, marginBottom: 12 }}>
                {result?.liveness && !result.liveness.is_live ? '🚫' : '❓'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.danger, marginBottom: 8 }}>
                {result?.liveness && !result.liveness.is_live ? 'Liveness Check Failed' : 'Face Not Recognized'}
              </div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>{result?.message}</div>
              {result?.liveness && (
                <div style={{
                  background: '#fef9f0', borderRadius: 10, padding: '12px 16px',
                  border: '1px solid #fed7aa', marginBottom: 16, textAlign: 'left', fontSize: 12,
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: '#9a3412' }}>📊 Liveness Details:</div>
                  <div>Sharpness: {result.liveness.details?.sharpness?.toFixed(1)}</div>
                  <div>Texture: {result.liveness.details?.texture_variance?.toFixed(1)}</div>
                  <div>Color: {result.liveness.details?.color_saturation?.toFixed(1)}</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setPhase('intro'); setResult(null); }}
                  style={{ flex: 1, background: C.forest, color: '#fff', border: 'none', borderRadius: 10, padding: '12px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  Try Again
                </button>
                <button onClick={onClose}
                  style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
