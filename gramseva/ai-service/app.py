"""
GramSeva AI Microservice - Windows Compatible
Endpoints:
  POST /face/register   - register villager face
  POST /face/verify     - identify face for attendance
  POST /complaint/check - detect fake complaint photos
  GET  /health          - service health check
"""

import os, hashlib, base64, pickle, time
from io import BytesIO
from pathlib import Path

# ── Flask (no flask_cors needed - Node.js proxies all requests) ──
from flask import Flask, request, jsonify

# ── CV / Image ──
import cv2
import numpy as np
from PIL import Image
from PIL.ExifTags import TAGS

# ── ML ──
from scipy.spatial.distance import cosine
from skimage.feature import local_binary_pattern

app = Flask(__name__)

# ── Manual CORS headers (no flask_cors dependency) ──
@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
    return response

@app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
@app.route("/<path:path>", methods=["OPTIONS"])
def options_handler(path):
    return jsonify({}), 200

# ─── Storage ───
DATA_DIR = Path(__file__).parent / "data"
FACE_DB  = DATA_DIR / "face_db.pkl"
HASH_DB  = DATA_DIR / "hash_db.pkl"
DATA_DIR.mkdir(exist_ok=True)

face_db = {}
hash_db = {}

def _load():
    global face_db, hash_db
    try:
        if FACE_DB.exists():
            face_db = pickle.loads(FACE_DB.read_bytes())
        if HASH_DB.exists():
            hash_db = pickle.loads(HASH_DB.read_bytes())
    except Exception as e:
        print(f"Warning: Could not load DB: {e}")

def _save_faces():
    FACE_DB.write_bytes(pickle.dumps(face_db))

def _save_hashes():
    HASH_DB.write_bytes(pickle.dumps(hash_db))

_load()

# ── Haar cascade ──
_CASCADE = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(_CASCADE)


# ════════════════════════════════
# FACE UTILS
# ════════════════════════════════

def decode_img(b64):
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    data = base64.b64decode(b64)
    arr  = np.frombuffer(data, np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)

def detect_face(img_bgr):
    gray  = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gray  = cv2.equalizeHist(gray)
    faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(50, 50))
    if len(faces) == 0:
        return None, None, None
    faces = sorted(faces, key=lambda r: r[2]*r[3], reverse=True)
    x, y, w, h = faces[0]
    pad = int(0.15 * min(w, h))
    x1 = max(0, x - pad);  y1 = max(0, y - pad)
    x2 = min(img_bgr.shape[1], x+w+pad); y2 = min(img_bgr.shape[0], y+h+pad)
    face_bgr  = img_bgr[y1:y2, x1:x2]
    face_gray = gray[y1:y2, x1:x2]
    return face_gray, face_bgr, (int(x), int(y), int(w), int(h))

def face_vector(face_gray):
    resized = cv2.resize(face_gray, (100, 100))
    # LBP
    lbp  = local_binary_pattern(resized, P=16, R=2, method="uniform")
    hist, _ = np.histogram(lbp.ravel(), bins=np.arange(0, 19), range=(0, 18))
    lbp_feat = hist.astype("float") / (hist.sum() + 1e-6)
    # HOG-lite
    gx = cv2.Sobel(cv2.resize(face_gray, (64, 64)), cv2.CV_32F, 1, 0)
    gy = cv2.Sobel(cv2.resize(face_gray, (64, 64)), cv2.CV_32F, 0, 1)
    mag, ang = cv2.cartToPolar(gx, gy, angleInDegrees=True)
    hog = []
    for cy in range(0, 64, 8):
        for cx in range(0, 64, 8):
            h, _ = np.histogram(ang[cy:cy+8, cx:cx+8].ravel(), bins=9,
                                range=(0, 180), weights=mag[cy:cy+8, cx:cx+8].ravel())
            hog.extend(h)
    hog = np.array(hog, dtype="float32")
    hog /= (np.linalg.norm(hog) + 1e-6)
    return np.concatenate([lbp_feat, hog])

