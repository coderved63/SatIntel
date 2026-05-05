import { useMemo, useState } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useCity } from '../../context/CityContext';
import { useAnalysisContext } from '../../context/AnalysisContext';
import { copilotService } from '../../services/copilotService';

function resolvePage(pathname) {
  if (pathname.startsWith('/analytics')) return 'analytics';
  if (pathname.startsWith('/action-plan')) return 'action-plan';
  if (pathname.startsWith('/green-gap')) return 'green-gap';
  if (pathname.startsWith('/time-machine')) return 'time-machine';
  if (pathname.startsWith('/rankings')) return 'rankings';
  return 'dashboard';
}

export default function SaarthiWidget() {
  const { city } = useCity();
  const { dateRange } = useAnalysisContext();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const activePage = useMemo(() => resolvePage(location.pathname), [location.pathname]);

  const sendMessage = async () => {
    const q = question.trim();
    if (!q || loading) return;
    setQuestion('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const response = await copilotService.chat({
        city: city.key,
        page: activePage,
        question: q,
        parameter: null,
        date_range: dateRange,
      });
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: response?.answer || 'I could not generate a response right now.',
          meta: response?.llm_status ? `Mode: ${response.llm_status}` : '',
        },
      ]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: err?.response?.data?.detail || 'Saarthi is unavailable right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <Bot className="h-4 w-4 text-cyan-400" />
          Saarthi
        </button>
      ) : (
        <div className="w-[340px] rounded-2xl border shadow-2xl overflow-hidden" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="px-3 py-2 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Saarthi</div>
            <button onClick={() => setOpen(false)} style={{ color: 'var(--text-muted)' }}><X className="h-4 w-4" /></button>
          </div>
          <div className="h-72 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Ask Saarthi about the current page evidence, trends, hotspots, or action priorities.
              </p>
            )}
            {messages.map((m, idx) => (
              <div key={idx} className={`rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'ml-8' : 'mr-8'}`} style={{
                background: m.role === 'user' ? 'rgba(6,182,212,0.15)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
              }}>
                <p>{m.text}</p>
                {m.meta ? <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>{m.meta}</p> : null}
              </div>
            ))}
            {loading ? <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Saarthi is thinking…</p> : null}
          </div>
          <div className="p-2 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="Ask Saarthi..."
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
            <button onClick={sendMessage} disabled={loading} className="p-2 rounded-lg" style={{ background: 'rgba(6,182,212,0.2)', color: '#22d3ee' }}>
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
