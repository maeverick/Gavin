import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, X, RotateCcw, Shuffle, BookOpen } from 'lucide-react';

const sampleCards = [
  {
    id: 1,
    front: 'What is the doctrine of precedent (stare decisis) in Nigerian law?',
    back: 'The doctrine of precedent (stare decisis) requires courts to follow the legal principles established by higher courts in earlier cases. In Nigeria, Supreme Court decisions bind all lower courts, while Court of Appeal decisions bind High Courts and lower courts.',
    topic: 'Legal System',
  },
  {
    id: 2,
    front: 'Define "Fundamental Rights" under the 1999 Constitution.',
    back: 'Fundamental Rights are enshrined in Chapter IV (Sections 33–46) of the 1999 Constitution. They include the right to life, dignity of human person, personal liberty, fair hearing, private and family life, freedom of thought, conscience and religion, freedom of expression, and freedom of movement.',
    topic: 'Constitutional Law',
  },
  {
    id: 3,
    front: 'What are the essential elements of a valid contract in Nigerian law?',
    back: 'A valid contract in Nigerian law requires: (1) Offer, (2) Acceptance, (3) Consideration, (4) Intention to create legal relations, (5) Capacity of the parties, and (6) Legality of the object. These principles derive from English common law as received into Nigerian law.',
    topic: 'Contract Law',
  },
  {
    id: 4,
    front: 'Explain the concept of "mens rea" in Nigerian criminal law.',
    back: 'Mens rea refers to the "guilty mind" or criminal intent required for the commission of a crime. Under the Criminal Code (Southern Nigeria) and the Penal Code (Northern Nigeria), most offences require proof of mens rea alongside actus reus (the physical act). Strict liability offences are exceptions.',
    topic: 'Criminal Law',
  },
  {
    id: 5,
    front: 'What is the effect of the Land Use Act 1978?',
    back: 'The Land Use Act 1978 vests all land in each state in the Governor, who holds it in trust for the people. It introduced the statutory right of occupancy (granted by the Governor) and customary right of occupancy (granted by local government). The Act is incorporated into the 1999 Constitution (Section 315).',
    topic: 'Property Law',
  },
];

const FlashcardModule = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [known, setKnown] = useState(new Set());
  const [unknown, setUnknown] = useState(new Set());

  const card = sampleCards[currentIndex];
  const total = sampleCards.length;

  const goNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const goPrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const markKnown = () => {
    setKnown((prev) => new Set(prev).add(card.id));
    unknown.delete(card.id);
    goNext();
  };

  const markUnknown = () => {
    setUnknown((prev) => new Set(prev).add(card.id));
    known.delete(card.id);
    goNext();
  };

  const resetProgress = () => {
    setKnown(new Set());
    setUnknown(new Set());
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <header className="h-[70px] border-b border-border flex items-center justify-between px-6 shrink-0">
        <div>
          <h1 className="text-xl font-bold font-heading">Flashcards</h1>
          <p className="text-xs text-text-tertiary mt-0.5">Card {currentIndex + 1} of {total} • {card.topic}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetProgress}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-tertiary text-xs font-medium transition-colors"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-text-secondary hover:bg-bg-tertiary text-xs font-medium transition-colors">
            <Shuffle size={14} />
            Shuffle
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="px-6 pt-5">
        <div className="flex items-center justify-between text-xs text-text-tertiary mb-2">
          <span>{known.size} known</span>
          <span>{unknown.size} to review</span>
        </div>
        <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden flex">
          <div
            className="h-full bg-success rounded-full transition-all duration-500"
            style={{ width: `${(known.size / total) * 100}%` }}
          />
          <div
            className="h-full bg-error rounded-full transition-all duration-500"
            style={{ width: `${(unknown.size / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl" style={{ perspective: '1200px' }}>
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative w-full cursor-pointer"
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front */}
            <div
              className="w-full min-h-[280px] bg-bg-secondary border border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="px-3 py-1 rounded-full bg-accent-primary/10 text-accent-primary text-[10px] font-bold uppercase tracking-wider mb-6">
                Question
              </div>
              <p className="text-xl font-medium leading-relaxed max-w-lg">{card.front}</p>
              <p className="text-xs text-text-tertiary mt-8">Click to reveal answer</p>
            </div>

            {/* Back */}
            <div
              className="w-full min-h-[280px] bg-bg-secondary border border-accent-primary/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center absolute top-0 left-0"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="px-3 py-1 rounded-full bg-accent-secondary/10 text-accent-secondary text-[10px] font-bold uppercase tracking-wider mb-6">
                Answer
              </div>
              <p className="text-base leading-relaxed max-w-lg text-text-secondary">{card.back}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 pb-8">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={goPrev}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:bg-bg-tertiary transition-colors text-sm"
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={markUnknown}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors text-sm font-medium"
            >
              <X size={16} />
              Don't Know
            </button>
            <button
              onClick={markKnown}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors text-sm font-medium"
            >
              <Check size={16} />
              Know It
            </button>
          </div>

          <button
            onClick={goNext}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-text-secondary hover:bg-bg-tertiary transition-colors text-sm"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardModule;
