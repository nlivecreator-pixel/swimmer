'use client';
import { useEffect, useRef } from 'react';

const GLOBAL_STICKERS = [
  {id:'sk1',emoji:'🔥',name:'fire'},{id:'sk2',emoji:'💜',name:'heart'},
  {id:'sk3',emoji:'🚀',name:'rocket'},{id:'sk4',emoji:'😂',name:'lmao'},
  {id:'sk5',emoji:'👀',name:'eyes'},{id:'sk6',emoji:'💀',name:'skull'},
  {id:'sk7',emoji:'✨',name:'sparkle'},{id:'sk8',emoji:'🎉',name:'party'},
  {id:'sk9',emoji:'🤝',name:'shake'},{id:'sk10',emoji:'🌊',name:'wave'},
  {id:'sk11',emoji:'⚡',name:'zap'},{id:'sk12',emoji:'🎮',name:'game'},
  {id:'sk13',emoji:'🦋',name:'butterfly'},{id:'sk14',emoji:'🍕',name:'pizza'},
  {id:'sk15',emoji:'💯',name:'100'},{id:'sk16',emoji:'🤯',name:'mindblown'},
  {id:'sk17',emoji:'🎯',name:'target'},{id:'sk18',emoji:'🏆',name:'trophy'},
  {id:'sk19',emoji:'💎',name:'gem'},{id:'sk20',emoji:'🌈',name:'rainbow'},
];

export default function StickerPicker({
  serverStickers = [], onPick, onClose
}: { serverStickers?: any[]; onPick: (s:any)=>void; onClose: ()=>void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if(ref.current&&!ref.current.contains(e.target as Node)) onClose(); };
    setTimeout(()=>document.addEventListener('mousedown',h),10);
    return ()=>document.removeEventListener('mousedown',h);
  }, []);

  return (
    <div ref={ref}>
      {serverStickers.length>0 && (
        <>
          <div style={{padding:'8px 12px 4px',fontSize:11,fontWeight:700,color:'var(--text-3)',
                      textTransform:'uppercase',letterSpacing:'.06em'}}>
            <span className="ms ms-sm filled" style={{ color: 'var(--yellow)', marginRight: 4 }}>star</span>
            Стикеры сервера
          </div>
          <div className="sticker-grid" style={{paddingBottom:4}}>
            {serverStickers.map(s => (
              <button key={s.id} className="sticker-item" onClick={()=>onPick(s)} title={s.name}>
                {s.emoji}
              </button>
            ))}
          </div>
          <div style={{height:1,background:'var(--divider)',margin:'0 10px'}} />
        </>
      )}
      <div style={{padding:'8px 12px 4px',fontSize:11,fontWeight:700,color:'var(--text-3)',
                  textTransform:'uppercase',letterSpacing:'.06em'}}>
      <span className="ms ms-sm filled" style={{ color: 'var(--accent-2)', marginRight: 4 }}>auto_awesome</span>
      Стикеры
      </div>
      <div className="sticker-grid">
        {GLOBAL_STICKERS.map(s => (
          <button key={s.id} className="sticker-item" onClick={()=>onPick(s)} title={s.name}>
            {s.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
