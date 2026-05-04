
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Play, RotateCw, CheckCircle2, XCircle, Brain, Library, Trash2, Edit2, Image as ImageIcon, X, Upload, Layout, FileUp, Settings, Sliders, BarChart3, Clock, HelpCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Deck, Flashcard, DeckSettings, FlashcardState, StudyLog } from '../types';
import { generateId, compressImage } from '../utils';
import { marked } from 'marked';
import { MarkdownEditor } from './MarkdownEditor';
import { motion, AnimatePresence } from 'framer-motion';

interface FlashcardAppProps {
  decks: Deck[];
  setDecks: React.Dispatch<React.SetStateAction<Deck[]>>;
  cards: Flashcard[];
  setCards: React.Dispatch<React.SetStateAction<Flashcard[]>>;
  studyHistory: StudyLog[];
  setStudyHistory: React.Dispatch<React.SetStateAction<StudyLog[]>>;
}

const DEFAULT_SETTINGS: DeckSettings = {
  newCardsPerDay: 20,
  reviewLimitPerDay: 200,
  learningSteps: [1, 10], // 1 min, 10 min
  graduatingInterval: 1, // 1 day
  easyBonus: 1.3
};

const FlashcardApp: React.FC<FlashcardAppProps> = ({ decks, setDecks, cards, setCards, studyHistory, setStudyHistory }) => {
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [studyMode, setStudyMode] = useState(false);
  
  const [studyQueue, setStudyQueue] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ front: '', back: '', frontImage: '', backImage: '' });
  const [newDeckName, setNewDeckName] = useState('');
  
  const [tempSettings, setTempSettings] = useState<DeckSettings>(DEFAULT_SETTINGS);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editDeckName, setEditDeckName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (decks.length > 0 && !activeDeckId) {
        setActiveDeckId(decks[0].id);
    } else if (activeDeckId && !decks.find(d => d.id === activeDeckId)) {
        setActiveDeckId(decks.length > 0 ? decks[0].id : null);
    }
  }, [decks, activeDeckId]);

  useEffect(() => {
    const updatedDecks = decks.map(d => {
        if (!d.settings) return { ...d, settings: DEFAULT_SETTINGS };
        return d;
    });
    if (JSON.stringify(updatedDecks) !== JSON.stringify(decks)) {
        setDecks(updatedDecks);
    }
  }, []);

  useEffect(() => {
      const updatedCards = cards.map(c => {
          if (!c.state) return { ...c, state: 'new' as FlashcardState, lapses: 0 };
          return c;
      });
       if (JSON.stringify(updatedCards) !== JSON.stringify(cards)) {
        setCards(updatedCards);
    }
  }, []);


  const renderMarkdown = (text: string, isFlipped: boolean = false) => {
    try {
        let processedText = text;
        
        const clozeRegex = /{{c(\d+)::(.*?)}}/g;
        if (!isFlipped) {
            processedText = text.replace(clozeRegex, '<span class="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200 rounded-sm font-mono text-sm border border-zinc-200 dark:border-zinc-800">[...]</span>');
        } else {
            processedText = text.replace(clozeRegex, '<span class="px-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 rounded-sm border-b-2 border-yellow-400 dark:border-yellow-600">$2</span>');
        }

        return { __html: marked.parse(processedText) as string };
    } catch {
        return { __html: text };
    }
  };

  const getActiveDeck = () => decks.find(d => d.id === activeDeckId);


  const formatInterval = (minutes: number, isDays: boolean = false): string => {
      if (isDays) {
          if (minutes >= 365) return `${(minutes / 365).toFixed(1)}y`;
          if (minutes >= 30) return `${(minutes / 30).toFixed(1)}mo`;
          return `${Math.round(minutes)}d`;
      }
      if (minutes < 1) return '<1m';
      if (minutes < 60) return `${Math.round(minutes)}m`;
      if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
      return `${Math.round(minutes / 1440)}d`;
  };

  const calculateNextState = (card: Flashcard, rating: 'again' | 'hard' | 'good' | 'easy', settings: DeckSettings) => {
    let nextInterval = card.interval; // min for learning, days for review
    let nextEase = card.easeFactor;
    let nextState = card.state;

    if (card.state === 'new' || card.state === 'learning' || card.state === 'relearning') {
        const steps = settings.learningSteps;
        let currentStepIndex = steps.indexOf(card.interval);
        if (currentStepIndex === -1) currentStepIndex = 0; // Default to first step if lost

        if (rating === 'again') {
            nextInterval = steps[0];
            nextState = 'learning';
        } else if (rating === 'hard') {
             nextInterval = card.interval; 
        } else if (rating === 'good') {
            if (currentStepIndex < steps.length - 1) {
                nextInterval = steps[currentStepIndex + 1];
                nextState = 'learning';
            } else {
                nextInterval = settings.graduatingInterval; // Graduate to days
                nextState = 'review';
            }
        } else if (rating === 'easy') {
            nextInterval = settings.graduatingInterval * settings.easyBonus; // Graduate with bonus
            nextState = 'review';
        }
    } 
    else {
        if (rating === 'again') {
            nextState = 'relearning';
            nextInterval = settings.learningSteps[0];
            nextEase = Math.max(1.3, nextEase - 0.2);
        } else if (rating === 'hard') {
            nextInterval = Math.max(1, card.interval * 1.2); // Hard penalty is smaller interval growth
            nextEase = Math.max(1.3, nextEase - 0.15);
        } else if (rating === 'good') {
            nextInterval = Math.ceil(card.interval * card.easeFactor);
        } else if (rating === 'easy') {
            nextInterval = Math.ceil(card.interval * card.easeFactor * settings.easyBonus);
            nextEase += 0.15;
        }
    }

    return { nextInterval, nextEase, nextState };
  };

  const handleRateCard = (rating: 'again' | 'hard' | 'good' | 'easy') => {
      const card = studyQueue[currentCardIndex];
      const settings = getActiveDeck()?.settings || DEFAULT_SETTINGS;
      const { nextInterval, nextEase, nextState } = calculateNextState(card, rating, settings);
      
      const isReview = nextState === 'review';
      const nextReviewTime = Date.now() + (isReview ? nextInterval * 24 * 60 * 60 * 1000 : nextInterval * 60 * 1000);

      const updatedCard: Flashcard = {
          ...card,
          state: nextState,
          interval: nextInterval,
          easeFactor: nextEase,
          nextReview: nextReviewTime,
          repetitions: card.repetitions + 1,
          lapses: rating === 'again' && card.state === 'review' ? card.lapses + 1 : card.lapses
      };

      setCards(prev => prev.map(c => c.id === card.id ? updatedCard : c));
      
      const today = new Date().toISOString().split('T')[0];
      setStudyHistory(prev => {
          const existing = prev.find(l => l.date === today);
          if (existing) {
              return prev.map(l => l.date === today ? { ...l, count: l.count + 1 } : l);
          }
          return [...prev, { date: today, count: 1 }];
      });

      if (!isReview && nextInterval <= 10) {
           setStudyQueue(prev => [...prev, updatedCard]);
      }

      setIsFlipped(false);
      setCurrentCardIndex(prev => prev + 1);

      if (currentCardIndex >= studyQueue.length - 1 && (!(!isReview && nextInterval <= 10))) {
      }
  };

  useEffect(() => {
    if (!studyMode || !isFlipped) return;
    const handleKey = (e: KeyboardEvent) => {
        if (e.key === '1') handleRateCard('again');
        if (e.key === '2') handleRateCard('hard');
        if (e.key === '3') handleRateCard('good');
        if (e.key === '4') handleRateCard('easy');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [studyMode, isFlipped, currentCardIndex, studyQueue]); // Dependencies critical for closure

  useEffect(() => {
    if (!studyMode) return;
    const handleFlipKey = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !isFlipped) {
            e.preventDefault(); // Prevent scroll
            setIsFlipped(true);
        }
    };
    window.addEventListener('keydown', handleFlipKey);
    return () => window.removeEventListener('keydown', handleFlipKey);
  }, [studyMode, isFlipped]);



  const startStudy = () => {
    if (!activeDeckId) return;
    const deckCards = cards.filter(c => c.deckId === activeDeckId);
    const settings = getActiveDeck()?.settings || DEFAULT_SETTINGS;
    const now = Date.now();

    const newCards = deckCards
        .filter(c => c.state === 'new')
        .slice(0, settings.newCardsPerDay);

    const dueReviews = deckCards
        .filter(c => c.state !== 'new' && c.nextReview <= now)
        .sort((a,b) => a.nextReview - b.nextReview)
        .slice(0, settings.reviewLimitPerDay);

    const learningCards = deckCards.filter(c => (c.state === 'learning' || c.state === 'relearning') && c.nextReview <= now);

    const queue = [...learningCards, ...dueReviews, ...newCards];
    
    if (queue.length === 0) {
        alert("Congratulations! You have finished this deck for now.");
        return;
    }

    setStudyQueue(queue);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setStudyMode(true);
  };

  
  const handleSaveSettings = (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeDeckId) return;
      setDecks(decks.map(d => d.id === activeDeckId ? { ...d, settings: tempSettings } : d));
      setIsSettingsModalOpen(false);
  };

  const openSettings = () => {
      const deck = getActiveDeck();
      if (deck && deck.settings) {
          setTempSettings(deck.settings);
      } else {
          setTempSettings(DEFAULT_SETTINGS);
      }
      setIsSettingsModalOpen(true);
  };

  const handleCreateDeck = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newDeckName.trim()) return;
      setDecks([...decks, { id: generateId(), name: newDeckName, settings: DEFAULT_SETTINGS }]);
      setIsDeckModalOpen(false);
  };

  const deleteDeck = (id: string) => {
      if(confirm('Delete deck?')) {
          setDecks(decks.filter(d => d.id !== id));
          setCards(cards.filter(c => c.deckId !== id));
          if(activeDeckId === id) setActiveDeckId(null);
      }
  };

  const handleRenameDeck = () => {
    if (activeDeckId && editDeckName.trim()) {
      setDecks(decks.map(d => d.id === activeDeckId ? { ...d, name: editDeckName.trim() } : d));
      setEditingDeckId(null);
    }
  };

  const saveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeckId) return;
    if (editingCardId) {
        setCards(cards.map(c => c.id === editingCardId ? { ...c, ...formData } : c));
    } else {
        const newCard: Flashcard = {
            id: generateId(),
            deckId: activeDeckId,
            front: formData.front,
            back: formData.back,
            frontImage: formData.frontImage,
            backImage: formData.backImage,
            nextReview: Date.now(),
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            state: 'new',
            lapses: 0
        };
        setCards([...cards, newCard]);
    }
    setIsCardModalOpen(false);
    setEditingCardId(null);
    setFormData({ front: '', back: '', frontImage: '', backImage: '' });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'frontImage' | 'backImage') => {
      const file = e.target.files?.[0];
      if (file) {
          try {
            const compressed = await compressImage(file);
            setFormData(prev => ({ ...prev, [field]: compressed }));
          } catch (err) { alert("Error uploading image"); }
      }
  };

  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {  };

  const deckStats = useMemo(() => {
      if (!activeDeckId) return { new: 0, learning: 0, review: 0 };
      const dCards = cards.filter(c => c.deckId === activeDeckId);
      const now = Date.now();
      return {
          new: dCards.filter(c => c.state === 'new').length,
          learning: dCards.filter(c => (c.state === 'learning' || c.state === 'relearning')).length,
          review: dCards.filter(c => c.state === 'review' && c.nextReview <= now).length,
      };
  }, [cards, activeDeckId]);


  if (studyMode) {
      const currentCard = studyQueue[currentCardIndex];
      const settings = getActiveDeck()?.settings || DEFAULT_SETTINGS;

      if (!currentCard) {
          return (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in zoom-in-95">
                  <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-sm flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
                      <CheckCircle2 size={48} />
                  </div>
                  <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2 font-serif tracking-tight">Session Complete!</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md">
                      You've reviewed all queued cards for this deck. Come back later for more reviews.
                  </p>
                  <button onClick={() => setStudyMode(false)} className="px-8 py-3 bg-zinc-600 text-white rounded-none font-bold hover:bg-zinc-700 transition-all shadow-none border-2 border-zinc-400 dark:border-zinc-600 shadow-zinc-500/30">
                      Back to Decks
                  </button>
              </div>
          );
      }

      const againState = calculateNextState(currentCard, 'again', settings);
      const hardState = calculateNextState(currentCard, 'hard', settings);
      const goodState = calculateNextState(currentCard, 'good', settings);
      const easyState = calculateNextState(currentCard, 'easy', settings);

      const isReview = currentCard.state === 'review';
      const progress = (currentCardIndex / studyQueue.length) * 100;

      return (
        <div className="flex flex-col h-full bg-[#f4f4f5] dark:bg-[#09090b] overflow-hidden relative">
            {}
            <div className="absolute top-0 left-0 w-full h-1 bg-zinc-200 dark:bg-zinc-700 z-50">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-zinc-500"
                />
            </div>

            {}
            <div className="flex justify-between items-center p-4 bg-[#fdfdfc] dark:bg-[#18181b] border-b border-zinc-300 dark:border-zinc-700">
                <div className="flex gap-4 text-sm font-bold font-mono">
                    <span className="text-blue-500">New: {studyQueue.slice(currentCardIndex).filter(c => c.state === 'new').length}</span>
                    <span className="text-red-500">Lrn: {studyQueue.slice(currentCardIndex).filter(c => c.state === 'learning' || c.state === 'relearning').length}</span>
                    <span className="text-green-500">Rev: {studyQueue.slice(currentCardIndex).filter(c => c.state === 'review').length}</span>
                </div>
                <button onClick={() => setStudyMode(false)} className="text-zinc-400 hover:text-zinc-600"><X size={24} /></button>
            </div>

            {}
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
                <div className="perspective-1000 w-full max-w-2xl h-[400px]">
                    <motion.div 
                        className="relative w-full h-full transition-all duration-500 preserve-3d"
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        onClick={() => !isFlipped && setIsFlipped(true)}
                    >
                        {}
                        <div className="absolute inset-0 w-full h-full backface-hidden bg-[#fdfdfc] dark:bg-[#18181b] rounded-sm shadow-none border-2 border-zinc-400 dark:border-zinc-600 border border-zinc-300 dark:border-zinc-700 flex flex-col items-center text-center p-8 md:p-12 cursor-pointer overflow-y-auto">
                            <div className="flex-1 flex flex-col justify-center w-full">
                                <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Question</div>
                                {currentCard.frontImage && (
                                    <img src={currentCard.frontImage} alt="Front" className="max-h-48 object-contain mx-auto mb-6 rounded-none" />
                                )}
                                <div 
                                    className="markdown-preview text-xl md:text-2xl text-zinc-900 dark:text-zinc-100 prose dark:prose-invert mx-auto"
                                    dangerouslySetInnerHTML={renderMarkdown(currentCard.front, isFlipped)}
                                />
                            </div>
                        </div>

                        {}
                        <div className="absolute inset-0 w-full h-full backface-hidden bg-[#fdfdfc] dark:bg-[#18181b] rounded-sm shadow-none border-2 border-zinc-400 dark:border-zinc-600 border border-zinc-300 dark:border-zinc-700 flex flex-col items-center text-center p-8 md:p-12 cursor-pointer rotate-y-180 overflow-y-auto">
                            <div className="flex-1 flex flex-col justify-center w-full">
                                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Answer</div>
                                {currentCard.backImage && (
                                    <img src={currentCard.backImage} alt="Back" className="max-h-48 object-contain mx-auto mb-6 rounded-none" />
                                )}
                                <div 
                                    className="markdown-preview text-lg md:text-xl text-zinc-700 dark:text-zinc-300 prose dark:prose-invert mx-auto"
                                    dangerouslySetInnerHTML={renderMarkdown(currentCard.back, isFlipped)}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
                {!isFlipped && <p className="mt-8 text-zinc-400 animate-pulse text-sm">Tap or press Space to flip</p>}
            </div>

            {}
            {isFlipped && (
                <div className="p-4 md:p-6 bg-[#fdfdfc] dark:bg-[#18181b] border-t border-zinc-300 dark:border-zinc-700 animate-in slide-in-from-bottom-full duration-300">
                    <div className="max-w-4xl mx-auto grid grid-cols-4 gap-2 md:gap-4">
                        {[
                            { label: 'Again', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300', key: '1', data: againState, action: 'again' },
                            { label: 'Hard', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', key: '2', data: hardState, action: 'hard' },
                            { label: 'Good', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', key: '3', data: goodState, action: 'good' },
                            { label: 'Easy', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', key: '4', data: easyState, action: 'easy' },
                        ].map((btn) => (
                            <button
                                key={btn.key}
                                onClick={() => handleRateCard(btn.action as any)}
                                className={`flex flex-col items-center justify-center py-3 md:py-4 rounded-none transition-transform active:scale-95 ${btn.color} hover:brightness-95 dark:hover:brightness-110`}
                            >
                                <span className="text-xs opacity-70 font-mono mb-1">
                                    {formatInterval(btn.data.nextInterval, btn.data.nextState === 'review')}
                                </span>
                                <span className="font-bold text-sm md:text-base">{btn.label}</span>
                                <span className="text-[10px] opacity-50 font-mono hidden md:inline mt-1">[{btn.key}]</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
      );
  }


  return (
    <div className="flex flex-col md:flex-row h-full gap-6 relative">
      {}
      <div className="w-full md:w-64 flex flex-col gap-2 flex-shrink-0 max-h-[200px] md:max-h-full overflow-hidden border-b md:border-b-0 md:border-r border-zinc-300 dark:border-zinc-700 pb-4 md:pb-0">
        <div className="flex justify-between items-center mb-2 px-2">
          <h2 className="font-semibold text-zinc-700 dark:text-zinc-200 font-serif tracking-tight">Your Decks</h2>
          <button onClick={() => { setNewDeckName(''); setIsDeckModalOpen(true); }} className="text-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 p-1.5 rounded-none transition-colors"><Plus size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto pr-1">
            {decks.map(deck => (
            <div
                key={deck.id}
                className={`group flex items-center justify-between p-3 rounded-none transition-all cursor-pointer mb-1 ${
                activeDeckId === deck.id 
                ? 'bg-[#fdfdfc] dark:bg-[#18181b] shadow-none border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300' 
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border border-transparent'
                }`}
                onClick={() => setActiveDeckId(deck.id)}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <Library size={18} className="flex-shrink-0" />
                    <span className="font-medium truncate">{deck.name}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteDeck(deck.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
            </div>
            ))}
        </div>
      </div>

      {}
      <div className="flex-1 bg-[#fdfdfc] dark:bg-[#18181b] rounded-sm border border-zinc-300 dark:border-zinc-700 p-6 md:p-8 flex flex-col overflow-hidden relative">
        {activeDeckId && getActiveDeck() ? (
          <>
            {}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        {editingDeckId === activeDeckId ? (
                            <input 
                                autoFocus
                                type="text"
                                value={editDeckName}
                                onChange={e => setEditDeckName(e.target.value)}
                                onBlur={handleRenameDeck}
                                onKeyDown={e => e.key === 'Enter' && handleRenameDeck()}
                                className="text-3xl font-bold bg-transparent border-b-2 border-zinc-500 focus:outline-none text-zinc-900 dark:text-white max-w-[200px] md:max-w-[300px]"
                            />
                        ) : (
                            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-2 group cursor-pointer font-serif tracking-tight" onClick={() => { setEditingDeckId(activeDeckId); setEditDeckName(getActiveDeck()?.name || ''); }}>
                                {getActiveDeck()?.name}
                                <Edit2 size={16} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </h1>
                        )}
                        <button onClick={openSettings} className="text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors" title="Deck Settings">
                            <Settings size={20} />
                        </button>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-medium">
                        <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                            <div className="w-2 h-2 rounded-sm bg-blue-500"></div> New: {deckStats.new}
                        </span>
                        <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                            <div className="w-2 h-2 rounded-sm bg-orange-500"></div> Learn: {deckStats.learning}
                        </span>
                        <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                            <div className="w-2 h-2 rounded-sm bg-green-500"></div> Review: {deckStats.review}
                        </span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={startStudy} className="px-8 py-3 bg-zinc-600 text-white rounded-none font-bold shadow-none border-2 border-zinc-400 dark:border-zinc-600 shadow-zinc-500/30 hover:bg-zinc-700 transition-all flex items-center gap-2">
                        <Play size={20} fill="currentColor" /> Study Now
                    </button>
                </div>
            </div>

            {}
            <div className="flex-1 overflow-y-auto pr-2 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button 
                        onClick={() => { setEditingCardId(null); setFormData({ front: '', back: '', frontImage: '', backImage: '' }); setIsCardModalOpen(true); }}
                        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-none text-zinc-400 hover:text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/10 transition-all min-h-[160px]"
                    >
                        <Plus size={32} />
                        <span className="mt-2 font-medium">Add Flashcard</span>
                    </button>
                    
                    {cards.filter(c => c.deckId === activeDeckId).map(card => (
                        <div key={card.id} className="group relative p-4 rounded-none border border-zinc-300 dark:border-zinc-700 bg-[#f4f4f5] dark:bg-[#18181b]/50 hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors flex flex-col">
                            <div className="flex-1">
                                <div className="text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider flex items-center justify-center gap-1">
                                    Front {card.frontImage && <ImageIcon size={12} className="text-zinc-500" />}
                                </div>
                                <div className="markdown-preview text-center text-zinc-800 dark:text-zinc-200 mb-3 line-clamp-2 text-sm prose dark:prose-invert" dangerouslySetInnerHTML={renderMarkdown(card.front || "...")} />
                                <div className="h-px bg-zinc-200 dark:bg-zinc-700 w-full mb-3"></div>
                                <div className="text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider flex items-center justify-center gap-1">
                                    Back {card.backImage && <ImageIcon size={12} className="text-zinc-500" />}
                                </div>
                                <div className="markdown-preview text-center text-zinc-600 dark:text-zinc-400 line-clamp-2 text-sm prose dark:prose-invert" dangerouslySetInnerHTML={renderMarkdown(card.back || "...")} />
                            </div>
                            <div className="mt-3 pt-3 border-t border-zinc-300 dark:border-zinc-700/50 flex justify-between text-[10px] text-zinc-400 font-mono">
                                <span>Int: {formatInterval(card.interval, card.state === 'review')}</span>
                                <span className={card.state === 'new' ? 'text-blue-500' : card.state === 'review' ? 'text-green-500' : 'text-orange-500'}>{card.state.toUpperCase()}</span>
                            </div>
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all bg-[#fdfdfc] dark:bg-[#18181b] rounded-none shadow-none border border-zinc-300 dark:border-zinc-700">
                                <button onClick={() => { setEditingCardId(card.id); setFormData({ front: card.front, back: card.back, frontImage: card.frontImage || '', backImage: card.backImage || '' }); setIsCardModalOpen(true); }} className="p-1.5 text-zinc-400 hover:text-zinc-500"><Edit2 size={14} /></button>
                                <button onClick={() => { if(confirm('Delete card?')) setCards(prev => prev.filter(c => c.id !== card.id)); }} className="p-1.5 text-zinc-400 hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
             <Layout size={48} className="mb-4 opacity-50" />
             <p className="text-lg font-medium">Select a deck</p>
          </div>
        )}
      </div>

      {}
      {isSettingsModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsSettingsModalOpen(false)}>
              <div className="bg-[#fdfdfc] dark:bg-[#09090b] rounded-sm shadow-none border-[3px] border-zinc-800 dark:border-zinc-300 w-full max-w-md border border-zinc-300 dark:border-zinc-700 p-6" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2 font-serif tracking-tight"><Sliders size={20} /> Deck Options</h3>
                  <form onSubmit={handleSaveSettings} className="space-y-6">
                      <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">New Cards per Day</label>
                          <input type="number" min="0" value={tempSettings.newCardsPerDay} onChange={e => setTempSettings({...tempSettings, newCardsPerDay: parseInt(e.target.value)})} className="w-full p-2 rounded-none bg-[#f4f4f5] dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-zinc-500/50 outline-none" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Max Reviews per Day</label>
                          <input type="number" min="0" value={tempSettings.reviewLimitPerDay} onChange={e => setTempSettings({...tempSettings, reviewLimitPerDay: parseInt(e.target.value)})} className="w-full p-2 rounded-none bg-[#f4f4f5] dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-zinc-500/50 outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Graduating Interval (Days)</label>
                            <input type="number" min="1" value={tempSettings.graduatingInterval} onChange={e => setTempSettings({...tempSettings, graduatingInterval: parseInt(e.target.value)})} className="w-full p-2 rounded-none bg-[#f4f4f5] dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-zinc-500/50 outline-none" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Easy Bonus (Multiplier)</label>
                            <input type="number" step="0.1" min="1" value={tempSettings.easyBonus} onChange={e => setTempSettings({...tempSettings, easyBonus: parseFloat(e.target.value)})} className="w-full p-2 rounded-none bg-[#f4f4f5] dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-zinc-500/50 outline-none" />
                        </div>
                      </div>
                      <div className="pt-4 flex justify-end gap-3">
                          <button type="button" onClick={() => setIsSettingsModalOpen(false)} className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-none">Cancel</button>
                          <button type="submit" className="px-6 py-2 bg-zinc-600 text-white font-bold rounded-none hover:bg-zinc-700">Save</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {}
      {isDeckModalOpen && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsDeckModalOpen(false)}>
            <div className="bg-[#fdfdfc] dark:bg-[#09090b] rounded-sm shadow-none border-[3px] border-zinc-800 dark:border-zinc-300 w-full max-w-sm border border-zinc-300 dark:border-zinc-700 p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white font-serif tracking-tight">Create New Deck</h2>
                    <button onClick={() => setIsDeckModalOpen(false)}><X size={20} className="text-zinc-400 hover:text-zinc-600"/></button>
                </div>
                <form onSubmit={handleCreateDeck}>
                    <input autoFocus type="text" value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)} placeholder="Deck Name" className="w-full p-3 bg-[#f4f4f5] dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-700 rounded-none mb-4 focus:outline-none focus:ring-2 focus:ring-zinc-500/50 text-zinc-900 dark:text-zinc-100" />
                    <button type="submit" className="w-full py-2 bg-zinc-600 text-white font-bold rounded-none hover:bg-zinc-700 transition-colors">Create Deck</button>
                </form>
            </div>
        </div>
      )}

      {}
      {isCardModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsCardModalOpen(false)}>
              <div className="bg-[#fdfdfc] dark:bg-[#09090b] rounded-sm shadow-none border-[3px] border-zinc-800 dark:border-zinc-300 w-full max-w-2xl border border-zinc-300 dark:border-zinc-700 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-zinc-300 dark:border-zinc-800 flex justify-between items-center">
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-white font-serif tracking-tight">{editingCardId ? 'Edit Flashcard' : 'New Flashcard'}</h2>
                      <button onClick={() => setIsCardModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"><X size={24}/></button>
                  </div>
                  <form onSubmit={saveCard} className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="space-y-3">
                          <div className="flex justify-between items-center">
                              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">Front</label>
                              <label className="flex items-center gap-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer hover:underline bg-zinc-50 dark:bg-zinc-900/30 px-2 py-1 rounded-sm">
                                  <Upload size={12} /> {formData.frontImage ? 'Change' : 'Add Image'} <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'frontImage')} />
                              </label>
                          </div>
                          <MarkdownEditor value={formData.front} onChange={val => setFormData({...formData, front: val})} placeholder="Enter question..." className="min-h-[150px]" />
                          {formData.frontImage && <img src={formData.frontImage} className="h-32 rounded-none border object-cover" />}
                      </div>
                      <div className="h-px bg-zinc-100 dark:bg-[#18181b]"></div>
                      <div className="space-y-3">
                           <div className="flex justify-between items-center">
                              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">Back</label>
                              <label className="flex items-center gap-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer hover:underline bg-zinc-50 dark:bg-zinc-900/30 px-2 py-1 rounded-sm">
                                  <Upload size={12} /> {formData.backImage ? 'Change' : 'Add Image'} <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'backImage')} />
                              </label>
                          </div>
                          <MarkdownEditor value={formData.back} onChange={val => setFormData({...formData, back: val})} placeholder="Enter answer..." className="min-h-[150px]" />
                           {formData.backImage && <img src={formData.backImage} className="h-32 rounded-none border object-cover" />}
                      </div>
                  </form>
                  <div className="p-6 border-t border-zinc-300 dark:border-zinc-800 bg-[#f4f4f5] dark:bg-[#09090b]/50 rounded-b-2xl">
                      <button onClick={saveCard} className="w-full py-3 bg-zinc-600 text-white font-bold rounded-none shadow-none border-2 border-zinc-400 dark:border-zinc-600 hover:bg-zinc-700 transition-all">{editingCardId ? 'Save Changes' : 'Create Card'}</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default FlashcardApp;