def liveness(face_gray, face_bgr):
    lap = float(cv2.Laplacian(face_gray, cv2.CV_64F).var())
    std = float(np.std(face_gray))
    hsv = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2HSV)
    sat = float(np.mean(hsv[:, :, 1]))
    is_live = lap > 12 and std > 15 and sat > 6
    conf = min(100, int((lap/60)*35 + (std/50)*30 + (sat/40)*35))
    return {
        "is_live": bool(is_live),
        "confidence": conf,
        "details": {
            "sharpness": round(lap, 2),
            "texture_variance": round(std, 2),
            "color_saturation": round(sat, 2),
        }
    }

def match_face(probe, threshold=0.30):
    best_uid, best_d = None, 1.0
    for uid, entry in face_db.items():
        vecs = entry.get("embeddings", [])
        if not vecs: continue
        d = min(cosine(probe, v) for v in vecs)
        if d < best_d:
            best_d, best_uid = d, uid
    if best_uid and best_d <= threshold:
        return best_uid, face_db[best_uid]["name"], float(best_d)
    return None, None, float(best_d)


# ════════════════════════════════
# FACE ENDPOINTS
# ════════════════════════════════

@app.route("/face/register", methods=["POST"])
def register_face():
    body    = request.get_json(force=True)
    uid     = body.get("userId", "").strip()
    name    = body.get("name", "Unknown").strip()
    images  = body.get("images", [])
    if not uid or not images:
        return jsonify(success=False, message="userId and images[] required"), 400

    embeddings = []
    for b64 in images[:5]:
        img = decode_img(b64)
        if img is None: continue
        fg, fb, rect = detect_face(img)
        if fg is None: continue
        embeddings.append(face_vector(fg))

    if not embeddings:
        return jsonify(success=False,
            message="No face detected. Ensure face is clearly visible in good lighting."), 400

    face_db[uid] = {"name": name, "embeddings": embeddings, "registered_at": time.time()}
    _save_faces()
    return jsonify(success=True,
        message=f"Face registered for {name}. {len(embeddings)} photo(s) used.",
        userId=uid, embeddings_stored=len(embeddings))


@app.route("/face/verify", methods=["POST"])
def verify_face():
    body = request.get_json(force=True)
    b64  = body.get("image", "")
    req_live = body.get("requireLiveness", True)
    if not b64:
        return jsonify(success=False, message="image required"), 400
    if not face_db:
        return jsonify(success=True, matched=False,
            message="No villagers registered yet. Admin must register faces first.")

    img = decode_img(b64)
    if img is None:
        return jsonify(success=False, message="Invalid image data"), 400

    fg, fb, rect = detect_face(img)
    if fg is None:
        return jsonify(success=True, matched=False,
            message="No face detected. Please face the camera directly in good lighting.")

    liv = liveness(fg, fb)
    if req_live and not liv["is_live"]:
        return jsonify(success=True, matched=False, liveness=liv,
            message="Liveness check failed. Please use a real face — not a photo or screen.")

    probe = face_vector(fg)
    uid, name, dist = match_face(probe)
    if not uid:
        return jsonify(success=True, matched=False, liveness=liv,
            similarity=round((1 - dist) * 100, 1),
            message="Face not recognized. Villager may not be registered.")

    conf = round((1 - dist) * 100, 1)
    return jsonify(success=True, matched=True, userId=uid, name=name,
        confidence=conf, distance=round(dist, 4), liveness=liv,
        face_rect={"x": rect[0], "y": rect[1], "w": rect[2], "h": rect[3]},
        message=f"Identified: {name} ({conf}% confidence)")


@app.route("/face/list", methods=["GET"])
def list_faces():
    return jsonify(success=True, count=len(face_db),
        users=[{"userId": k, "name": v["name"],
                "embeddings": len(v["embeddings"]),
                "registered_at": v.get("registered_at")}
               for k, v in face_db.items()])


