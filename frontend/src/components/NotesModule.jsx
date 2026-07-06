import React, { useState } from 'react';
import { Upload, FileText, Sparkles, Layers, CheckSquare, Trash2, Search, Filter } from 'lucide-react';

const sampleNotes = [
  { id: 1, title: 'Constitutional Law — Chapter 4: Fundamental Rights', type: 'PDF', pages: 24, date: '2026-04-20', size: '2.4 MB' },
  { id: 2, title: 'Contract Law: Offer, Acceptance & Consideration', type: 'PDF', pages: 18, date: '2026-04-18', size: '1.8 MB' },
  { id: 3, title: 'Criminal Law — Elements of Offences', type: 'TXT', pages: 12, date: '2026-04-15', size: '340 KB' },
  { id: 4, title: 'Tort Law — Negligence & Duty of Care', type: 'PDF', pages: 30, date: '2026-04-12', size: '3.1 MB' },
  { id: 5, title: 'Property Law — Land Use Act 1978', type: 'PDF', pages: 15, date: '2026-04-10', size: '1.2 MB' },
];

const NotesModule = () => {
  const [notes] = useState(sampleNotes);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <header className="h-[70px] border-b border-border flex items-center justify-between px-6 shrink-0">
        <div>
          <h1 className="text-xl font-bold font-heading">Study Notes</h1>
          <p className="text-xs text-text-tertiary mt-0.5">{notes.length} documents uploaded</p>
        </div>
        <button className="bg-accent-primary hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 text-sm">
          <Upload size={16} />
          Upload Notes
        </button>
      </header>

      {/* Search Bar */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center gap-2 bg-bg-secondary border border-border rounded-lg px-3 py-2.5 focus-within:border-accent-primary/50 transition-colors">
          <Search size={16} className="text-text-tertiary shrink-0" />
          <input
            type="text"
            placeholder="Search your notes..."
            className="bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-tertiary flex-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="text-text-tertiary hover:text-text-secondary">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="flex flex-col gap-2">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(selectedNote === note.id ? null : note.id)}
              className={`bg-bg-secondary border rounded-xl p-4 cursor-pointer transition-all ${
                selectedNote === note.id
                  ? 'border-accent-primary/40 ring-1 ring-accent-primary/10'
                  : 'border-border hover:border-border-hover'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary shrink-0 mt-0.5">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate">{note.title}</h3>
                    <p className="text-xs text-text-tertiary mt-1">
                      {note.type} • {note.pages} pages • {note.size} • {note.date}
                    </p>
                  </div>
                </div>
                <button className="text-text-tertiary hover:text-error shrink-0 p-1">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Expanded Actions */}
              {selectedNote === note.id && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-primary/10 text-accent-primary text-xs font-medium hover:bg-accent-primary/20 transition-colors">
                    <Sparkles size={14} />
                    Summarize with AI
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-secondary/10 text-accent-secondary text-xs font-medium hover:bg-accent-secondary/20 transition-colors">
                    <Layers size={14} />
                    Generate Flashcards
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 text-warning text-xs font-medium hover:bg-warning/20 transition-colors">
                    <CheckSquare size={14} />
                    Generate Quiz
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-bg-tertiary rounded-full flex items-center justify-center mb-4">
              <FileText size={28} className="text-text-tertiary" />
            </div>
            <p className="text-text-secondary font-medium">No notes found</p>
            <p className="text-xs text-text-tertiary mt-1">Try a different search term or upload new notes.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesModule;
