import API_URL from '../lib/api';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Paperclip, Bot, User, Quote, FileText, Layers, CheckSquare,
  Scale, BookOpen, Shield, Briefcase, MapPin, RefreshCw,
  Copy, Check, Square, Download, Pencil, GraduationCap, Loader2,
} from 'lucide-react';
import { saveDeck } from '../lib/decks';
import { saveQuiz } from '../lib/quizzes';

const ALL_PROMPTS = [
  { id: 0, text: 'Explain Section 36 of the 1999 Constitution on the right to fair hearing', icon: Scale },
  { id: 1, text: 'What are the key provisions of the Evidence Act 2011?', icon: BookOpen },
  { id: 2, text: 'What are the requirements for a valid contract under Nigerian law?', icon: CheckSquare },
  { id: 3, text: 'How does the doctrine of judicial precedent operate in Nigerian courts?', icon: FileText },
  { id: 4, text: 'What fundamental rights are guaranteed under Chapter IV of the 1999 Constitution?', icon: Shield },
  { id: 5, text: 'Summarise the key provisions of CAMA 2020 for company formation in Nigeria', icon: Briefcase },
  { id: 6, text: 'What is the constitutional role of the Attorney General of the Federation?', icon: User },
  { id: 7, text: 'Explain the Land Use Act 1978 and its effect on property ownership in Nigeria', icon: MapPin },
];

const FOLLOW_UP_REGEX = /\n{1,2}FOLLOW_UPS:\s*(.+)$/s;

const parseFollowUps = (content) => {
  const match = content.match(FOLLOW_UP_REGEX);
  if (!match) return { clean: content, followUps: [] };
  const followUps = match[1].split('|').map(q => q.trim()).filter(Boolean).slice(0, 3);
  const clean = content.slice(0, match.index).trimEnd();
  return { clean, followUps };
};

