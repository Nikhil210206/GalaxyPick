import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Send, Bot, MessageSquare, Sparkles, GitCompareArrows, Bookmark, Plus, ArrowRight, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Header } from '../components/Header';
import { useGalaxy } from '../context/GalaxyContext';
import { useSaved } from '../hooks/useSaved';

// Gemini replies in markdown; render it rather than printing the raw syntax.
const markdownComponents = {
  p: props => <p className="mb-2 last:mb-0" {...props} />,
  ul: props => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1" {...props} />,
  ol: props => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1" {...props} />,
  strong: props => <strong className="font-bold" {...props} />,
  em: props => <em className="italic" {...props} />,
  code: props => <code className="bg-gray-100 rounded px-1 py-0.5 text-xs" {...props} />,
  a: props => <a className="underline text-[#1B4EFF]" target="_blank" rel="noreferrer" {...props} />,
};

const fmt = (n) => `₹${n.toLocaleString('en-IN')}`;

function ChatPhoneCard({ phone }) {
  return (
    <div
      data-testid={`chat-phone-card-${phone.id}`}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.05)] hover:shadow-[0_16px_40px_rgba(27,78,255,0.14)] hover:-translate-y-0.5 transition-all flex flex-col"
    >
      <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
        <img src={phone.image} alt={phone.name} className="w-full h-full object-cover" />
      </div>
      <div className="p-3 flex flex-col flex-1">
        <div className="font-extrabold text-black text-sm">{phone.name}</div>
        <ul className="mt-2 space-y-1 flex-1">
          {phone.features.map((f, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-[#1B4EFF] shrink-0" /> {f}
            </li>
          ))}
        </ul>
        <div className="mt-2 text-sm text-gray-500">From <span className="text-base font-extrabold text-black">{fmt(phone.price_inr)}</span></div>
        <div className="mt-3 flex items-center gap-2">
          <Link
            to={`/product/${phone.id}`}
            data-testid={`chat-view-details-${phone.id}`}
            className="flex-1 bg-[#1B4EFF] hover:bg-[#1428A0] text-white rounded-full py-2 text-xs font-semibold inline-flex items-center justify-center gap-1 whitespace-nowrap transition-colors"
          >
            View Details <ArrowRight className="w-3 h-3 shrink-0" />
          </Link>
          <a
            href={phone.samsung_url}
            target="_blank"
            rel="noreferrer"
            data-testid={`chat-samsung-link-${phone.id}`}
            className="px-3 py-2 rounded-full border border-gray-200 hover:border-[#1B4EFF] text-xs font-semibold text-black inline-flex items-center gap-1 whitespace-nowrap transition-colors"
          >
            Samsung <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        </div>
      </div>
    </div>
  );
}

const suggestions = [
  'I need a phone for college. Good battery, good camera for notes and photos, and budget under ₹40,000.',
  'What is the best Samsung phone for gaming under ₹30,000?',
  'Suggest a flagship with the best camera',
  'Best foldable Samsung phone for business use',
];

// `action` receives helpers from Chat so the sidebar stays declarative.
const sidebar = [
  { label: 'New Conversation', icon: Plus, active: true, action: ({ reset }) => reset() },
  { label: 'Recommended for you', icon: Sparkles, action: ({ nav }) => nav('/recommendations') },
  { label: 'Compare', icon: GitCompareArrows, action: ({ nav, saved }) => nav(saved.length ? `/compare?ids=${saved.slice(0, 3).join(',')}` : '/compare') },
  { label: 'Saved', icon: Bookmark, action: ({ nav }) => nav('/models?saved=1') },
];

export default function Chat() {
  const { API, persona } = useGalaxy();
  const [sessionId, setSessionId] = useState(() => `session-${crypto.randomUUID()}`);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef(null);
  const nav = useNavigate();
  const { saved } = useSaved();

  // Fresh session id too, so the new thread doesn't replay the old history.
  const reset = () => {
    setMessages([]);
    setInput('');
    setSessionId(`session-${crypto.randomUUID()}`);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || streaming) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setStreaming(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: text, persona }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();
        for (const p of parts) {
          if (!p.startsWith('data: ')) continue;
          const payload = p.slice(6);
          if (payload === '[DONE]') continue;
          // A frame is either a text chunk (JSON string) or a structured
          // event (JSON object), e.g. the product cards for phones just named.
          const data = JSON.parse(payload);
          setMessages(m => {
            const next = [...m];
            const last = next[next.length - 1];
            next[next.length - 1] = typeof data === 'string'
              ? { ...last, content: last.content + data }
              : data.type === 'phones'
                ? { ...last, phones: data.phones }
                : last;
            return next;
          });
        }
      }
    } catch (e) {
      setMessages(m => {
        const next = [...m];
        next[next.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header variant="inner" />
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-1">
            <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#1B4EFF] flex items-center justify-center mb-2">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div className="font-bold text-black">Galaxy AI</div>
              <div className="text-xs text-gray-500">Your smart assistant</div>
            </div>
            {sidebar.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.label}
                  data-testid={`chat-sidebar-${s.label.replace(/ /g, '-').toLowerCase()}`}
                  onClick={() => s.action({ nav, reset, saved })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${s.active ? 'bg-[#E8F0FE] text-[#1B4EFF]' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Icon className="w-4 h-4" /> {s.label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Chat area */}
        <main className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 shadow-[0_8px_28px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden" style={{ minHeight: '70vh' }}>
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#1B4EFF] flex items-center justify-center mb-4">
                <Bot className="w-9 h-9 text-white" />
              </div>
              <h3 className="font-display text-2xl font-extrabold text-black">Describe your ideal phone</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md">Tell me what you need in your own words.</p>
              <div className="mt-6 grid sm:grid-cols-2 gap-3 max-w-xl w-full">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    data-testid={`chat-suggestion-${i}`}
                    onClick={() => send(s)}
                    className="text-left text-sm p-3 rounded-2xl border border-gray-100 hover:border-[#1B4EFF] hover:bg-blue-50/40 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[85%]">
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'bg-[#1B4EFF] text-white whitespace-pre-wrap' : 'bg-gray-50 text-black border border-gray-100'}`}>
                      {m.content
                        ? (m.role === 'user'
                            ? m.content
                            : <ReactMarkdown components={markdownComponents}>{m.content}</ReactMarkdown>)
                        : (streaming && i === messages.length - 1 ? (
                            <div className="flex"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>
                          ) : '')}
                    </div>
                    {m.phones?.length > 0 && (
                      <div className="fade-up mt-3 grid sm:grid-cols-2 gap-3">
                        {m.phones.map(ph => <ChatPhoneCard key={ph.id} phone={ph} />)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 p-4">
            <div className="flex items-center gap-2 bg-gray-50 rounded-full px-4 py-1 border border-gray-100 focus-within:border-[#1B4EFF] transition-colors">
              <input
                data-testid="chat-input-field"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Type your message…"
                className="flex-1 bg-transparent py-3 outline-none text-sm"
              />
              <button
                data-testid="chat-send-btn"
                onClick={() => send()}
                disabled={streaming || !input.trim()}
                className="w-10 h-10 rounded-full bg-[#1B4EFF] hover:bg-[#1428A0] disabled:bg-gray-200 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-400 text-center">Galaxy AI is powered by Gemini. Responses may vary.</div>
          </div>
        </main>
      </div>
    </div>
  );
}
