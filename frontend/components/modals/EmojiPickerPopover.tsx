'use client';
import { useEffect, useRef } from 'react';

const EMOJI_GROUPS = [
  { name: 'Смайлы', emojis: ['😀','😂','🥹','😍','🤩','😎','🥸','🤣','😊','😇','🙃','😋','😛','🤪','😜','🤑','🤗','🫡','🤔','🫠','🤐','😶','😏','😒','🙄','😬','🤥','😔','😪','😴','😷','🤒','🤕','🤢','🤮','🤧'] },
  { name: 'Жесты', emojis: ['👋','🤚','✋','🖖','🤙','💪','🦾','🤜','🤛','👊','✊','🤞','✌️','🤟','🤘','👌','🤌','🤏','👈','👉','👆','👇','☝️','👍','👎','✍️','🙏','🤝','🫶'] },
  { name: 'Объекты', emojis: ['🔥','💜','❤️','🧡','💛','💚','💙','🖤','🤍','💯','✨','⚡','🌊','🚀','🎮','🎉','🎶','💎','🏆','🥇','🎯','🎲','🎭','🎪'] },
  { name: 'Природа', emojis: ['🌸','🌺','🌻','🌹','🌷','🍀','🌿','🌱','🍁','🍂','🌍','🌙','☀️','⭐','🌈','☁️','⛄','🔮','🦋','🐬','🦁','🐺','🦊','🐼'] },
];

export default function EmojiPickerPopover({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 10);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ width: 320, maxHeight: 380, overflowY: 'auto', padding: 12 }}>
      {EMOJI_GROUPS.map(group => (
        <div key={group.name} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            {group.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {group.emojis.map(e => (
              <button key={e} onClick={() => onPick(e)}
                style={{ width: 36, height: 36, fontSize: 20, cursor: 'pointer', background: 'none', border: 'none', borderRadius: 6, transition: 'background 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(90,90,216,0.2)')}
                onMouseLeave={ev => (ev.currentTarget.style.background = 'none')}>
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