@app.route("/face/delete/<uid>", methods=["DELETE"])
def delete_face(uid):
    if uid in face_db:
        del face_db[uid]; _save_faces()
        return jsonify(success=True, message=f"Deleted face data for {uid}")
    return jsonify(success=False, message="User not found"), 404


# ════════════════════════════════
# IMAGE HASH UTILS
# ════════════════════════════════

def md5(data): return hashlib.md5(data).hexdigest()

def phash(img, size=32, hf=8):
    from scipy.fft import dct
    arr = np.array(img.convert("L").resize((size, size)), dtype=np.float64)
    d   = dct(dct(arr, axis=1, norm="ortho"), axis=0, norm="ortho")
    lf  = d[:hf, :hf]
    med = np.median(lf)
    bits = (lf > med).flatten()
    return format(int("".join(bits.astype(int).astype(str)), 2), f"0{hf*hf//4}x")

def hamming(h1, h2):
    return bin(int(h1, 16) ^ int(h2, 16)).count("1")

def ela(img, q=90):
    buf = BytesIO()
    img.save(buf, "JPEG", quality=q); buf.seek(0)
    rec = Image.open(buf)
    a = np.array(img.convert("RGB"), dtype=np.float32)
    b = np.array(rec.convert("RGB"),  dtype=np.float32)
    diff = np.abs(a - b)
    mean = float(np.mean(diff)); mx = float(np.max(diff)); std = float(np.std(diff))
    h, w = diff.shape[:2]
    cell_means = [float(np.mean(diff[i*h//4:(i+1)*h//4, j*w//4:(j+1)*w//4]))
                  for i in range(4) for j in range(4)]
    var = float(np.var(cell_means))
    is_manip = (mean > 12 and var > 80) or mx > 80
    return {"is_manipulated": bool(is_manip),
            "manipulation_score": min(100, int(mean*2 + var*0.3)),
            "ela_mean": round(mean, 2), "ela_max": round(mx, 2),
            "ela_std": round(std, 2), "region_variance": round(var, 2)}

def meta_check(img):
    issues = []
    try:
        raw = img._getexif()
        exif = {TAGS.get(k, k): str(v) for k, v in raw.items()} if raw else {}
    except Exception:
        exif = {}
    if not exif:
        issues.append("No EXIF metadata (likely screenshot or edited)")
    for k in ["Software", "ProcessingSoftware"]:
        v = exif.get(k, "")
        if any(s in v.lower() for s in ["photoshop","gimp","lightroom","snapseed","picsart","facetune"]):
            issues.append(f"Edited with: {v}")
    arr = np.array(img.convert("RGB"))
    uniq = len(np.unique(arr.reshape(-1, 3), axis=0)) / (arr.shape[0]*arr.shape[1])
    if uniq < 0.02:
        issues.append("Very few unique colors (possibly generated/fake)")
    return {"issues_found": issues, "exif_available": bool(exif),
            "pixel_uniqueness": round(uniq, 4), "suspicious": len(issues) > 0}

def blur_check(img):
    gray = np.array(img.convert("L"))
    v = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    return {"laplacian_variance": round(v, 2),
            "is_too_blurry": bool(v < 30),
            "clarity_score": min(100, int(v/5))}

def find_dups(ph, m5, thresh=8):
    out = []
    for k, meta in hash_db.items():
        if k == m5:
            out.append({**meta, "match_type": "exact", "distance": 0})
        elif k.startswith("p:"):
            d = hamming(ph, k[2:])
            if d <= thresh:
                out.append({**meta, "match_type": "perceptual", "distance": d})
    return out


# ════════════════════════════════
# COMPLAINT ENDPOINT
# ════════════════════════════════

@app.route("/complaint/check", methods=["POST"])
def check_complaint():
    body = request.get_json(force=True)
    b64  = body.get("image", "")
    cid  = body.get("complaintId", "")
    uid  = body.get("userId", "")
    save = body.get("save", True)
    if not b64:
        return jsonify(success=False, message="image required"), 400

    raw = b64.split(",", 1)[1] if "," in b64 else b64
    try:
        img_bytes = base64.b64decode(raw)
        img = Image.open(BytesIO(img_bytes)); img.load()
    except Exception as e:
        return jsonify(success=False, message=f"Invalid image: {e}"), 400

    m5   = md5(img_bytes)
    ph   = phash(img)
    ela_ = ela(img)
    meta = meta_check(img)
    blur = blur_check(img)
    dups = find_dups(ph, m5)

    score = 0; flags = []; recs = []

    if dups:
        exacts = [d for d in dups if d["match_type"] == "exact"]
        percs  = [d for d in dups if d["match_type"] == "perceptual"]
        if exacts:
            score += 60
            flags.append(f"EXACT DUPLICATE: Same image used in complaint {exacts[0].get('complaintId','?')}")
            recs.append("Reject — identical photo already submitted")
        elif percs:
            best = min(percs, key=lambda x: x["distance"])
            score += 40
            flags.append(f"NEAR-DUPLICATE: Similar to complaint {best.get('complaintId','?')} (distance={best['distance']})")
            recs.append("Manual review — very similar image already submitted")

    if ela_["is_manipulated"]:
        score += 25
        flags.append(f"IMAGE MANIPULATION DETECTED (ELA score: {ela_['manipulation_score']})")
        recs.append("Image may have been edited with Photoshop or similar")

    if meta["suspicious"]:
        score += 15
        for i in meta["issues_found"]:
            flags.append(f"METADATA: {i}")
        recs.append("Review metadata — signs of screenshot or edited image")

    if blur["is_too_blurry"]:
        score += 10
        flags.append(f"IMAGE TOO BLURRY (clarity: {blur['clarity_score']}/100)")
        recs.append("Request a clearer photo")

    score = min(100, score)

    if score >= 60:
        verdict, action, color = "FAKE",       "REJECT",        "red"
        emoji = "🚫"
    elif score >= 30:
        verdict, action, color = "SUSPICIOUS", "MANUAL_REVIEW", "orange"
        emoji = "⚠️"
    else:
        verdict, action, color = "AUTHENTIC",  "APPROVE",       "green"
        emoji = "✅"

    if not flags:
        flags = ["No issues detected — image appears authentic"]

    if save and verdict != "FAKE":
        hash_db[m5]        = {"complaintId": cid, "userId": uid, "ts": time.time(), "verdict": verdict}
        hash_db[f"p:{ph}"] = {"complaintId": cid, "userId": uid, "ts": time.time(), "verdict": verdict}
        _save_hashes()

    return jsonify(success=True, verdict=verdict, verdict_emoji=emoji,
        fake_score=score, action=action, color=color,
        flags=flags, recommendations=recs,
        details={"duplicates": dups, "ela": ela_, "metadata": meta,
                 "blur": blur, "hashes": {"md5": m5, "phash": ph}},
        message=f"{emoji} {verdict} — Fake Score: {score}/100")


# ════════════════════════════════
# HEALTH
# ════════════════════════════════

@app.route("/health", methods=["GET"])
def health():
    return jsonify(status="ok", service="GramSeva AI",
        face_db_count=len(face_db), hash_db_count=len(hash_db),
        capabilities=["face_recognition","liveness_detection",
                      "duplicate_detection","ela_manipulation","metadata_analysis"])


if __name__ == "__main__":
    port = int(os.environ.get("AI_PORT", 6000))
    print("=" * 50)
    print(f"  GramSeva AI Service  |  Port {port}")
    print("=" * 50)
    print(f"  Health : http://localhost:{port}/health")
    print(f"  Face   : POST /face/register")
    print(f"  Verify : POST /face/verify")
    print(f"  Check  : POST /complaint/check")
    print("=" * 50)
    print("  Keep this window OPEN while using GramSeva")
    print("=" * 50)
    app.run(host="0.0.0.0", port=port, debug=False)
