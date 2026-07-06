import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, XCircle, ArrowRight, RotateCcw, Trophy } from 'lucide-react';

const quizData = [
  {
    id: 1,
    question: 'Under the 1999 Constitution of Nigeria, who has the power to proclaim a state of emergency?',
    options: ['The Chief Justice of Nigeria', 'The President of the Senate', 'The President of the Federal Republic', 'The Attorney General of the Federation'],
    correct: 2,
    explanation: 'Section 305(1) of the 1999 Constitution vests the power to issue a proclamation of a state of emergency in the President of the Federal Republic of Nigeria.',
  },
  {
    id: 2,
    question: 'Which section of the 1999 Constitution guarantees the right to life?',
    options: ['Section 31', 'Section 33', 'Section 35', 'Section 37'],
    correct: 1,
    explanation: 'Section 33 of the 1999 Constitution provides that every person has a right to life, and no one shall be deprived of his life intentionally, save in execution of a court sentence.',
  },
  {
    id: 3,
    question: 'In Nigerian contract law, what is the effect of a contract entered into by a minor?',
    options: [
      'It is always void',
      'It is voidable at the option of the minor',
      'It is valid and enforceable in all cases',
      'It is void unless ratified by a guardian',
    ],
    correct: 1,
    explanation: 'Under Nigerian law, contracts entered into by minors are generally voidable at the option of the minor, except for contracts for necessaries which are binding.',
  },
  {
    id: 4,
    question: 'What is the principal legislation governing land ownership in Nigeria?',
    options: ['Property and Conveyancing Act', 'Land Use Act 1978', 'Real Property Act 1925', 'Nigerian Land Code'],
    correct: 1,
    explanation: 'The Land Use Act 1978 is the principal legislation governing land tenure in Nigeria. It vests all land in each state in the Governor, who holds it in trust for the people.',
  },
  {
    id: 5,
    question: 'Which court has original jurisdiction in disputes between the Federation and a State?',
    options: ['Federal High Court', 'Court of Appeal', 'Supreme Court', 'National Industrial Court'],
    correct: 2,
    explanation: 'Under Section 232(1) of the 1999 Constitution, the Supreme Court has original jurisdiction in disputes between the Federation and a State, or between States.',
  },
];

