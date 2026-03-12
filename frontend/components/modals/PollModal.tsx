'use client';
import { useState } from 'react';

export default function PollModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (q: string, opts: string[]) => void;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [options,  setOptions]  = useState(['', '']);

  const addOption    = () => { if (options.length < 8) setOptions(o => [...o, '']); };
  const setOption    = (i: number, v: string) => setOptions(o => o.map((x, j) => j === i ? v : x));
  const removeOption = (i: number) => { if (options.length > 2) setOptions(o => o.filter((_, j) => j !== i)); };

  function submit() {
    const q    = question.trim();
    const opts = options.map(o => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) { alert('Нужен вопрос и хотя бы 2 варианта'); return; }
    onSubmit(q, opts);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ width: 460, padding: 32 }}>
        {/* Header — Material icon, no emoji */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--accent-subtle)', border: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="ms ms-lg filled" style={{ color: 'var(--accent-2)' }}>bar_chart</span>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Создать опрос</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Участники смогут проголосовать</div>
          </div>
          <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={onClose}>
            <span className="ms ms-sm">close</span>
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--divider)', margin: '16px 0' }} />

        {/* Question */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Вопрос</label>
          <input
            className="field"
            placeholder="О чём спросить?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            autoFocus
          />
        </div>

        {/* Options */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Варианты ответа</label>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="field" placeholder={`Вариант ${i + 1}`} value={opt}
                onChange={e => setOption(i, e.target.value)} style={{ flex: 1 }} />
              {options.length > 2 && (
                <button className="icon-btn" style={{ flexShrink: 0 }} onClick={() => removeOption(i)}>
                  <span className="ms ms-sm">remove_circle</span>
                </button>
              )}
            </div>
          ))}
          {options.length < 8 && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 4, gap: 6 }} onClick={addOption}>
              <span className="ms ms-sm">add_circle</span>
              Добавить вариант
            </button>
          )}
        </div>

        <div style={{ height: 1, background: 'var(--divider)', margin: '16px 0' }} />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>
            <span className="ms ms-sm">close</span>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={submit}>
            <span className="ms ms-sm">bar_chart</span>
            Создать опрос
          </button>
        </div>
      </div>
    </div>
  );
}
