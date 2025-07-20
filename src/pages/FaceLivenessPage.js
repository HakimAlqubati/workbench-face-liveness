import React, { useEffect, useState } from 'react';
import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness';
import { ThemeProvider, Loader } from '@aws-amplify/ui-react';
import { API_BASE_URL } from "../config";
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import awsExports from '../aws-exports';

Amplify.configure(awsExports);

export default function FaceLivenessPage() {
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // جلب sessionId من الباك إند عند التحميل
  const fetchSessionId = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/aws/employee-liveness/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      setSessionId(data.sessionId);
    } catch (err) {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionId();
  }, []);

  // التحقق من النتيجة بعد الفحص
  const handleAnalysisComplete = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8080/api/aws/employee-liveness/check-session?sessionId=${sessionId}`
      );
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('حدث خطأ أثناء التحقق من الجلسة');
    } finally {
      setLoading(false);
    }
  };

  const handleError = (error) => {
    setError('حدث خطأ: ' + (error?.message || ''));
    console.error(error);
  };

  // واجهة التحميل
  if (loading) return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>
      <Loader />
    </div>
  );

  // واجهة الخطأ
  if (error) return (
    <div style={{
      color:'white',
      background:'#e3342f',
      padding:24,
      borderRadius:8,
      textAlign:'center',
      margin:'50px auto',
      maxWidth:400,
      fontSize:18
    }}>
      {error}
      <div>
        <button
          onClick={fetchSessionId}
          style={{
            marginTop:16,
            padding:'8px 28px',
            border:'none',
            background:'#4a5568',
            color:'white',
            borderRadius:4,
            cursor:'pointer'
          }}>
          إعادة المحاولة
        </button>
      </div>
    </div>
  );

  // واجهة النتيجة
  if (result) return (
    <ThemeProvider>
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f7fa'}}>
        <div style={{
          background:'#fff',borderRadius:14,boxShadow:'0 6px 32px #cbd5e1',padding:32,minWidth:340,textAlign:'center'
        }}>
          <h2 style={{color:'#26547c',marginBottom:16}}>نتيجة الفحص الحيوي</h2>
          <pre style={{
            textAlign:'left',
            background:'#f8f8fa',
            padding:14,
            borderRadius:8,
            marginBottom:18,
            fontSize:14,
            direction:'ltr'
          }}>{JSON.stringify(result, null, 2)}</pre>
          <button
            onClick={()=>{
              setResult(null);
              fetchSessionId();
            }}
            style={{
              background:'#26547c',
              color:'#fff',
              border:'none',
              padding:'10px 36px',
              borderRadius:8,
              fontSize:17,
              cursor:'pointer',
              fontWeight:600
            }}
          >
            إعادة الفحص
          </button>
        </div>
      </div>
    </ThemeProvider>
  );

  // الواجهة الافتراضية
  return (
    <ThemeProvider>
      <FaceLivenessDetector
        sessionId={sessionId}
        region="us-east-1"
        onAnalysisComplete={handleAnalysisComplete}
        onError={handleError}
      />
    </ThemeProvider>
  );
}
