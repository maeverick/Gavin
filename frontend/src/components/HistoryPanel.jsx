import { useState, useRef, useEffect } from 'react';
import { Plus, MoreHorizontal, Trash2, MessageSquare, Pencil, Search, X } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

const HistoryPanel = ({
  sessions = [],
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
}) => {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const sorted = [...sessions].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const trimmedQuery = query.trim().toLowerCase();
  const filtered = trimmedQuery
    ? sorted.filter(s =>
        (s.title || '').toLowerCase().includes(trimmedQuery) ||
        (s.preview || '').toLowerCase().includes(trimmedQuery)
      )
    : sorted;

  const startEditing = (session) => {
    setEditingId(session.id);
    setDraftTitle(session.title);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const next = draftTitle.trim();
    if (next && onRenameSession) {
      onRenameSession(editingId, next);
    }
    setEditingId(null);
    setDraftTitle('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftTitle('');
  };

  return (
    <>
    <aside className="w-[260px] shrink-0 bg-bg-secondary border-l border-border flex flex-col h-screen">
      <div className="flex items-center justify-between px-4 h-[70px] border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Recent Sessions</h3>
          <p className="text-[10px] text-text-tertiary">
            {sorted.length} {sorted.length === 1 ? 'conversation' : 'conversations'}
          </p>
        </div>
        <button className="text-text-tertiary hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors">
          <MoreHorizontal size={16} />
        </button>
      </div>

      <div className="px-3 pt-3">
        <button onClick={onNewChat} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-dashed border-border text-text-secondary hover:border-accent-primary hover:text-accent-primary transition-all text-[13px]">
          <Plus size={14} />
          <span>New Chat</span>
        </button>
      </div>

      {sorted.length > 0 && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-bg-primary border border-border rounded-lg pl-8 pr-8 py-2 text-[12px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent-primary/40 transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-tertiary hover:text-text-primary"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-4 flex flex-col gap-0.5">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center text-text-tertiary mb-3">
              <MessageSquare size={18} />
            </div>
            <p className="text-[12px] text-text-tertiary leading-relaxed">
              Your conversations will appear here once you start chatting with Gavin.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-[12px] text-text-tertiary px-3 py-4 text-center leading-relaxed">
            No conversations match "{query}".
          </p>
        ) : (
          filtered.map((session) => {
            const isActive = session.id === activeSessionId;
            const isEditing = editingId === session.id;
            return (
              <div
                key={session.id}
                className={`group relative rounded-xl transition-colors ${
                  isActive ? 'bg-bg-tertiary' : 'hover:bg-bg-tertiary'
                }`}
              >
                {isEditing ? (
                  <div className="px-3 py-3 pr-3">
                    <input
                      ref={editInputRef}
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitEdit();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelEdit();
                        }
                      }}
                      className="w-full bg-bg-primary border border-accent-primary/40 rounded-md px-2 py-1 text-[13px] text-text-primary outline-none mb-1"
                    />
                    <p className="text-[11px] text-text-tertiary truncate leading-relaxed">
                      {session.preview || 'No reply yet…'}
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onSelectSession(session.id)}
                      className="w-full text-left px-3 py-3 pr-16"
                    >
                      <p className={`text-[13px] font-medium truncate mb-1 transition-colors ${
                        isActive ? 'text-accent-primary' : 'text-text-primary group-hover:text-accent-primary'
                      }`}>
                        {session.title}
                      </p>
                      <p className="text-[11px] text-text-tertiary truncate leading-relaxed">
                        {session.preview || 'No reply yet…'}
                      </p>
                    </button>
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(session);
                        }}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-primary hover:bg-bg-primary transition-colors"
                        title="Rename chat"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(session.id);
                        }}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-error hover:bg-bg-primary transition-colors"
                        title="Delete chat"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>

    {confirmDeleteId && (
      <ConfirmModal
        title="Delete conversation?"
        message="This conversation will be permanently deleted and cannot be recovered."
        confirmLabel="Delete"
        onConfirm={() => { onDeleteSession(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    )}
  </>
  );
};

export default HistoryPanel;
