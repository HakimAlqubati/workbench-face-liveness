import React, { useState } from "react";
import {PYTHON_BASE_API} from '../config';
const API_URL = `${PYTHON_BASE_API}/verify`; // عدله لو تغير

const PRIMARY_COLOR = "#0d7c66";
const PRIMARY_GRADIENT = "linear-gradient(90deg, #0d7c66 70%, #21bfa5 100%)";

const modelOptions = [
  { value: "Facenet", label: "Facenet" },
  { value: "VGG-Face", label: "VGG-Face" },
  { value: "ArcFace", label: "ArcFace" },
  { value: "DeepFace", label: "DeepFace" }
];

export default function FaceVerificationPage() {
  const [img1, setImg1] = useState(null);
  const [img2, setImg2] = useState(null);
  const [img1Preview, setImg1Preview] = useState(null);
  const [img2Preview, setImg2Preview] = useState(null);
  const [model, setModel] = useState("Facenet");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImageChange = (e, setter, previewSetter) => {
    const file = e.target.files[0];
    setter(file);
    previewSetter(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("img1", img1);
    formData.append("img2", img2);
    formData.append("model_name", model);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("فشل الاتصال بالخادم أو الملف غير صحيح");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "حدث خطأ أثناء التنفيذ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #e5f9f6 0%, #f3fcfb 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        background: "#fff",
        padding: "38px 28px",
        borderRadius: "18px",
        boxShadow: "0 8px 36px 0 #b3e4dc30, 0 2px 8px #0d7c6615",
        width: "100%",
        maxWidth: 450
      }}>
        <h2 style={{
          fontWeight: 800,
          fontSize: 23,
          marginBottom: 10,
          color: PRIMARY_COLOR,
          textAlign: "center"
        }}>مقارنة الوجوه (Face Verification)</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 18, justifyContent: "center" }}>
            <label style={{ flex: 1 }}>
              <span style={{ color: "#8ea7a1", fontSize: 14, fontWeight: 600 }}>الصورة الأولى</span>
              <input
                type="file"
                accept="image/*"
                required
                style={{ width: "100%", marginTop: 4 }}
                onChange={e => handleImageChange(e, setImg1, setImg1Preview)}
              />
              {img1Preview && (
                <img src={img1Preview} alt="img1" style={{
                  marginTop: 6, width: "100%", maxHeight: 110, borderRadius: 8, objectFit: "cover", boxShadow: "0 2px 8px #a6ebe070"
                }} />
              )}
            </label>
            <label style={{ flex: 1 }}>
              <span style={{ color: "#8ea7a1", fontSize: 14, fontWeight: 600 }}>الصورة الثانية</span>
              <input
                type="file"
                accept="image/*"
                required
                style={{ width: "100%", marginTop: 4 }}
                onChange={e => handleImageChange(e, setImg2, setImg2Preview)}
              />
              {img2Preview && (
                <img src={img2Preview} alt="img2" style={{
                  marginTop: 6, width: "100%", maxHeight: 110, borderRadius: 8, objectFit: "cover", boxShadow: "0 2px 8px #a6ebe070"
                }} />
              )}
            </label>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ color: "#8ea7a1", fontWeight: 600, fontSize: 15 }}>النموذج:</span>
            <select value={model} onChange={e => setModel(e.target.value)}
              style={{
                flex: 1,
                padding: "7px 12px",
                borderRadius: 9,
                border: `1.5px solid #c2e8e2`,
                fontWeight: 700,
                fontSize: 16,
                background: "#f8fcfb"
              }}>
              {modelOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading || !img1 || !img2}
            style={{
              background: PRIMARY_GRADIENT,
              color: "#fff",
              fontWeight: 800,
              fontSize: 18,
              border: "none",
              borderRadius: 12,
              padding: "15px 0",
              boxShadow: "0 2px 8px #0d7c6640",
              letterSpacing: ".2px",
              marginTop: 8,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "transform .13s,box-shadow .18s"
            }}
          >
            {loading ? "يتم التحقق..." : "ابدأ المقارنة"}
          </button>
        </form>
        {error && <div style={{ color: "#d32f2f", marginTop: 12, textAlign: "center", fontWeight: 600 }}>{error}</div>}
        {result && (
          <div style={{
            marginTop: 22,
            background: "#e5f9f6",
            borderRadius: 12,
            padding: "18px 11px",
            color: "#18513d",
            textAlign: "center",
            fontWeight: 700,
            boxShadow: "0 2px 8px #0d7c6620"
          }}>
            <div style={{ fontSize: 17, marginBottom: 6 }}>نتيجة المقارنة:</div>
            <div style={{ fontSize: 15.5 }}>
              {result.distance !== undefined &&
                <>
                  <div>
                    <span style={{ fontWeight: 600 }}>المسافة (distance):</span> {Number(result.distance).toFixed(3)}
                  </div>
                  <div style={{
                    margin: "8px 0",
                    color: (result.distance < 0.55 ? "#089e42" : "#d32f2f"),
                    fontSize: 19,
                    fontWeight: 900
                  }}>
                    {result.distance < 0.55
                      ? "الوجهان متطابقان (نفس الشخص)"
                      : "الوجهان غير متطابقين"}
                  </div>
                </>
              }
              <details style={{ marginTop: 9, textAlign: "left", fontWeight: 400, color: "#277760", direction: "ltr" }}>
                <summary style={{ cursor: "pointer", color: "#0d7c66", fontWeight: 700, marginBottom: 4 }}>
                  عرض التفاصيل التقنية (JSON)
                </summary>
                <pre style={{ fontSize: 11.8, overflowX: "auto", background: "#f7f9f8", borderRadius: 6, padding: 6 }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
