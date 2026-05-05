import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertCircle, Bot, Calendar, Cpu, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import { useAnalysisContext } from '../../context/AnalysisContext';
import { copilotService } from '../../services/copilotService';

export default function SaarthiWidget() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const { city } = useCity();
  const { dateRange } = useAnalysisContext();

  const ask = async (promptText) => {
    setLoading(true);
    try {
      const response = await copilotService.chat({
        city: city.key,
        page: location.pathname.replace('/', '') || 'dashboard',
        question: promptText,
        dateRange,
      });
      setAnswer(response);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
        }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg"
        style={{ background: 'var(--accent)', color: 'var(--text-on-accent)' }}
      >
        <MessageCircle className="h-4 w-4" />
        Saarthi
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.10)' }}>
                <Bot className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Saarthi</p>
                <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Analyst copilot for {city.name}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded" style={{ color: 'var(--text-faint)' }}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)', color: 'var(--text-faint)' }}>
                <Calendar className="h-3 w-3" />
                {dateRange.start_date} to {dateRange.end_date}
              </div>
              <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)', color: 'var(--text-faint)' }}>
                <Sparkles className="h-3 w-3" />
                {location.pathname.replace('/', '') || 'dashboard'}
              </div>
            </div>
            <div className="rounded-xl p-3 min-h-[220px] max-h-[360px] overflow-y-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-card-border)' }}>
              {loading ? (
                <div className="space-y-2">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Saarthi is reviewing the current evidence...</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Running page-aware evidence review and answer synthesis.</p>
                </div>
              ) : answer ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px]"
                      style={{
                        background: answer.llm_status === 'fallback' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                        color: answer.llm_status === 'fallback' ? '#F59E0B' : '#10B981',
                      }}
                    >
                      {answer.llm_status === 'fallback' ? <AlertCircle className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                      {answer.llm_status === 'fallback' ? 'Backend fallback' : 'LLM generated'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px]" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--bg-card-border)', color: 'var(--text-faint)' }}>
                      <Cpu className="h-3 w-3" />
                      {answer.llm_model || 'Python evidence path'}
                    </span>
                  </div>
                  <p className="text-sm leading-6 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{answer.answer}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>Window: {answer.analysis_window?.start_date} to {answer.analysis_window?.end_date}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>{answer.confidence_note}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ask Saarthi what the current evidence means.</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                    Try asking about the active date window, a hotspot, an anomaly, or why a recommendation appears.
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Ask about this page..."
                className="flex-1 rounded-xl px-3 py-2 text-sm"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--bg-input-border)', color: 'var(--text-primary)' }}
              />
              <button
                onClick={() => {
                  if (!question.trim()) return;
                  ask(question.trim());
                  setQuestion('');
                }}
                className="px-3 rounded-xl"
                style={{ background: 'var(--accent)', color: 'var(--text-on-accent)' }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