const MainChat = ({ messages, setMessages, onMessageSent, profile, activePlan, prefillMessage, onPrefillConsumed, conversationSummary, onSummaryUpdate, onTitleGenerated, sessionId, isMobile, onOpenSidebar }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [promptPage, setPromptPage] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // { msgId, label }
  const lastSummarizedLengthRef = useRef(0);
  const sessionIdRef = useRef(sessionId);
  const onTitleGeneratedRef = useRef(onTitleGenerated);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { onTitleGeneratedRef.current = onTitleGenerated; }, [onTitleGenerated]);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  useEffect(() => {
    if (prefillMessage) {
      setInput(prefillMessage);
      onPrefillConsumed?.();
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [prefillMessage]);
  const editTextareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  useEffect(() => {
    if (editingId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset summary counter on new chat or session switch
  useEffect(() => {
    lastSummarizedLengthRef.current = 0;
  }, [sessionId]);

  // Generate rolling summary of old messages every 4 new messages once conversation exceeds 8
  useEffect(() => {
    if (messages.length < 8) return;
    if (messages.length - lastSummarizedLengthRef.current < 4) return;
    if (isLoading || isStreaming) return;

    const toSummarize = messages.slice(0, messages.length - 6).map(({ role, content }) => ({ role, content }));
    lastSummarizedLengthRef.current = messages.length;

    fetch(`${API_URL}/api/chat/summarize-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: toSummarize }),
    })
      .then(r => r.json())
      .then(data => { if (data.summary) onSummaryUpdate(data.summary); })
      .catch(() => {});
  }, [messages.length, isLoading, isStreaming]);

  const hasStarted = messages.length > 0;
  const visiblePrompts = ALL_PROMPTS.slice(promptPage * 4, promptPage * 4 + 4);

  const handleCopy = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleExport = () => {
    const lines = messages.map(m =>
      `${m.role === 'user' ? 'You' : 'Gavin AI'}\n${m.content}\n`
    );
    const blob = new Blob([lines.join('\n---\n\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gavin-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doSend = async (messageText, priorMessages) => {
    if (!messageText || isLoading || isStreaming) return;

    const history = priorMessages.slice(-6).map(({ role, content }) => ({ role, content }));
    const userMsg = { id: Date.now(), role: 'user', content: messageText };
    setMessages([...priorMessages, userMsg]);
    setIsLoading(true);
    onMessageSent?.();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let aiMsgId = null;
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history,
          summary: conversationSummary || null,
          profile: profile || null,
          active_plan: activePlan ? {
            exam_type: activePlan.exam_type,
            exam_date: activePlan.exam_date,
            subjects: activePlan.subjects,
          } : null,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error(`Server responded with ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        if (aiMsgId === null) {
          aiMsgId = Date.now() + 1;
          setIsLoading(false);
          setIsStreaming(true);
          setMessages(prev => [...prev, {
            id: aiMsgId, role: 'assistant', content: accumulated, actions: false, followUps: [],
          }]);
        } else {
          const { clean } = parseFollowUps(accumulated);
          setMessages(prev => prev.map(m =>
            m.id === aiMsgId ? { ...m, content: clean } : m
          ));
        }
      }

      if (aiMsgId !== null) {
        const { clean, followUps } = parseFollowUps(accumulated);
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, content: clean, actions: true, followUps } : m
        ));

        // Generate title after first exchange, then update after second (captures topic after a greeting)
        if ((priorMessages.length === 0 || priorMessages.length === 2) && priorMessages.length === messages.length && onTitleGeneratedRef.current) {
          fetch(`${API_URL}/api/chat/title`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_message: messageText,
              ai_response: accumulated.slice(0, 600),
            }),
          })
            .then(r => r.json())
            .then(data => { if (data.title) onTitleGeneratedRef.current(data.title, sessionIdRef.current); })
            .catch(() => {});
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        if (aiMsgId !== null) {
          setMessages(prev => prev.map(m =>
            m.id === aiMsgId ? { ...m, actions: true } : m
          ));
        }
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1, role: 'assistant',
          content: "I couldn't reach the server. Please make sure the backend is running and try again.",
          actions: false, followUps: [],
        }]);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const sendMessage = (text) => {
    const messageText = (text || input).trim();
    setInput('');
    doSend(messageText, messages);
  };

  const handleRegenerate = (aiMsgId) => {
    const idx = messages.findIndex(m => m.id === aiMsgId);
    if (idx < 1) return;
    const priorMessages = messages.slice(0, idx - 1);
    const userMsg = messages[idx - 1];
    if (userMsg?.role !== 'user') return;
    doSend(userMsg.content, priorMessages);
  };

  const handleEditSubmit = (userMsgId) => {
    const draft = editDraft.trim();
    if (!draft) return;
    setEditingId(null);
    setEditDraft('');
    const idx = messages.findIndex(m => m.id === userMsgId);
    const priorMessages = messages.slice(0, idx);
    doSend(draft, priorMessages);
  };

  const handleStop = () => abortControllerRef.current?.abort();

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploading(true);
    const formData = new FormData();
    formData.append('document', file);

    try {
      const res = await fetch(`${API_URL}/api/documents/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `📎 **${file.name}** has been uploaded and indexed (${data.chunks} chunks). I've read the full document — feel free to ask me anything about it.`,
        actions: false,
        followUps: [],
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `Failed to upload **${file.name}**. Please make sure the AI service is running and try again.`,
        actions: false,
        followUps: [],
      }]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };

  const getUserPromptFor = (aiMsgId) => {
    const idx = messages.findIndex(m => m.id === aiMsgId);
    const prev = messages[idx - 1];
    return prev?.role === 'user' ? prev.content : 'Nigerian law topic';
  };

  const handleFlashcardsAction = async (aiMsg) => {
    setActionLoading({ msgId: aiMsg.id, label: 'Flashcards' });
    try {
      const topic = getUserPromptFor(aiMsg.id);
      const res = await fetch(`${API_URL}/api/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, source_text: aiMsg.content.slice(0, 8000), count: 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const cards = (data.cards || []).map((c, i) => ({
        id: `card-${i}-${Date.now()}`,
        front: c.front, back: c.back, mastered: false,
        review_count: 0, last_interval_days: 1, next_review_date: null, last_rated: null,
      }));
      const saved = await saveDeck({ title: data.title || topic.slice(0, 60), description: data.description || '', topic, cards });
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant', actions: false, followUps: [],
        content: saved
          ? `✅ **${cards.length} flashcards saved** to your Flashcards module under "${saved.title}". Open Flashcards in the sidebar to study them.`
          : '⚠️ Cards were generated but could not be saved. Please try again.',
      }]);
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', actions: false, followUps: [], content: '⚠️ Failed to generate flashcards. Make sure the AI service is running.' }]);
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateQuizAction = async (aiMsg) => {
    setActionLoading({ msgId: aiMsg.id, label: 'Generate quiz' });
    try {
      const topic = getUserPromptFor(aiMsg.id);
      const res = await fetch(`${API_URL}/api/quizzes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, source_text: aiMsg.content.slice(0, 6000), count: 5, quiz_type: 'topic' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const saved = await saveQuiz({
        title: data.title || topic.slice(0, 60),
        topic,
        quiz_type: 'topic',
        mode: 'practice',
        questions: data.questions || [],
        attempts: [],
      });
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant', actions: false, followUps: [],
        content: saved
          ? `✅ **${(data.questions || []).length}-question quiz saved** to your Quizzes module as "${saved.title}". Open Quizzes in the sidebar to take it.`
          : '⚠️ Quiz was generated but could not be saved. Please try again.',
      }]);
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', actions: false, followUps: [], content: '⚠️ Failed to generate quiz. Make sure the AI service is running.' }]);
    } finally {
      setActionLoading(null);
    }
  };

  const ACTION_BUTTONS = [
    { icon: Quote, label: 'Cite sources', prompt: 'Please cite the specific sources, sections, and case law you referenced in your previous answer.' },
    { icon: FileText, label: 'Summarize', prompt: 'Summarise your previous answer into 3–5 concise bullet points.' },
    { icon: Layers, label: 'Flashcards', prompt: 'Convert the key points from your previous answer into Q&A flashcards I can study.' },
    { icon: CheckSquare, label: 'Generate quiz', prompt: 'Generate a short multiple-choice quiz (5 questions) based on your previous answer.' },
    { icon: GraduationCap, label: 'Quiz me', prompt: 'Start an interactive quiz on the topic we just discussed. Ask me one question at a time, wait for my answer, then give feedback before moving to the next.' },
  ];

  const InputArea = (
    <div className="bg-bg-primary px-6 pb-6 pt-3">
      <div className="max-w-3xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="bg-bg-secondary rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-all focus-within:shadow-[0_2px_16px_rgba(0,0,0,0.12)]"
        >
          <div className="px-4 pt-4 pb-2">
            <textarea
              ref={textareaRef}
              rows={1}
              maxLength={2000}
              placeholder="Ask about Nigerian law, or paste an essay to grade…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-text-primary text-[15px] outline-none placeholder:text-text-tertiary resize-none leading-relaxed overflow-y-auto min-h-[44px] max-h-[200px]"
            />
          </div>
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 text-text-tertiary hover:text-text-primary text-[12px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Paperclip size={13} />
                {isUploading ? 'Uploading…' : 'Attach file'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-text-tertiary tabular-nums">{input.length}/2000</span>
              {isStreaming ? (
                <button type="button" onClick={handleStop}
                  className="w-9 h-9 rounded-full bg-accent-primary hover:bg-accent-hover text-white flex items-center justify-center transition-all shadow-md shadow-accent-primary/30"
                  title="Stop generating">
                  <Square size={12} fill="currentColor" />
                </button>
              ) : (
                <button type="submit" disabled={!input.trim() || isLoading}
                  className="w-9 h-9 rounded-full bg-accent-primary hover:bg-accent-hover disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-md shadow-accent-primary/30 disabled:cursor-not-allowed">
                  <Send size={14} />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  if (!hasStarted) {
    return (
      <div className="flex flex-col h-full">
        {isMobile && (
          <div className="h-[52px] border-b border-border flex items-center gap-3 px-4 bg-bg-primary shrink-0">
            <button onClick={onOpenSidebar}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span className="text-[14px] font-semibold text-text-primary">Gavin AI</span>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8">
            <h1 className="font-display text-[1.8rem] sm:text-[2.4rem] lg:text-[2.8rem] leading-snug text-text-primary mb-2">
              Hi there, {profile?.full_name?.split(' ')[0] || 'Counsellor'}
            </h1>
            <h1 className="font-display text-[1.8rem] sm:text-[2.4rem] lg:text-[2.8rem] leading-snug text-text-secondary">
              What would you like to know?
            </h1>
          </div>
        </div>
        {InputArea}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <header className="h-[70px] border-b border-border flex items-center justify-between px-4 sm:px-6 bg-bg-primary/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button onClick={onOpenSidebar}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary shrink-0">
            <Bot size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Gavin Chat</h2>
            <p className="text-[10px] text-text-tertiary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full inline-block" />
              Nigerian Law Study Companion
            </p>
          </div>
        </div>
        <button onClick={handleExport} title="Export conversation"
          className="flex items-center gap-1.5 text-text-tertiary hover:text-text-primary text-[12px] transition-colors px-3 py-1.5 rounded-lg hover:bg-bg-secondary">
          <Download size={14} /> Export
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          {messages.map((msg, idx) => (
            <div key={msg.id} className={`flex flex-col gap-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse max-w-[80%]' : 'flex-row w-full'}`}>

                {/* Avatar — only show for assistant */}
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center shrink-0 text-accent-primary mt-0.5">
                    <Bot size={17} />
                  </div>
                )}

                <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start w-full'}`}>

                  {/* User bubble */}
                  {msg.role === 'user' && (
                    editingId === msg.id ? (
                      <div className="flex flex-col gap-2 w-full min-w-[260px]">
                        <textarea
                          ref={editTextareaRef}
                          value={editDraft}
                          onChange={e => setEditDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(msg.id); }
                            if (e.key === 'Escape') { setEditingId(null); setEditDraft(''); }
                          }}
                          className="w-full bg-bg-secondary border border-accent-primary/40 rounded-xl px-3 py-2.5 text-[14.5px] text-text-primary outline-none resize-none leading-relaxed"
                          rows={3}
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setEditingId(null); setEditDraft(''); }}
                            className="text-[12px] text-text-secondary hover:text-text-primary px-3 py-1 rounded-lg transition-colors">
                            Cancel
                          </button>
                          <button onClick={() => handleEditSubmit(msg.id)}
                            className="text-[12px] bg-accent-primary text-white px-3 py-1 rounded-lg hover:bg-accent-hover transition-colors">
                            Resend
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="group/bubble relative px-4 py-3 rounded-2xl bg-bg-secondary border border-border text-text-primary text-[14.5px] leading-relaxed">
                        <p>{msg.content}</p>
                        <button
                          onClick={() => { setEditingId(msg.id); setEditDraft(msg.content); }}
                          className="absolute -left-7 top-1/2 -translate-y-1/2 p-1 rounded-lg text-text-tertiary hover:text-accent-primary opacity-0 group-hover/bubble:opacity-100 transition-all"
                          title="Edit message">
                          <Pencil size={13} />
                        </button>
                      </div>
                    )
                  )}

                  {/* Assistant response — no bubble, plain text */}
                  {msg.role === 'assistant' && (
                    <div className="text-[14.5px] leading-relaxed text-text-primary w-full">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                        p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2.5 flex flex-col gap-1">{children}</ol>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2.5 flex flex-col gap-1">{children}</ul>,
                        li: ({ children }) => <li className="text-[14.5px]">{children}</li>,
                        h1: ({ children }) => <h1 className="font-semibold text-base mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="font-semibold text-[15px] mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="font-medium text-[14.5px] mb-1.5">{children}</h3>,
                        code: ({ children }) => <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-[13px] font-mono">{children}</code>,
                      }}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Assistant action bar — icons only, label on hover */}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 mt-1">
                      <button onClick={() => handleCopy(msg.id, msg.content)}
                        title={copiedId === msg.id ? 'Copied!' : 'Copy'}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all">
                        {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>

                      <button onClick={() => handleRegenerate(msg.id)}
                        disabled={isLoading || isStreaming}
                        title="Regenerate"
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                        <RefreshCw size={14} />
                      </button>

                      {msg.actions && ACTION_BUTTONS.map(({ icon: Icon, label, prompt }) => {
                        const isThisLoading = actionLoading?.msgId === msg.id && actionLoading?.label === label;
                        return (
                          <button key={label}
                            onClick={() => {
                              if (label === 'Flashcards') handleFlashcardsAction(msg);
                              else if (label === 'Generate quiz') handleGenerateQuizAction(msg);
                              else sendMessage(prompt);
                            }}
                            disabled={isLoading || isStreaming || !!actionLoading}
                            title={label}
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                            {isThisLoading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center shrink-0 text-accent-primary mt-0.5">
                <Bot size={17} />
              </div>
              <div className="flex items-center gap-1.5 pt-2">
                {[0, 150, 300].map(delay => (
                  <span key={delay} className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {InputArea}
    </div>
  );
};

export default MainChat;
