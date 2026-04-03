import { useState, useRef, useCallback, useEffect } from 'react';
import { useLang } from '../context/LanguageContext';
import api from '../api/axios';

/* ─── GPS Map embed using Google Maps static/embed ─── */
function MapPreview({ lat, lng }) {
  if (!lat || !lng) return null;
  const mapUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid var(--border)', marginTop: 12 }}>
      <iframe
        title="GPS Location"
        src={mapUrl}
        width="100%"
        height="200"
        style={{ border: 'none', display: 'block' }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

export default function LivePhotoCapture({ onClose, onSuccess, purpose = 'record' }) {
  const { t } = useLang();
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);

  const [phase, setPhase]         = useState('idle');   // idle | camera | preview | done
  const [facingMode, setFacing]   = useState('environment'); // front/back toggle
  const [coords, setCoords]       = useState(null);
  const [locError, setLocError]   = useState('');
  const [locLoading, setLocLoad]  = useState(false);
  const [capturedImg, setCaptured] = useState(null);
  const [timestamp, setTimestamp] = useState('');
  const [saving, setSaving]       = useState(false);
  const [flash, setFlash]         = useState(false);

  /* ── Get GPS ── */
  const getLocation = useCallback(() => {
    setLocLoad(true);
    setLocError('');
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported by this browser.');
      setLocLoad(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6), acc: Math.round(pos.coords.accuracy) });
        setLocLoad(false);
      },
      (err) => {
        setLocError(t('locationDenied') + ' — ' + err.message);
        setLocLoad(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [t]);

  /* ── Open camera ── */
  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase('camera');
      getLocation();
    } catch (e) {
      alert('Camera access denied. Please allow camera permission and try again.');
    }
  }, [facingMode, getLocation]);

  /* ── Stop camera ── */
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  /* ── Switch front/back ── */
  const switchCamera = useCallback(async () => {
    stopCamera();
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacing(newMode);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {}
  }, [facingMode, stopCamera]);

  /* ── Capture photo ── */
  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    /* Overlay: timestamp + coords watermark */
    const now = new Date();
    const stamp = now.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' });
    setTimestamp(stamp);

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`📍 ${coords ? `${coords.lat}, ${coords.lng}` : 'GPS not available'}`, 12, canvas.height - 28);
    ctx.fillText(`🕐 ${stamp}`, 12, canvas.height - 10);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCaptured(dataUrl);
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
    stopCamera();
    setPhase('preview');
  }, [coords, stopCamera]);

  /* ── Save photo ── */
  const savePhoto = async () => {
    if (!capturedImg) return;
    setSaving(true);
    try {
      // Convert base64 to blob
      const res = await fetch(capturedImg);
      const blob = await res.blob();
      const fd = new FormData();
      fd.append('photo', blob, `live_capture_${Date.now()}.jpg`);
      fd.append('purpose', purpose);
      if (coords) {
        fd.append('lat', coords.lat);
        fd.append('lng', coords.lng);
        fd.append('accuracy', coords.acc);
      }
      fd.append('timestamp', timestamp);
      try {
        await api.post('/documents/upload-photo', fd);
      } catch {
        // Even if server save fails, we can still return the photo locally
      }
      setPhase('done');
      onSuccess?.({ image: capturedImg, coords, timestamp });
    } catch (e) {
      alert('Failed to save photo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Cleanup on unmount ── */
  useEffect(() => () => stopCamera(), [stopCamera]);

  /* ─── STYLES ─── */
  const S = {
    overlay: { position:'fixed',inset:0,background:'rgba(15,23,42,.5)',backdropFilter:'blur(8px)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16 },
    box: { background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r-xl)',width:'100%',maxWidth:520,maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'var(--shadow-lg)',animation:'popIn .28s cubic-bezier(.3,1.4,.5,1) both' },
    header: { display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px 14px',borderBottom:'1px solid var(--border)',flexShrink:0 },
    body: { padding:'18px 22px',overflowY:'auto',flex:1 },
    footer: { padding:'14px 22px',borderTop:'1px solid var(--border)',flexShrink:0 },
    videoWrap: { position:'relative',width:'100%',aspectRatio:'4/3',background:'#000',borderRadius:'var(--r-lg)',overflow:'hidden' },
    flash: { position:'absolute',inset:0,background:'#fff',opacity:flash?0.8:0,transition:'opacity .15s',pointerEvents:'none',zIndex:5 },
    controls: { position:'absolute',bottom:12,left:0,right:0,display:'flex',justifyContent:'center',gap:12,zIndex:4 },
    captureBtn: { width:64,height:64,borderRadius:'50%',background:'#fff',border:'4px solid rgba(255,255,255,.3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,boxShadow:'0 4px 16px rgba(0,0,0,.4)',transition:'transform .15s' },
    switchBtn: { width:44,height:44,borderRadius:'50%',background:'rgba(0,0,0,.5)',border:'2px solid rgba(255,255,255,.3)',cursor:'pointer',color:'#fff',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center' },
  };

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div style={S.box}>

        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={{ fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:700,color:'var(--text)' }}>
              📸 {t('captureLive')}
            </div>
            <div style={{ fontSize:12,color:'var(--textMut)',marginTop:2 }}>{t('livePhotoDesc')}</div>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,border:'1px solid var(--border)',borderRadius:'var(--r-sm)',background:'var(--surface2)',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--textMut)' }}>✕</button>
        </div>

        {/* Body */}
        <div style={S.body}>

          {/* ── IDLE STATE ── */}
          {phase === 'idle' && (
            <div style={{ textAlign:'center',padding:'24px 0' }}>
              <div style={{ width:80,height:80,background:'var(--primaryG)',border:'2px solid var(--primaryD)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,margin:'0 auto 20px' }}>📸</div>
              <div style={{ fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:'var(--text)',marginBottom:8 }}>{t('livePhoto')}</div>
              <p style={{ fontSize:13,color:'var(--textMut)',lineHeight:1.65,marginBottom:24,maxWidth:340,margin:'0 auto 24px' }}>
                {t('livePhotoDesc')}
              </p>
              <div style={{ background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--r-lg)',padding:'14px 18px',display:'flex',alignItems:'center',gap:12,marginBottom:20,textAlign:'left' }}>
                <span style={{ fontSize:22 }}>📍</span>
                <div>
                  <div style={{ fontSize:13,fontWeight:600,color:'var(--text)' }}>GPS Location Tagging</div>
                  <div style={{ fontSize:12,color:'var(--textMut)',marginTop:2 }}>Your exact coordinates will be embedded in the photo</div>
                </div>
              </div>
              <div style={{ background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--r-lg)',padding:'14px 18px',display:'flex',alignItems:'center',gap:12,marginBottom:24,textAlign:'left' }}>
                <span style={{ fontSize:22 }}>🕐</span>
                <div>
                  <div style={{ fontSize:13,fontWeight:600,color:'var(--text)' }}>Timestamp Watermark</div>
                  <div style={{ fontSize:12,color:'var(--textMut)',marginTop:2 }}>Date and time automatically stamped on photo</div>
                </div>
              </div>
              <button className="gc-btn gc-btn-primary gc-btn-full" onClick={openCamera} style={{ fontSize:15,padding:'13px' }}>
                📷 {t('openCamera')}
              </button>
            </div>
          )}

          {/* ── CAMERA STATE ── */}
          {phase === 'camera' && (
            <>
              <div style={S.videoWrap}>
                <div style={S.flash} />
                <video ref={videoRef} style={{ width:'100%',height:'100%',objectFit:'cover' }} playsInline muted />
                <canvas ref={canvasRef} style={{ display:'none' }} />

                {/* GPS status overlay */}
                <div style={{ position:'absolute',top:10,left:10,right:10,display:'flex',justifyContent:'space-between',zIndex:4 }}>
                  <div style={{ background:'rgba(0,0,0,.55)',borderRadius:99,padding:'5px 10px',fontSize:11,fontWeight:600,color:'#fff',display:'flex',alignItems:'center',gap:5 }}>
                    {locLoading
                      ? <><span style={{animation:'spin .8s linear infinite',display:'inline-block'}}>⟳</span> {t('gettingLocation')}</>
                      : coords
                      ? <><span style={{color:'#4ade80'}}>●</span> GPS {coords.lat}, {coords.lng}</>
                      : <><span style={{color:'#f87171'}}>●</span> {t('locationDenied')}</>
                    }
                  </div>
                  <button onClick={switchCamera} style={S.switchBtn} title={t('switchCamera')}>🔄</button>
                </div>

                {/* Capture button */}
                <div style={S.controls}>
                  <button style={S.captureBtn} onClick={capture} title={t('capturePhoto')}>📸</button>
                </div>
              </div>

              {locError && <div className="gc-err" style={{ marginTop:12,fontSize:12 }}>⚠ {locError}</div>}

              <div style={{ marginTop:14,display:'flex',gap:10 }}>
                <button className="gc-btn gc-btn-ghost gc-btn-sm" onClick={() => { stopCamera(); setPhase('idle'); }}>← {t('back')}</button>
                <button className="gc-btn gc-btn-primary gc-btn-full" onClick={capture}>📸 {t('capturePhoto')}</button>
              </div>
            </>
          )}

          {/* ── PREVIEW STATE ── */}
          {phase === 'preview' && capturedImg && (
            <>
              <div style={{ borderRadius:'var(--r-lg)',overflow:'hidden',border:'1.5px solid var(--border)',marginBottom:16 }}>
                <img src={capturedImg} alt="Captured" style={{ width:'100%',display:'block' }} />
              </div>

              <div className="gc-succ" style={{ marginBottom:12 }}>
                ✅ {t('captured')} · {t('locationTagged')}
              </div>

              {/* Coordinates display */}
              {coords && (
                <div style={{ background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--r)',padding:'12px 14px',marginBottom:12 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
                    <span>📍</span>
                    <span style={{ fontSize:13,fontWeight:600,color:'var(--text)' }}>GPS Coordinates</span>
                    <span className="gc-badge gc-badge-green" style={{ marginLeft:'auto' }}>Verified</span>
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                    <div style={{ background:'var(--surface)',borderRadius:'var(--r-sm)',padding:'8px 10px' }}>
                      <div style={{ fontSize:10,color:'var(--textMut)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:3 }}>Latitude</div>
                      <div style={{ fontSize:14,fontWeight:700,color:'var(--primary)',fontFamily:"'Sora',sans-serif" }}>{coords.lat}</div>
                    </div>
                    <div style={{ background:'var(--surface)',borderRadius:'var(--r-sm)',padding:'8px 10px' }}>
                      <div style={{ fontSize:10,color:'var(--textMut)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:3 }}>Longitude</div>
                      <div style={{ fontSize:14,fontWeight:700,color:'var(--primary)',fontFamily:"'Sora',sans-serif" }}>{coords.lng}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:12,color:'var(--textMut)',marginTop:8 }}>
                    📏 Accuracy: ±{coords.acc}m · 🕐 {timestamp}
                  </div>

                  {/* Google Maps link */}
                  <a
                    href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display:'inline-flex',alignItems:'center',gap:6,marginTop:10,fontSize:12,fontWeight:600,color:'var(--teal)',textDecoration:'none' }}
                  >
                    🗺 View on Google Maps →
                  </a>

                  {/* Embedded Map */}
                  <MapPreview lat={coords.lat} lng={coords.lng} />
                </div>
              )}
            </>
          )}

          {/* ── DONE STATE ── */}
          {phase === 'done' && (
            <div style={{ textAlign:'center',padding:'28px 0' }}>
              <div style={{ width:72,height:72,background:'var(--primaryG)',border:'2px solid var(--primaryD)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,margin:'0 auto 18px',animation:'popIn .4s ease both' }}>✅</div>
              <div style={{ fontFamily:"'Sora',sans-serif",fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:8 }}>
                {t('captured')}
              </div>
              <p style={{ fontSize:13,color:'var(--textMut)',marginBottom:20 }}>{t('locationTagged')}</p>
              {capturedImg && (
                <img src={capturedImg} alt="Saved" style={{ width:160,borderRadius:'var(--r)',border:'1.5px solid var(--border)',marginBottom:20 }} />
              )}
              <button className="gc-btn gc-btn-primary" onClick={onClose}>
                {t('close')} ✓
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === 'preview' && (
          <div style={S.footer}>
            <div style={{ display:'flex',gap:10 }}>
              <button className="gc-btn gc-btn-ghost" style={{ flex:1 }} onClick={() => { setCaptured(null); openCamera(); }}>{t('retake')}</button>
              <button className="gc-btn gc-btn-primary" style={{ flex:2 }} onClick={savePhoto} disabled={saving}>
                {saving ? <><span style={{animation:'spin .8s linear infinite',display:'inline-block'}}>⟳</span> Saving…</> : `💾 ${t('savePhoto')}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
