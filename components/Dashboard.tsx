
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Notebook, CheckSquare, Calendar, Library, 
  Star, Clock, ArrowRight, Plus, Sparkles, Trash2 
} from 'lucide-react';
import { Note, Todo, CalendarEvent, Flashcard, AppView, StudyLog } from '../types';
import { isToday, format, subDays, startOfDay, eachDayOfInterval, isSameDay } from 'date-fns';

interface DashboardProps {
  notes: Note[];
  todos: Todo[];
  events: CalendarEvent[];
  flashcards: Flashcard[];
  studyHistory: StudyLog[];
  onNavigate: (view: AppView) => void;
  userName: string;
  onDeleteNote: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onDeleteEvent: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  notes, todos, events, flashcards, studyHistory, onNavigate, userName,
  onDeleteNote, onDeleteTodo, onDeleteEvent
}) => {
  const pinnedNotes = notes.filter(n => n.pinned);
  const todayTodos = todos.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && !t.completed);
  const upcomingEvents = events.filter(e => e.end > Date.now()).sort((a, b) => a.start - b.start).slice(0, 3);
  const cardsToReview = flashcards.filter(c => c.nextReview <= Date.now());

  const stats = [
    { label: 'Notes', value: notes.length, icon: Notebook, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Tasks', value: todos.filter(t => !t.completed).length, icon: CheckSquare, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Events', value: events.length, icon: Calendar, color: 'text-zinc-500', bg: 'bg-zinc-50 dark:bg-zinc-900/20' },
    { label: 'Reviews', value: cardsToReview.length, icon: Library, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 overflow-y-auto h-full">
      {}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white tracking-tight font-serif tracking-tight">
            Good morning, <span className="text-zinc-800 dark:text-zinc-200">{userName}</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-[#fdfdfc] dark:bg-[#18181b] rounded-sm border border-zinc-300 dark:border-zinc-700 shadow-none flex items-center gap-2">
                <Clock size={16} className="text-zinc-400" />
                <span className="text-sm font-medium">{format(new Date(), 'EEEE, MMMM do')}</span>
            </div>
        </div>
      </header>

      {}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 bg-[#fdfdfc] dark:bg-[#18181b] rounded-sm border border-zinc-300 dark:border-zinc-700 shadow-none"
          >
            <div className={`w-10 h-10 ${stat.bg} rounded-none flex items-center justify-center ${stat.color} mb-3`}>
              <stat.icon size={20} />
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {}
      <section className="p-6 bg-[#fdfdfc] dark:bg-[#18181b] rounded-sm border border-zinc-300 dark:border-zinc-700 shadow-none">
          <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 font-serif tracking-tight">
                  <Sparkles size={20} className="text-zinc-500" />
                  Learning Activity
              </h2>
              <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-zinc-100 dark:bg-zinc-700 rounded-sm"></div> 0</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-zinc-200 dark:bg-zinc-900/40 rounded-sm"></div> 1-5</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-700 rounded-sm"></div> 6-15</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 bg-zinc-600 dark:bg-zinc-500 rounded-sm"></div> 15+</div>
              </div>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-2">
              {Array.from({ length: 18 }).map((_, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                      {Array.from({ length: 7 }).map((_, dayIndex) => {
                          const date = subDays(new Date(), (17 - weekIndex) * 7 + (6 - dayIndex));
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const log = studyHistory.find(l => l.date === dateStr);
                          const count = log?.count || 0;
                          
                          let color = 'bg-zinc-100 dark:bg-zinc-700/50';
                          if (count > 15) color = 'bg-zinc-600 dark:bg-zinc-500';
                          else if (count > 5) color = 'bg-zinc-400 dark:bg-zinc-700';
                          else if (count > 0) color = 'bg-zinc-200 dark:bg-zinc-900/40';

                          return (
                              <div 
                                key={dayIndex} 
                                title={`${dateStr}: ${count} reviews`}
                                className={`w-3 h-3 rounded-sm ${color} transition-colors hover:ring-2 hover:ring-zinc-500/50 cursor-help`}
                              />
                          );
                      })}
                  </div>
              ))}
          </div>
          <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Current Streak: <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {(() => {
                          let streak = 0;
                          let checkDate = new Date();

                          const todayStr = format(checkDate, 'yyyy-MM-dd');
                          const todayLog = studyHistory.find(l => l.date === todayStr);
                          if (todayLog && todayLog.count > 0) {
                              streak++;
                          }

                          checkDate = subDays(new Date(), 1);
                          while (true) {
                              const dateStr = format(checkDate, 'yyyy-MM-dd');
                              const log = studyHistory.find(l => l.date === dateStr);
                              if (log && log.count > 0) {
                                  streak++;
                                  checkDate = subDays(checkDate, 1);
                              } else {
                                  break;
                              }
                          }
                          return streak;
                      })()} days
                  </span>
              </div>
              <button onClick={() => onNavigate(AppView.FLASHCARDS)} className="text-sm font-bold text-zinc-800 hover:underline">Continue Learning</button>
          </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {}
        <div className="lg:col-span-2 space-y-8">
          {}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 font-serif tracking-tight">
                <CheckSquare size={20} className="text-emerald-500" />
                Today's Tasks
              </h2>
              <button onClick={() => onNavigate(AppView.TODO)} className="text-sm text-zinc-800 hover:underline flex items-center gap-1">
                View all <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {todayTodos.length > 0 ? todayTodos.map(todo => (
                <div key={todo.id} className="group p-4 bg-[#fdfdfc] dark:bg-[#18181b] rounded-sm border border-zinc-300 dark:border-zinc-700 shadow-none flex items-center gap-4 hover:border-zinc-200 transition-all">
                  <div className={`w-2 h-2 rounded-sm ${todo.priority === 'high' ? 'bg-red-500' : todo.priority === 'medium' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                  <span className="flex-1 font-medium">{todo.text}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">{todo.dueDate ? format(new Date(todo.dueDate), 'HH:mm') : ''}</span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteTodo(todo.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-300 hover:text-red-500 transition-all"
                    >
                        <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center bg-[#f4f4f5] dark:bg-[#09090b]/50 rounded-sm border-2 border-dashed border-zinc-300 dark:border-zinc-700">
                  <p className="text-zinc-400">No tasks due today. Enjoy your day!</p>
                </div>
              )}
            </div>
          </section>

          {}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 font-serif tracking-tight">
                <Calendar size={20} className="text-zinc-500" />
                Upcoming Events
              </h2>
              <button onClick={() => onNavigate(AppView.CALENDAR)} className="text-sm text-zinc-800 hover:underline flex items-center gap-1">
                Full calendar <ArrowRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                <div key={event.id} className="group p-4 bg-zinc-50 dark:bg-zinc-900/20 rounded-sm border border-zinc-100 dark:border-zinc-800/50 relative">
                  <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase mb-1">
                    {format(new Date(event.start), 'MMM d, HH:mm')}
                  </div>
                  <h3 className="font-bold text-zinc-900 dark:text-white font-serif tracking-tight">{event.title}</h3>
                  {event.description && <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">{event.description}</p>}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteEvent(event.id); }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )) : (
                <div className="col-span-2 p-8 text-center bg-[#f4f4f5] dark:bg-[#09090b]/50 rounded-sm border-2 border-dashed border-zinc-300 dark:border-zinc-700">
                  <p className="text-zinc-400">Your schedule is clear.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {}
        <div className="space-y-8">
          {}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2 font-serif tracking-tight">
                <Star size={20} className="text-yellow-500 fill-yellow-500" />
                Pinned
              </h2>
              <button onClick={() => onNavigate(AppView.NOTES)} className="text-sm text-zinc-800 hover:underline flex items-center gap-1">
                All notes <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {pinnedNotes.length > 0 ? pinnedNotes.map(note => (
                <div key={note.id} className="p-4 bg-[#fdfdfc] dark:bg-[#18181b] rounded-sm border border-zinc-300 dark:border-zinc-700 shadow-none group hover:border-zinc-300 transition-colors cursor-pointer relative" onClick={() => onNavigate(AppView.NOTES)}>
                  <h3 className="font-bold text-zinc-900 dark:text-white group-hover:text-zinc-800 transition-colors pr-6 font-serif tracking-tight">{note.title || 'Untitled Note'}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{note.updatedAt && !isNaN(note.updatedAt) ? format(note.updatedAt, 'MMM d, yyyy') : 'Unknown date'}</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )) : (
                <div className="p-6 text-center bg-[#f4f4f5] dark:bg-[#09090b]/50 rounded-sm border-2 border-dashed border-zinc-300 dark:border-zinc-700">
                  <p className="text-xs text-zinc-400">Pin important notes to see them here.</p>
                </div>
              )}
            </div>
          </section>

          {}
          <section className="p-6 bg-zinc-600 rounded-sm text-white shadow-none border-2 border-zinc-400 dark:border-zinc-600 shadow-zinc-500/20">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 font-serif tracking-tight">
                <Sparkles size={20} />
                Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-2">
                <button 
                    onClick={() => onNavigate(AppView.NOTES)}
                    className="flex items-center gap-3 p-3 bg-[#fdfdfc]/10 hover:bg-[#fdfdfc]/20 rounded-none transition-colors text-sm font-medium"
                >
                    <Plus size={18} /> New Note
                </button>
                <button 
                    onClick={() => onNavigate(AppView.TODO)}
                    className="flex items-center gap-3 p-3 bg-[#fdfdfc]/10 hover:bg-[#fdfdfc]/20 rounded-none transition-colors text-sm font-medium"
                >
                    <CheckSquare size={18} /> Add Task
                </button>
                <button 
                    onClick={() => onNavigate(AppView.FLASHCARDS)}
                    className="flex items-center gap-3 p-3 bg-[#fdfdfc]/10 hover:bg-[#fdfdfc]/20 rounded-none transition-colors text-sm font-medium"
                >
                    <Library size={18} /> Review Cards
                </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
