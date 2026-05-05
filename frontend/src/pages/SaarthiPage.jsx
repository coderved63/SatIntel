import { useMemo, useState } from 'react';
import { Bot, Send } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/common/Card';
import { useCity } from '../context/CityContext';
import { useAnalysisContext } from '../context/AnalysisContext';
import { copilotService } from '../services/copilotService';

const SUGGESTED_QUERIES = [
  'Which city metrics are most critical in this date window, and why?',
  'Summarize major environmental risks for this city in plain language.',
  'What actions should municipality prioritize in the next 30 days?',
  'What are the main model limitations I should mention during demo?',
];

export default function SaarthiPage() {
  const { city } = useCity();
  const { dateRange } = useAnalysisContext();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const headerMeta = useMemo(() => {
    const start = dateRange?.start_date || '--';
    const end = dateRange?.end_date || '--';
    return `${city.name} | ${start} to ${end}`;
  }, [city.name, dateRange]);

  const sendQuestion = async (inputText = null) => {
    const q = (inputText ?? question).trim();
    if (!q || loading) return;
    setQuestion('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const response = await copilotService.chat({
        city: city.key,
        page: 'saarthi',
        question: q,
        parameter: null,
        date_range: dateRange,
      });
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: response?.answer || 'I could not generate a response right now.',
          meta: response?.confidence_note || '',
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: err?.response?.data?.detail || 'Saarthi is unavailable right now.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/15">
              <Bot className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Saarthi Assistant</h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Project-focused Q&A with full platform context (analytics, maps, risks, and action planning).
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{headerMeta}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTED_QUERIES.map((item) => (
              <button
                key={item}
                onClick={() => sendQuestion(item)}
                disabled={loading}
                className="px-3 py-1.5 rounded-full text-xs transition-colors"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="h-[420px] overflow-y-auto rounded-xl p-3 space-y-2" style={{ background: 'var(--bg-card)' }}>
            {messages.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Ask any logical or project-related question. Saarthi is configured to respond using evidence-backed platform context.
              </p>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'ml-10' : 'mr-10'}`}
                  style={{
                    background: m.role === 'user' ? 'rgba(6,182,212,0.15)' : 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <p>{m.text}</p>
                  {m.meta ? <p className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>{m.meta}</p> : null}
                </div>
              ))
            )}
            {loading ? <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Saarthi is thinking...</p> : null}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendQuestion(); }}
              placeholder="Ask project-related query..."
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
            <button
              onClick={() => sendQuestion()}
              disabled={loading}
              className="p-2.5 rounded-lg"
              style={{ background: 'rgba(6,182,212,0.2)', color: '#22d3ee' }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
