
import React, { useState, useEffect, useRef } from 'react';
import { 
  format, endOfMonth, eachDayOfInterval, isSameDay, addMonths, isToday, 
  endOfWeek, addDays, getHours, getMinutes, 
  isBefore, addWeeks, addHours,
  differenceInMinutes, isWithinInterval
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Calendar as CalIcon, Plus, X, Clock, 
  CheckCircle2, Image as ImageIcon, MapPin, AlignLeft, MoreHorizontal,
  ChevronDown, Layout, Trash2
} from 'lucide-react';
import { Todo, CalendarEvent } from '../types';
import { generateId, compressImage } from '../utils';

interface CalendarAppProps {
  todos: Todo[];
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onUpdateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  onAddTodo: (todo: Todo) => void;
  onDeleteEvent: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

type ViewType = 'month' | 'week' | 'day';

const CalendarApp: React.FC<CalendarAppProps> = ({ todos, events, onAddEvent, onUpdateEvent, onAddTodo, onDeleteEvent, onDeleteTodo }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{start: Date, end: Date} | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [newItemType, setNewItemType] = useState<'task' | 'event'>('event');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemImage, setNewItemImage] = useState<string>('');
  const [newItemCategory, setNewItemCategory] = useState<'work' | 'personal' | 'health' | 'other'>('work');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if ((view === 'week' || view === 'day') && scrollRef.current) {
      scrollRef.current.scrollTop = 8 * 60; 
    }
  }, [view]);

  const handlePrev = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, -1));
    if (view === 'week') setCurrentDate(addWeeks(currentDate, -1));
    if (view === 'day') setCurrentDate(addDays(currentDate, -1));
  };

  const handleNext = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    if (view === 'day') setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  const getItemsForDay = (date: Date) => {
    const dayTasks = todos.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), date) && !t.completed);
    const dayEvents = events.filter(e => isSameDay(new Date(e.start), date));
    return { tasks: dayTasks, events: dayEvents };
  };

  const getAllDayItems = (date: Date) => {
    const { tasks } = getItemsForDay(date);
    return tasks;
  };

  const getTimedEvents = (date: Date) => {
    const { events } = getItemsForDay(date);
    return events.sort((a, b) => a.start - b.start);
  };

  const openModal = (start?: Date, end?: Date, existingEvent?: CalendarEvent) => {
    if (existingEvent) {
      setEditingEventId(existingEvent.id);
      setSelectedSlot({ start: new Date(existingEvent.start || Date.now()), end: new Date(existingEvent.end || Date.now()) });
      setStartTime(existingEvent.start && !isNaN(existingEvent.start) ? format(new Date(existingEvent.start), 'HH:mm') : '09:00');
      setEndTime(existingEvent.end && !isNaN(existingEvent.end) ? format(new Date(existingEvent.end), 'HH:mm') : '10:00');
      setNewItemTitle(existingEvent.title);
      setNewItemDesc(existingEvent.description || '');
      setNewItemImage(existingEvent.image || '');
      setNewItemCategory(existingEvent.type as any);
      setNewItemType('event');
      setIsModalOpen(true);
      return;
    }

    setEditingEventId(null);
    const s = start || new Date(new Date(currentDate).setHours(9, 0, 0, 0));
    const e = end || new Date(new Date(currentDate).setHours(10, 0, 0, 0));
    
    setSelectedSlot({ start: s, end: e });
    setStartTime(format(s, 'HH:mm'));
    setEndTime(format(e, 'HH:mm'));
    setNewItemTitle('');
    setNewItemDesc('');
    setNewItemImage('');
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim() || !selectedSlot) return;

    const id = generateId();
    
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const finalStart = new Date(new Date(selectedSlot.start).setHours(startH, startM, 0, 0));
    let finalEnd = new Date(new Date(selectedSlot.start).setHours(endH, endM, 0, 0));
    
    if (isBefore(finalEnd, finalStart)) {
        finalEnd = addHours(finalStart, 1);
    }

    if (newItemType === 'task') {
      const newTodo: Todo = {
        id,
        text: newItemTitle,
        completed: false,
        priority: 'medium',
        dueDate: finalStart.getTime(),
        image: newItemImage || undefined
      };
      onAddTodo(newTodo);
    } else {
      if (editingEventId) {
        onUpdateEvent(editingEventId, {
          title: newItemTitle,
          description: newItemDesc,
          start: finalStart.getTime(),
          end: finalEnd.getTime(),
          type: newItemCategory,
          image: newItemImage || undefined
        });
      } else {
        const newEvent: CalendarEvent = {
          id,
          title: newItemTitle,
          description: newItemDesc,
          start: finalStart.getTime(),
          end: finalEnd.getTime(),
          type: newItemCategory,
          image: newItemImage || undefined
        };
        onAddEvent(newEvent);
      }
    }
    
    setIsModalOpen(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const compressed = await compressImage(file);
              setNewItemImage(compressed);
          } catch (e) {
              console.error(e);
          }
      }
  };


  const MonthView = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startDay = firstDay.getDay(); // 0-6
    const days = eachDayOfInterval({ start: firstDay, end: endOfMonth(currentDate) });
    const blanks = Array(startDay).fill(null);

    return (
      <div className="flex-1 flex flex-col">
        <div className="grid grid-cols-7 border-b border-zinc-300 dark:border-zinc-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-zinc-500 uppercase">{d}</div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-zinc-200 dark:bg-zinc-700 gap-px border-l border-zinc-300 dark:border-zinc-700">
          {blanks.map((_, i) => <div key={`blank-${i}`} className="bg-[#fdfdfc] dark:bg-[#18181b]" />)}
          {days.map(day => {
            const { tasks, events } = getItemsForDay(day);
            const isTodayDate = isToday(day);
            return (
              <div 
                key={day.toISOString()} 
                onClick={() => { setCurrentDate(day); setView('day'); }} // Drill down on click
                className={`bg-[#fdfdfc] dark:bg-[#18181b] p-2 min-h-[100px] hover:bg-[#f4f4f5] dark:hover:bg-zinc-750 transition-colors cursor-pointer group flex flex-col gap-1`}
              >
                <div className="flex justify-between items-start">
                    <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-sm ${isTodayDate ? 'bg-zinc-600 text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>
                        {format(day, 'd')}
                    </span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); openModal(day, day); }}
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-800"
                    >
                        <Plus size={16} />
                    </button>
                </div>
                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {[...events, ...tasks].slice(0, 4).map(item => {
                        const isTask = (item as Todo).text !== undefined;
                        const title = isTask ? (item as Todo).text : (item as CalendarEvent).title;
                        const type = isTask ? 'task' : (item as CalendarEvent).type;
                        
                        const colorClass = isTask 
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                            : type === 'work' ? 'border-zinc-500 bg-zinc-50 dark:bg-zinc-900/20 text-zinc-700 dark:text-zinc-300'
                            : type === 'personal' ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300'
                            : type === 'health' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                            : 'border-zinc-500 bg-[#f4f4f5] dark:bg-[#09090b]/20 text-zinc-700 dark:text-zinc-300';

                        return (
                            <div 
                                key={item.id} 
                                onClick={(e) => {
                                    if (!isTask) {
                                        e.stopPropagation();
                                        openModal(undefined, undefined, item as CalendarEvent);
                                    }
                                }}
                                className={`group relative truncate text-[10px] px-1.5 py-0.5 rounded-sm border-l-2 cursor-pointer ${colorClass}`}
                            >
                                {title}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); isTask ? onDeleteTodo(item.id) : onDeleteEvent(item.id); }}
                                    className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 bg-[#fdfdfc]/80 dark:bg-[#18181b]/80 p-0.5 text-red-500 rounded-bl"
                                >
                                    <X size={8} />
                                </button>
                            </div>
                        )
                    })}
                    {[...events, ...tasks].length > 4 && (
                        <span className="text-[10px] text-zinc-400 pl-1">
                            + {[...events, ...tasks].length - 4} more
                        </span>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const TimeGrid = ({ type }: { type: 'week' | 'day' }) => {
    const daysToShow = type === 'week' 
        ? eachDayOfInterval({ start: addDays(endOfWeek(currentDate), -6), end: endOfWeek(currentDate) }) 
        : [currentDate];

    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 60000); // Update every min
        return () => clearInterval(t);
    }, []);

    const getCurrentTimePosition = () => {
        const minutes = getHours(now) * 60 + getMinutes(now);
        return minutes; // 1 min = 1px height for simplicity (or scaled)
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#fdfdfc] dark:bg-[#18181b]">
            {}
            <div className="flex border-b border-zinc-300 dark:border-zinc-700 flex-shrink-0">
                <div className="w-16 border-r border-zinc-300 dark:border-zinc-700 bg-[#fdfdfc] dark:bg-[#18181b] flex-shrink-0" /> {}
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysToShow.length}, minmax(0, 1fr))` }}>
                    {daysToShow.map(day => {
                        const isTodayDate = isToday(day);
                        return (
                            <div key={day.toISOString()} className="text-center py-3 border-r border-zinc-300 dark:border-zinc-700 last:border-0">
                                <div className={`text-xs font-semibold uppercase mb-1 ${isTodayDate ? 'text-zinc-800' : 'text-zinc-500'}`}>
                                    {format(day, 'EEE')}
                                </div>
                                <div className={`text-2xl font-light w-10 h-10 mx-auto flex items-center justify-center rounded-sm ${isTodayDate ? 'bg-zinc-600 text-white shadow-none border border-zinc-300 dark:border-zinc-700' : 'text-zinc-900 dark:text-white'}`}>
                                    {format(day, 'd')}
                                </div>
                                {}
                                <div className="mt-2 space-y-1 px-1 min-h-[20px]">
                                    {getAllDayItems(day).map(task => (
                                        <div key={task.id} className="group relative text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 rounded-sm px-1 py-0.5 truncate text-left border-l-2 border-emerald-500">
                                            <CheckCircle2 size={8} className="inline mr-1" />
                                            {task.text}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onDeleteTodo(task.id); }}
                                                className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 bg-[#fdfdfc]/80 dark:bg-[#18181b]/80 p-0.5 text-red-500 rounded-bl"
                                            >
                                                <X size={8} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {}
            <div ref={scrollRef} className="flex-1 overflow-y-auto relative scrollbar-thin">
                <div className="flex relative min-h-[1440px]"> {}
                    
                    {}
                    <div className="w-16 flex-shrink-0 border-r border-zinc-300 dark:border-zinc-700 bg-[#fdfdfc] dark:bg-[#18181b] select-none z-10 sticky left-0">
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} className="h-[60px] text-right pr-2 text-xs text-zinc-400 relative -top-2.5">
                                {}
                                {i === 0 ? '' : format(new Date(new Date().setHours(i, 0, 0, 0)), 'h aa')}
                            </div>
                        ))}
                    </div>

                    {}
                    <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${daysToShow.length}, minmax(0, 1fr))` }}>
                        {}
                        <div className="absolute inset-0 z-0 pointer-events-none">
                            {Array.from({ length: 24 }).map((_, i) => (
                                <div key={i} className="h-[60px] border-b border-zinc-300 dark:border-zinc-700/50 w-full" />
                            ))}
                        </div>

                        {daysToShow.map((day, dayIndex) => {
                            const events = getTimedEvents(day);
                            return (
                                <div 
                                    key={day.toISOString()} 
                                    className="relative h-full border-r border-zinc-300 dark:border-zinc-700 last:border-0 group"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const y = e.clientY - rect.top + e.currentTarget.scrollTop; // approx
                                        openModal(day);
                                    }}
                                >
                                    {}
                                    {isToday(day) && (
                                        <div 
                                            className="absolute w-full border-t-2 border-red-500 z-20 pointer-events-none flex items-center"
                                            style={{ top: `${getCurrentTimePosition()}px` }}
                                        >
                                            <div className="w-2 h-2 bg-red-500 rounded-sm -ml-1"></div>
                                        </div>
                                    )}

                                    {}
                                    {events.map(event => {
                                        const startMin = getHours(event.start) * 60 + getMinutes(event.start);
                                        const endMin = getHours(event.end) * 60 + getMinutes(event.end);
                                        const duration = Math.max(30, endMin - startMin); // Minimum 30 mins visual

                                        const colorClass = event.type === 'work' ? 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-500 text-zinc-900 dark:text-zinc-100'
                                            : event.type === 'personal' ? 'bg-pink-50 dark:bg-pink-900/40 border-pink-500 text-pink-900 dark:text-pink-100'
                                            : event.type === 'health' ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-500 text-emerald-900 dark:text-emerald-100'
                                            : 'bg-[#f4f4f5] dark:bg-[#09090b]/40 border-zinc-500 text-zinc-900 dark:text-zinc-100';

                                        return (
                                            <div
                                                key={event.id}
                                                onClick={(e) => { e.stopPropagation(); openModal(undefined, undefined, event as CalendarEvent); }}
                                                className={`group absolute inset-x-1 rounded-none border-l-4 text-xs p-1 overflow-hidden cursor-pointer hover:shadow-none border-2 border-zinc-400 dark:border-zinc-600 hover:z-30 transition-all ${colorClass}`}
                                                style={{
                                                    top: `${startMin}px`,
                                                    height: `${duration}px`
                                                }}
                                            >
                                                <div className="font-semibold truncate flex gap-1 items-center pr-4">
                                                    {event.image && <ImageIcon size={10}/>}
                                                    {event.title}
                                                </div>
                                                <div className="opacity-70 truncate">
                                                    {event.start && !isNaN(event.start) ? format(event.start, 'h:mm a') : 'Invalid'} - {event.end && !isNaN(event.end) ? format(event.end, 'h:mm a') : 'Invalid'}
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onDeleteEvent(event.id); }}
                                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
  };


  return (
    <div className="h-full flex flex-col bg-[#fdfdfc] dark:bg-[#18181b] overflow-hidden">
      {}
      <div className="p-4 border-b border-zinc-300 dark:border-zinc-700 flex items-center justify-between bg-[#fdfdfc] dark:bg-[#18181b] z-20 shadow-none">
        <div className="flex items-center gap-4">
            <button onClick={handleToday} className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-none text-sm font-medium hover:bg-[#f4f4f5] dark:hover:bg-zinc-700 transition-colors">
                Today
            </button>
            <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                <button onClick={handlePrev} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-sm"><ChevronLeft size={20}/></button>
                <button onClick={handleNext} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-sm"><ChevronRight size={20}/></button>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white min-w-[150px] font-serif tracking-tight">
                {format(currentDate, 'MMMM yyyy')}
            </h2>
        </div>

        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-700 p-1 rounded-none">
            <button 
                onClick={() => setView('day')}
                className={`px-3 py-1 rounded-sm text-sm font-medium transition-all ${view === 'day' ? 'bg-[#fdfdfc] dark:bg-zinc-600 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900'}`}
            >
                Day
            </button>
            <button 
                onClick={() => setView('week')}
                className={`px-3 py-1 rounded-sm text-sm font-medium transition-all ${view === 'week' ? 'bg-[#fdfdfc] dark:bg-zinc-600 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900'}`}
            >
                Week
            </button>
            <button 
                onClick={() => setView('month')}
                className={`px-3 py-1 rounded-sm text-sm font-medium transition-all ${view === 'month' ? 'bg-[#fdfdfc] dark:bg-zinc-600 shadow text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900'}`}
            >
                Month
            </button>
        </div>

        <button 
            onClick={() => openModal()} 
            className="ml-4 bg-zinc-600 hover:bg-zinc-700 text-white px-4 py-2 rounded-none shadow-none border-2 border-zinc-400 dark:border-zinc-600 shadow-zinc-500/30 flex items-center gap-2 font-medium transition-all"
        >
            <Plus size={18} />
            <span className="hidden sm:inline">Create</span>
        </button>
      </div>

      {}
      <div className="flex-1 overflow-hidden flex flex-col">
        {view === 'month' && <MonthView />}
        {(view === 'week' || view === 'day') && <TimeGrid type={view} />}
      </div>

      {}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
            <div className="bg-[#fdfdfc] dark:bg-[#09090b] rounded-sm shadow-none border-[3px] border-zinc-800 dark:border-zinc-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 bg-[#f4f4f5] dark:bg-[#18181b]/50 border-b border-zinc-300 dark:border-zinc-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-200 font-serif tracking-tight">
                        Add to {selectedSlot ? format(selectedSlot.start, 'MMM d') : ''}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSaveItem} className="p-6 space-y-4">
                    <input 
                        autoFocus
                        type="text"
                        placeholder="Add title"
                        value={newItemTitle}
                        onChange={e => setNewItemTitle(e.target.value)}
                        className="w-full text-2xl font-bold bg-transparent border-b-2 border-transparent focus:border-zinc-500 focus:outline-none placeholder-zinc-300 dark:placeholder-zinc-600 text-zinc-900 dark:text-white"
                    />

                    <div className="flex gap-2">
                         <button 
                            type="button" 
                            onClick={() => setNewItemType('event')}
                            className={`flex-1 py-2 rounded-none text-sm font-medium border ${newItemType === 'event' ? 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300' : 'border-zinc-300 dark:border-zinc-700 text-zinc-600'}`}
                         >
                             Event
                         </button>
                         <button 
                            type="button" 
                            onClick={() => setNewItemType('task')}
                            className={`flex-1 py-2 rounded-none text-sm font-medium border ${newItemType === 'task' ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'border-zinc-300 dark:border-zinc-700 text-zinc-600'}`}
                         >
                             Task
                         </button>
                    </div>

                    {newItemType === 'event' && (
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {(['work', 'personal', 'health', 'other'] as const).map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setNewItemCategory(cat)}
                                    className={`px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest border transition-all ${newItemCategory === cat 
                                        ? cat === 'work' ? 'bg-zinc-100 border-zinc-300 text-zinc-700'
                                        : cat === 'personal' ? 'bg-pink-100 border-pink-300 text-pink-700'
                                        : cat === 'health' ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                                        : 'bg-zinc-100 border-zinc-300 text-zinc-700'
                                        : 'border-zinc-300 text-zinc-400'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
                        <Clock size={18} className="text-zinc-400" />
                        <div className="flex gap-2 items-center flex-1">
                            <input 
                                type="time" 
                                value={startTime} 
                                onChange={e => setStartTime(e.target.value)}
                                className="bg-zinc-100 dark:bg-[#18181b] rounded-sm px-2 py-1 outline-none focus:ring-1 focus:ring-zinc-500"
                            />
                            <span>-</span>
                            <input 
                                type="time" 
                                value={endTime} 
                                onChange={e => setEndTime(e.target.value)}
                                className="bg-zinc-100 dark:bg-[#18181b] rounded-sm px-2 py-1 outline-none focus:ring-1 focus:ring-zinc-500"
                            />
                        </div>
                    </div>

                    {newItemType === 'event' && (
                        <>
                            <div className="flex items-start gap-4 text-sm text-zinc-600 dark:text-zinc-300">
                                <AlignLeft size={18} className="text-zinc-400 mt-1" />
                                <textarea 
                                    value={newItemDesc}
                                    onChange={e => setNewItemDesc(e.target.value)}
                                    placeholder="Add description"
                                    rows={3}
                                    className="flex-1 bg-[#f4f4f5] dark:bg-[#18181b] rounded-none p-3 outline-none focus:ring-1 focus:ring-zinc-500 resize-none"
                                />
                            </div>
                            <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
                                <MapPin size={18} className="text-zinc-400" />
                                <input 
                                    type="text" 
                                    placeholder="Add location" 
                                    className="flex-1 bg-transparent border-b border-zinc-300 dark:border-zinc-700 py-1 focus:outline-none focus:border-zinc-500"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
                         <ImageIcon size={18} className="text-zinc-400" />
                         <label className="flex-1 cursor-pointer hover:text-zinc-500 transition-colors flex items-center gap-2">
                             {newItemImage ? 'Change Image' : 'Add Attachment'}
                             <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                         </label>
                         {newItemImage && (
                            <div className="w-10 h-10 rounded-none overflow-hidden border border-zinc-300 dark:border-zinc-700 relative group">
                                <img src={newItemImage} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setNewItemImage('')} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white">
                                    <X size={12} />
                                </button>
                            </div>
                         )}
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 rounded-none hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-6 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-none shadow-none border border-zinc-300 dark:border-zinc-700 transition-colors font-medium"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default CalendarApp;
