
import React, { useState, useEffect, useRef } from 'react';
import { Notebook, Library, CheckSquare, Calendar, Moon, Sun, PanelLeft, Edit2, Clock as ClockIcon, Sparkles, LayoutDashboard, Search, Command, Trash2 } from 'lucide-react';
import { Note, Folder, Deck, Flashcard, Todo, CalendarEvent, AppView, Alarm, StudyLog } from './types';
import NoteApp from './components/NoteApp';
import FlashcardApp from './components/FlashcardApp';
import TodoApp from './components/TodoApp';
import CalendarApp from './components/CalendarApp';
import ClockApp from './components/ClockApp';
import Dashboard from './components/Dashboard';
import { generateId } from './utils';

const useStickyState = <T,>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [darkMode, setDarkMode] = useStickyState(false, 'neuro-darkmode');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [userName, setUserName] = useStickyState('User', 'neuro-username');
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const [notes, setNotes] = useStickyState<Note[]>([], 'notes');
  const [folders, setFolders] = useStickyState<Folder[]>([], 'folders');
  const [decks, setDecks] = useStickyState<Deck[]>([
    { 
      id: '1', 
      name: 'General Knowledge',
      settings: {
        newCardsPerDay: 20,
        reviewLimitPerDay: 200,
        learningSteps: [1, 10],
        graduatingInterval: 1,
        easyBonus: 1.3
      }
    }
  ], 'neuro-decks');
  const [flashcards, setFlashcards] = useStickyState<Flashcard[]>([], 'neuro-flashcards');
  const [todos, setTodos] = useStickyState<Todo[]>([], 'neuro-todos');
  const [events, setEvents] = useStickyState<CalendarEvent[]>([], 'neuro-events');
  const [alarms, setAlarms] = useStickyState<Alarm[]>([], 'neuro-alarms');
  const [studyHistory, setStudyHistory] = useStickyState<StudyLog[]>([], 'neuro-study-history');

  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const currentTime = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });
      const currentSeconds = now.getSeconds();

      if (currentSeconds === 0) {
          const triggeredAlarm = alarms.find(a => a.active && a.time === currentTime);
          if (triggeredAlarm) {
              playAlarmSound();
              if (Notification.permission === "granted") {
                  new Notification(`Alarm: ${triggeredAlarm.label}`, { body: "Time to check your tasks!" });
              } else if (Notification.permission !== "denied") {
                  Notification.requestPermission().then(permission => {
                      if (permission === "granted") {
                          new Notification(`Alarm: ${triggeredAlarm.label}`, { body: "Time to check your tasks!" });
                      }
                  });
              }
              setTimeout(() => alert(`ALARM: ${triggeredAlarm.label}`), 100);
          }
      }
    };
    
    const timer = setInterval(checkAlarms, 1000);
    return () => clearInterval(timer);
  }, [alarms]);

  const playAlarmSound = () => {
      try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              
              osc.type = 'square';
              osc.frequency.setValueAtTime(440, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
              
              gain.gain.setValueAtTime(0.1, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
              
              osc.start();
              osc.stop(ctx.currentTime + 0.5);

              setTimeout(() => {
                  ctx.close().catch(console.error);
              }, 600);
          }
      } catch (e) {
          console.error("Audio play failed", e);
      }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addFlashcards = (newCards: Omit<Flashcard, 'id'>[]) => {
      const cardsWithIds = newCards.map(c => ({...c, id: generateId()}));
      setFlashcards([...flashcards, ...cardsWithIds]);
  };

  const addTasks = (tasks: string[]) => {
      const newTodos: Todo[] = tasks.map(t => ({
          id: generateId(),
          text: t,
          completed: false,
          priority: 'medium',
          dueDate: Date.now()
      }));
      setTodos([...newTodos, ...todos]);
  }

  const handleAddEvent = (event: CalendarEvent) => {
    setEvents([...events, event]);
  };

  const handleUpdateEvent = (id: string, updates: Partial<CalendarEvent>) => {
    setEvents(events.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const handleAddTodo = (todo: Todo) => {
    setTodos([...todos, todo]);
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Delete this note?')) {
      setNotes(notes.filter(n => n.id !== id));
    }
  };

  const handleDeleteTodo = (id: string) => {
    if (confirm('Delete this task?')) {
      setTodos(todos.filter(t => t.id !== id));
    }
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm('Delete this event?')) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const navItems = [
    { view: AppView.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { view: AppView.NOTES, label: 'Notes', icon: Notebook },
    { view: AppView.FLASHCARDS, label: 'Flashcards', icon: Library },
    { view: AppView.TODO, label: 'Tasks', icon: CheckSquare },
    { view: AppView.CALENDAR, label: 'Schedule', icon: Calendar },
    { view: AppView.CLOCK, label: 'Time Tools', icon: ClockIcon },
  ];

  return (
    <div className="flex h-screen bg-[#f4f4f5] dark:bg-[#09090b] transition-colors duration-200 overflow-hidden font-sans text-zinc-900 dark:text-zinc-100">
      
      {}
      <aside 
        className={`${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full opacity-0'} 
        bg-[#fdfdfc] dark:bg-[#18181b] border-r border-zinc-300 dark:border-zinc-700 transition-all duration-300 flex flex-col fixed md:relative z-20 h-full`}
      >
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-zinc-600 rounded-none flex items-center justify-center text-white font-bold text-lg shadow-none border-2 border-zinc-400 dark:border-zinc-600 shadow-zinc-500/30">N</div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400">
                    NeuroNote
                </span>
            </div>

            {}
            <div className="bg-[#f4f4f5] dark:bg-[#09090b]/50 rounded-none p-4 border border-zinc-300 dark:border-zinc-700/50">
                <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">Welcome back,</p>
                <div className="flex items-center gap-2 group">
                    {isEditingName ? (
                        <input 
                            ref={nameInputRef}
                            type="text" 
                            value={userName} 
                            onChange={(e) => setUserName(e.target.value)}
                            onBlur={() => setIsEditingName(false)}
                            onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                            className="w-full bg-[#fdfdfc] dark:bg-[#18181b] border border-zinc-500 rounded-sm px-1 py-0.5 text-sm font-bold text-zinc-900 dark:text-white focus:outline-none"
                        />
                    ) : (
                        <button 
                            onClick={() => setIsEditingName(true)}
                            className="text-lg font-bold text-zinc-800 dark:text-zinc-100 hover:text-zinc-800 dark:hover:text-white truncate flex-1 text-left flex items-center gap-2"
                        >
                            {userName}
                            <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
                        </button>
                    )}
                </div>
            </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setCurrentView(item.view)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-none transition-all font-medium ${
                  isActive 
                  ? 'bg-zinc-50 dark:bg-zinc-900/20 text-zinc-800 dark:text-zinc-200 shadow-none' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-300 dark:border-zinc-700">
          <div className="bg-[#e4e4e7] dark:bg-[#18181b] rounded-sm p-1 flex mb-3">
             <button 
               onClick={() => setDarkMode(false)}
               className={`flex-1 flex items-center justify-center p-2 rounded-sm text-sm font-medium transition-all ${!darkMode ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
             >
                <Sun size={16} className="mr-2"/> Light
             </button>
             <button 
               onClick={() => setDarkMode(true)}
               className={`flex-1 flex items-center justify-center p-2 rounded-sm text-sm font-medium transition-all ${darkMode ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
             >
                <Moon size={16} className="mr-2"/> Dark
             </button>
          </div>
          <button
              onClick={() => {
                  if (confirm('Are you sure you want to delete all app data cache? This cannot be undone.')) {
                      window.localStorage.clear();
                      window.location.reload();
                  }
              }}
              className="w-full flex items-center justify-center gap-2 p-2 rounded-none text-sm font-medium transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-100 dark:hover:border-red-900/50"
          >
              <Trash2 size={16} />
              Clear App Data Cache
          </button>
        </div>
      </aside>

      {}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {}
        <header className="p-4 flex items-center md:hidden bg-[#fdfdfc] dark:bg-[#18181b] border-b border-zinc-300 dark:border-zinc-700">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 bg-zinc-100 dark:bg-zinc-700 rounded-none">
                <PanelLeft size={20} className="text-zinc-600 dark:text-zinc-300"/>
            </button>
            <h1 className="ml-4 font-bold text-lg font-serif tracking-tight">{navItems.find(n => n.view === currentView)?.label}</h1>
        </header>

        {}
        <div className="absolute top-6 left-6 hidden md:block z-10">
             {!sidebarOpen && (
                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 bg-[#fdfdfc] dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-700 rounded-none shadow-none hover:bg-[#f4f4f5] dark:hover:bg-zinc-700 transition-colors"
                >
                    <PanelLeft size={20} className="text-zinc-600 dark:text-zinc-300"/>
                </button>
             )}
             {sidebarOpen && (
                <button 
                    onClick={() => setSidebarOpen(false)}
                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-[#fdfdfc] dark:bg-[#18181b] border-y border-r border-zinc-300 dark:border-zinc-700 rounded-r-lg shadow-none flex items-center justify-center hover:bg-[#f4f4f5] dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-500 transition-colors"
                    style={{ left: '-24px' }} // Visual fix handled by sidebar container
                >
                     <PanelLeft size={14} />
                </button>
             )}
        </div>

        <div className="flex-1 p-4 md:p-8 overflow-hidden">
            {currentView === AppView.DASHBOARD && (
                <Dashboard 
                    notes={notes} 
                    todos={todos} 
                    events={events} 
                    flashcards={flashcards} 
                    studyHistory={studyHistory}
                    onNavigate={setCurrentView} 
                    userName={userName}
                    onDeleteNote={handleDeleteNote}
                    onDeleteTodo={handleDeleteTodo}
                    onDeleteEvent={handleDeleteEvent}
                />
            )}
            {currentView === AppView.NOTES && (
                <NoteApp 
                    notes={notes} 
                    setNotes={setNotes} 
                    folders={folders}
                    setFolders={setFolders}
                    decks={decks}
                    setDecks={setDecks}
                    addFlashcards={addFlashcards}
                    addTasks={addTasks}
                />
            )}
            {currentView === AppView.FLASHCARDS && (
                <FlashcardApp 
                    decks={decks} 
                    setDecks={setDecks} 
                    cards={flashcards} 
                    setCards={setFlashcards} 
                    studyHistory={studyHistory}
                    setStudyHistory={setStudyHistory}
                />
            )}
            {currentView === AppView.TODO && (
                <TodoApp todos={todos} setTodos={setTodos} />
            )}
            {currentView === AppView.CALENDAR && (
                <CalendarApp 
                  todos={todos} 
                  events={events} 
                  onAddEvent={handleAddEvent}
                  onUpdateEvent={handleUpdateEvent}
                  onAddTodo={handleAddTodo}
                  onDeleteEvent={handleDeleteEvent}
                  onDeleteTodo={handleDeleteTodo}
                />
            )}
             {currentView === AppView.CLOCK && (
                <ClockApp alarms={alarms} setAlarms={setAlarms} />
            )}
        </div>
      </main>

      {}
      {isCommandPaletteOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCommandPaletteOpen(false)} />
              <div className="w-full max-w-2xl bg-[#fdfdfc] dark:bg-[#09090b] rounded-sm shadow-none border-[3px] border-zinc-800 dark:border-zinc-300 border border-zinc-300 dark:border-zinc-700 overflow-hidden relative z-10">
                  <div className="p-4 border-b border-zinc-300 dark:border-zinc-800 flex items-center gap-3">
                      <Command size={20} className="text-zinc-800" />
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Search anything or run a command..." 
                        className="flex-1 bg-transparent border-none focus:outline-none text-lg"
                      />
                      <kbd className="text-xs font-mono text-zinc-400">ESC</kbd>
                  </div>
                  <div className="p-2 max-h-[60vh] overflow-y-auto">
                      <div className="p-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Navigation</div>
                      {navItems.map(item => (
                          <button 
                            key={item.view}
                            onClick={() => { setCurrentView(item.view); setIsCommandPaletteOpen(false); }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-[#f4f4f5] dark:hover:bg-zinc-800 rounded-none transition-colors text-left"
                          >
                              <div className="w-8 h-8 rounded-none bg-zinc-100 dark:bg-[#18181b] flex items-center justify-center text-zinc-500">
                                  <item.icon size={18} />
                              </div>
                              <span className="font-medium">{item.label}</span>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
