'use client';
import { useStore } from '../../lib/store';

export default function PollWidget({ poll }: { poll: any }) {
  const { me } = useStore();
  const total = poll.options.reduce((s: number, o: any) => s + o.votes.length, 0);
  const myVote = poll.options.findIndex((o: any) => o.votes.includes(me?.id));

  async function vote(idx: number) {
    if (!me) return;
    await fetch(`/api/polls/${poll.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: me.id, option_idx: idx }),
    });
  }

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{poll.question}</div>
      {poll.options.map((opt: any, i: number) => {
        const pct = total > 0 ? Math.round((opt.votes.length / total) * 100) : 0;
        const isMyVote = myVote === i;
        return (
          <div key={i} className={`poll-option${isMyVote ? ' voted' : ''}`} onClick={() => vote(i)}>
            <div className="poll-bar" style={{ transform: `scaleX(${pct / 100})` }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isMyVote ? 'var(--accent)' : 'rgba(255,255,255,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isMyVote && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
              </div>
              <span style={{ flex: 1, fontSize: 14 }}>{opt.text}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: isMyVote ? 'var(--accent-2)' : 'var(--text-3)' }}>{pct}%</span>
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{total} голос{total === 1 ? '' : total < 5 ? 'а' : 'ов'}</div>
    </div>
  );
}
