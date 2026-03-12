'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function InvitePage() {
  const params  = useParams();
  const router  = useRouter();
  const code    = params?.code as string;
  const [data,   setData]   = useState<any>(null);
  const [error,  setError]  = useState('');
  const [loading,setLoading]= useState(true);
  const [joining,setJoining]= useState(false);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/invites/${code}`)
      .then(r => { if (!r.ok) throw new Error('Invalid'); return r.json(); })
      .then(setData)
      .catch(() => setError('Недействительная ссылка-приглашение'))
      .finally(() => setLoading(false));
  }, [code]);

  async function join() {
    const me = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('swimer_me')||'null') : null;
    if (!me) { router.push('/'); return; }
    setJoining(true);
    try {
      await fetch(`/api/invites/${code}/join`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({uid: me.id}),
      });
      router.push('/');
    } catch { setError('Ошибка при вступлении'); }
    setJoining(false);
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
                background:'linear-gradient(135deg,#0d0d12,#1a1a30)',fontFamily:'Inter,sans-serif'}}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet" />
      <div style={{width:440,background:'rgba(16,16,26,0.9)',backdropFilter:'blur(40px)',
                  border:'1px solid rgba(90,90,216,0.3)',borderRadius:24,padding:32,textAlign:'center',
                  boxShadow:'0 0 80px rgba(90,90,216,0.15)'}}>
        <div style={{fontSize:64,marginBottom:12}}>🌊</div>
        <div style={{fontSize:22,fontWeight:800,color:'#fff',marginBottom:4}}>Swimer</div>
        {loading && <div style={{color:'#666',fontSize:15,marginTop:16}}>Загрузка...</div>}
        {error && (
          <>
            <div style={{color:'#f87171',fontSize:28,marginTop:16}}>❌</div>
            <div style={{color:'#f87171',fontSize:15,marginTop:8}}>{error}</div>
            <button onClick={() => router.push('/')}
              style={{marginTop:20,padding:'12px 24px',background:'rgba(255,255,255,.08)',
                     border:'1px solid rgba(255,255,255,.12)',borderRadius:10,color:'#fff',
                     cursor:'pointer',fontSize:14,fontWeight:600}}>
              На главную
            </button>
          </>
        )}
        {data && !error && (
          <>
            <div style={{fontSize:40,margin:'16px 0 4px'}}>{data.server?.icon}</div>
            <div style={{fontSize:20,fontWeight:800,color:'#fff'}}>{data.server?.name}</div>
            <div style={{fontSize:13,color:'#666',marginTop:4}}>{data.server?.members?.length} участников</div>
            {data.server?.description && (
              <div style={{fontSize:13,color:'#aaa',marginTop:8,padding:'8px 12px',
                          background:'rgba(255,255,255,.04)',borderRadius:8}}>
                {data.server.description}
              </div>
            )}
            <div style={{height:1,background:'rgba(255,255,255,.07)',margin:'20px 0'}} />
            <div style={{fontSize:14,color:'#888',marginBottom:16}}>
              Тебя пригласили вступить на сервер
            </div>
            <button onClick={join} disabled={joining}
              style={{width:'100%',padding:'13px',background:'linear-gradient(135deg,#5a5ad8,#7c7cf5)',
                     border:'none',borderRadius:10,color:'#fff',fontSize:16,fontWeight:700,
                     cursor:'pointer',boxShadow:'0 4px 20px rgba(90,90,216,0.4)'}}>
              {joining ? 'Вступаем...' : '🚀 Вступить на сервер'}
            </button>
            <button onClick={() => router.push('/')}
              style={{marginTop:10,width:'100%',padding:'11px',background:'rgba(255,255,255,.06)',
                     border:'1px solid rgba(255,255,255,.1)',borderRadius:10,color:'#aaa',
                     cursor:'pointer',fontSize:14,fontWeight:600}}>
              Отмена
            </button>
          </>
        )}
      </div>
    </div>
  );
}