const QuizModule = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30);

  const question = quizData[currentQuestion];
  const total = quizData.length;

  // Timer logic
  useEffect(() => {
    if (!timerEnabled || isAnswered || isComplete) return;
    if (timeLeft <= 0) {
      handleSubmitAnswer();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, timerEnabled, isAnswered, isComplete]);

  const handleSelectAnswer = (index) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
  };

  const handleSubmitAnswer = useCallback(() => {
    if (isAnswered) return;
    setIsAnswered(true);
    const isCorrect = selectedAnswer === question.correct;
    if (isCorrect) setScore((s) => s + 1);
    setAnswers((prev) => [...prev, { questionId: question.id, selected: selectedAnswer, correct: question.correct, isCorrect }]);
  }, [isAnswered, selectedAnswer, question]);

  const handleNext = () => {
    if (currentQuestion + 1 >= total) {
      setIsComplete(true);
    } else {
      setCurrentQuestion((q) => q + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setTimeLeft(30);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setAnswers([]);
    setIsComplete(false);
    setTimeLeft(30);
  };

  // Results Screen
  if (isComplete) {
    const percentage = Math.round((score / total) * 100);
    return (
      <div className="flex flex-col h-full bg-bg-primary items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${percentage >= 70 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
            <Trophy size={36} />
          </div>
          <h1 className="text-3xl font-bold font-heading mb-2">Quiz Complete!</h1>
          <p className="text-text-secondary mb-8">Constitutional Law Quiz</p>

          <div className="bg-bg-secondary border border-border rounded-2xl p-6 mb-6">
            <div className="text-5xl font-bold font-heading mb-2">{percentage}%</div>
            <p className="text-text-secondary text-sm">{score} of {total} correct</p>

            <div className="w-full h-2 bg-bg-tertiary rounded-full mt-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${percentage >= 70 ? 'bg-success' : 'bg-warning'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Per-question breakdown */}
          <div className="bg-bg-secondary border border-border rounded-xl p-4 mb-6">
            <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3">Question Breakdown</h3>
            <div className="flex flex-col gap-2">
              {answers.map((a, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  {a.isCorrect ? (
                    <CheckCircle size={16} className="text-success shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-error shrink-0" />
                  )}
                  <span className="text-text-secondary truncate text-left">Q{i + 1}: {quizData[i].question.substring(0, 50)}...</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleRestart}
            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-accent-primary hover:bg-accent-hover text-white font-medium transition-all text-sm"
          >
            <RotateCcw size={16} />
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <header className="h-[70px] border-b border-border flex items-center justify-between px-6 shrink-0">
        <div>
          <h1 className="text-xl font-bold font-heading">Constitutional Law Quiz</h1>
          <p className="text-xs text-text-tertiary mt-0.5">Question {currentQuestion + 1} of {total}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Timer Toggle */}
          <button
            onClick={() => setTimerEnabled(!timerEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              timerEnabled
                ? 'border-accent-primary/30 bg-accent-primary/10 text-accent-primary'
                : 'border-border text-text-tertiary'
            }`}
          >
            <Clock size={13} />
            Timer {timerEnabled ? 'ON' : 'OFF'}
          </button>
          {/* Timer Display */}
          {timerEnabled && (
            <div className={`text-lg font-mono font-bold ${timeLeft <= 10 ? 'text-error' : 'text-text-secondary'}`}>
              0:{timeLeft.toString().padStart(2, '0')}
            </div>
          )}
        </div>
      </header>

      {/* Progress */}
      <div className="px-6 pt-4">
        <div className="w-full h-1 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-primary rounded-full transition-all duration-500"
            style={{ width: `${((currentQuestion + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex items-start justify-center overflow-y-auto px-6 py-8">
        <div className="max-w-2xl w-full">
          <p className="text-lg font-medium mb-8 leading-relaxed">{question.question}</p>

          <div className="flex flex-col gap-3">
            {question.options.map((option, i) => {
              let style = 'border-border hover:border-border-hover hover:bg-bg-tertiary/50';
              if (isAnswered) {
                if (i === question.correct) {
                  style = 'border-success/50 bg-success/5 text-success';
                } else if (i === selectedAnswer && i !== question.correct) {
                  style = 'border-error/50 bg-error/5 text-error';
                } else {
                  style = 'border-border opacity-50';
                }
              } else if (selectedAnswer === i) {
                style = 'border-accent-primary bg-accent-primary/5';
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelectAnswer(i)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4 ${style}`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    isAnswered && i === question.correct
                      ? 'bg-success/20 text-success'
                      : isAnswered && i === selectedAnswer
                      ? 'bg-error/20 text-error'
                      : selectedAnswer === i
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'bg-bg-tertiary text-text-secondary'
                  }`}>
                    {isAnswered && i === question.correct ? (
                      <CheckCircle size={16} />
                    ) : isAnswered && i === selectedAnswer ? (
                      <XCircle size={16} />
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </span>
                  <span className="text-sm">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {isAnswered && (
            <div className="mt-6 bg-bg-secondary border border-border rounded-xl p-4">
              <h4 className="text-xs font-bold text-accent-primary uppercase tracking-wider mb-2">Explanation</h4>
              <p className="text-sm text-text-secondary leading-relaxed">{question.explanation}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-xs text-text-tertiary">Score: {score}/{currentQuestion + (isAnswered ? 1 : 0)}</span>
          {!isAnswered ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === null}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-primary hover:bg-accent-hover disabled:bg-bg-tertiary disabled:text-text-tertiary text-white font-medium transition-all text-sm disabled:cursor-not-allowed"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-primary hover:bg-accent-hover text-white font-medium transition-all text-sm"
            >
              {currentQuestion + 1 >= total ? 'See Results' : 'Next Question'}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizModule;
