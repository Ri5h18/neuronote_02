
import React, { useState, useEffect, useRef } from 'react';
import { Clock as ClockIcon, Timer, Bell, Play, Pause, RotateCcw, Plus, Trash2, X, Flag, Coffee, Brain, Edit2, Save } from 'lucide-react';
import { Alarm } from '../types';
import { generateId } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ClockAppProps {
  alarms: Alarm[];
  setAlarms: React.Dispatch<React.SetStateAction<Alarm[]>>;
}

const ClockApp: React.FC<ClockAppProps> = ({ alarms, setAlarms }) => {
  const [activeTab, setActiveTab] = useState<'clock' | 'stopwatch' | 'alarm' | 'pomodoro'>('clock');

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col bg-[#fdfdfc] dark:bg-[#18181b] rounded-sm shadow-none border border-zinc-300 dark:border-zinc-700 overflow-hidden">
      {}
      <div className="flex border-b border-zinc-300 dark:border-zinc-700 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('clock')}
          className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'clock' ? 'text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900/20' : 'text-zinc-500 hover:bg-[#f4f4f5] dark:hover:bg-zinc-700/50'}`}
        >
          <ClockIcon size={20} /> Clock
        </button>
        <button 
          onClick={() => setActiveTab('pomodoro')}
          className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'pomodoro' ? 'text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900/20' : 'text-zinc-500 hover:bg-[#f4f4f5] dark:hover:bg-zinc-700/50'}`}
        >
          <Brain size={20} /> Pomodoro
        </button>
        <button 
          onClick={() => setActiveTab('stopwatch')}
          className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'stopwatch' ? 'text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900/20' : 'text-zinc-500 hover:bg-[#f4f4f5] dark:hover:bg-zinc-700/50'}`}
        >
          <Timer size={20} /> Stopwatch
        </button>
        <button 
          onClick={() => setActiveTab('alarm')}
          className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'alarm' ? 'text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900/20' : 'text-zinc-500 hover:bg-[#f4f4f5] dark:hover:bg-zinc-700/50'}`}
        >
          <Bell size={20} /> Alarm
        </button>
      </div>

      {}
      <div className="flex-1 p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
            >
                {activeTab === 'clock' && <WorldClock />}
                {activeTab === 'pomodoro' && <PomodoroTimer />}
                {activeTab === 'stopwatch' && <Stopwatch />}
                {activeTab === 'alarm' && <AlarmManager alarms={alarms} setAlarms={setAlarms} />}
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const WorldClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
      <div className="space-y-2">
        <motion.h2 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-8xl md:text-9xl font-bold text-zinc-900 dark:text-white font-mono tracking-tighter tabular-nums"
        >
          {time.toLocaleTimeString([], { hour12: false })}
        </motion.h2>
        <p className="text-2xl text-zinc-500 dark:text-zinc-400 font-medium">
          {time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
};

const PomodoroTimer = () => {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [mode, setMode] = useState<'work' | 'break'>('work');
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = window.setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (mode === 'work') {
                setMode('break');
                setTimeLeft(5 * 60);
                alert("Time for a break!");
            } else {
                setMode('work');
                setTimeLeft(25 * 60);
                alert("Back to work!");
            }
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, timeLeft, mode]);

    const toggleTimer = () => setIsRunning(!isRunning);
    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const progress = 1 - (timeLeft / (mode === 'work' ? 25 * 60 : 5 * 60));

    return (
        <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto">
            <div className="relative w-64 h-64 flex items-center justify-center mb-12">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle 
                        cx="128" cy="128" r="120" 
                        className="stroke-zinc-100 dark:stroke-zinc-700 fill-none" 
                        strokeWidth="8"
                    />
                    <motion.circle 
                        cx="128" cy="128" r="120" 
                        className={`fill-none ${mode === 'work' ? 'stroke-zinc-600' : 'stroke-emerald-500'}`}
                        strokeWidth="8"
                        strokeDasharray="754"
                        animate={{ strokeDashoffset: 754 * (1 - progress) }}
                        transition={{ duration: 1, ease: "linear" }}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="text-center z-10">
                    <div className="text-5xl font-mono font-bold text-zinc-900 dark:text-white tabular-nums">
                        {formatTime(timeLeft)}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 mt-1">
                        {mode === 'work' ? 'Focus' : 'Break'}
                    </div>
                </div>
            </div>

            <div className="flex gap-4">
                <button 
                    onClick={() => {
                        setMode(mode === 'work' ? 'break' : 'work');
                        setTimeLeft(mode === 'work' ? 5 * 60 : 25 * 60);
                        setIsRunning(false);
                    }}
                    className="w-14 h-14 rounded-sm flex items-center justify-center bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                >
                    {mode === 'work' ? <Coffee size={20} /> : <Brain size={20} />}
                </button>
                
                <button 
                    onClick={toggleTimer}
                    className={`w-20 h-20 rounded-sm flex items-center justify-center text-white shadow-none border-2 border-zinc-400 dark:border-zinc-600 transition-transform active:scale-95 ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-zinc-600 hover:bg-zinc-700'}`}
                >
                    {isRunning ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                </button>

                <button 
                    onClick={resetTimer}
                    className="w-14 h-14 rounded-sm flex items-center justify-center bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                >
                    <RotateCcw size={20} />
                </button>
            </div>
        </div>
    );
};

const Stopwatch = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      const startTime = Date.now() - time;
      intervalRef.current = window.setInterval(() => {
        setTime(Date.now() - startTime);
      }, 10);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setTime(0);
    setLaps([]);
  };

  const addLap = () => {
    setLaps([time, ...laps]);
  };

  const formatTime = (ms: number) => {
    const date = new Date(ms);
    const m = date.getUTCMinutes().toString().padStart(2, '0');
    const s = date.getUTCSeconds().toString().padStart(2, '0');
    const cs = Math.floor(date.getUTCMilliseconds() / 10).toString().padStart(2, '0');
    return `${m}:${s}.${cs}`;
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto">
      <div className="flex-1 flex flex-col items-center justify-center mb-8">
        <div className="text-7xl font-mono font-bold text-zinc-900 dark:text-white mb-8 tabular-nums">
          {formatTime(time)}
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={resetTimer}
            className="w-14 h-14 rounded-sm flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
            title="Reset"
          >
            <RotateCcw size={20} />
          </button>
          
          <button 
            onClick={toggleTimer}
            className={`w-20 h-20 rounded-sm flex items-center justify-center text-white shadow-none border-2 border-zinc-400 dark:border-zinc-600 transition-transform active:scale-95 ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
          >
            {isRunning ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
          </button>

          <button 
            onClick={addLap}
            disabled={!isRunning}
            className="w-14 h-14 rounded-sm flex items-center justify-center bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50"
            title="Lap"
          >
            <Flag size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto border-t border-zinc-300 dark:border-zinc-700 pt-4">
        {laps.length > 0 && (
          <div className="space-y-2">
            {laps.map((lap, index) => (
              <div key={index} className="flex justify-between items-center p-3 rounded-none bg-[#f4f4f5] dark:bg-[#09090b]/50 text-zinc-700 dark:text-zinc-300">
                <span className="font-medium text-zinc-500">Lap {laps.length - index}</span>
                <span className="font-mono text-xl">{formatTime(lap)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AlarmManager: React.FC<{ alarms: Alarm[], setAlarms: React.Dispatch<React.SetStateAction<Alarm[]>> }> = ({ alarms, setAlarms }) => {
  const [newTime, setNewTime] = useState('08:00');
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState('08:00');
  const [editLabel, setEditLabel] = useState('');

  const addAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTime) return;

    setAlarms([...alarms, {
      id: generateId(),
      time: newTime,
      label: newLabel || 'Alarm',
      active: true
    }]);
    setNewLabel('');
  };

  const toggleAlarm = (id: string) => {
    setAlarms(alarms.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const deleteAlarm = (id: string) => {
    setAlarms(alarms.filter(a => a.id !== id));
  };

  const startEditing = (alarm: Alarm) => {
    setEditingId(alarm.id);
    setEditTime(alarm.time);
    setEditLabel(alarm.label);
  };

  const saveEdit = () => {
    if (editingId) {
      setAlarms(alarms.map(a => a.id === editingId ? { ...a, time: editTime, label: editLabel } : a));
      setEditingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto">
      <form onSubmit={addAlarm} className="bg-[#f4f4f5] dark:bg-[#09090b]/50 p-6 rounded-sm mb-8 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1">Time</label>
          <input 
            type="time" 
            value={newTime} 
            onChange={e => setNewTime(e.target.value)}
            className="w-full text-3xl font-bold bg-transparent border-b-2 border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 focus:outline-none py-1 text-zinc-900 dark:text-white"
          />
        </div>
        <div className="flex-[2]">
          <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1">Label</label>
          <input 
            type="text" 
            value={newLabel} 
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Alarm name"
            className="w-full text-lg bg-transparent border-b-2 border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 focus:outline-none py-2 text-zinc-900 dark:text-white"
          />
        </div>
        <button 
          type="submit"
          className="bg-zinc-600 hover:bg-zinc-700 text-white p-3 rounded-none transition-colors shadow-none border-2 border-zinc-400 dark:border-zinc-600 shadow-zinc-500/30"
        >
          <Plus size={24} />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-3">
        {alarms.map(alarm => (
          <div key={alarm.id} className="flex items-center justify-between p-4 bg-[#f4f4f5] dark:bg-[#09090b]/30 rounded-sm border border-zinc-300 dark:border-zinc-700/50">
            {editingId === alarm.id ? (
                <div className="flex-1 flex items-center gap-4 mr-4">
                  <input 
                    type="time" 
                    value={editTime} 
                    onChange={e => setEditTime(e.target.value)}
                    className="text-2xl font-bold bg-transparent border-b-2 border-zinc-500 focus:outline-none py-1 text-zinc-900 dark:text-white max-w-[120px]"
                  />
                  <input 
                    type="text" 
                    value={editLabel} 
                    onChange={e => setEditLabel(e.target.value)}
                    placeholder="Alarm name"
                    className="flex-1 text-lg bg-transparent border-b-2 border-zinc-500 focus:outline-none py-1 text-zinc-900 dark:text-white"
                  />
                </div>
            ) : (
                <div>
                  <div className={`text-3xl font-bold font-mono ${alarm.active ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-600'}`}>
                    {alarm.time}
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">{alarm.label}</div>
                </div>
            )}
            
            <div className="flex items-center gap-2">
               {editingId === alarm.id ? (
                   <>
                      <button 
                        onClick={saveEdit}
                        className="text-white bg-zinc-600 hover:bg-zinc-700 p-2 rounded-none transition-colors flex items-center gap-1 text-xs font-bold"
                      >
                        <Save size={16} /> Save
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="text-zinc-600 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-zinc-300 p-2 rounded-none transition-colors text-xs font-bold"
                      >
                        Cancel
                      </button>
                   </>
               ) : (
                   <>
                       <label className="relative inline-flex items-center cursor-pointer mr-2">
                        <input type="checkbox" checked={alarm.active} onChange={() => toggleAlarm(alarm.id)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-zinc-300 dark:peer-focus:ring-zinc-800 rounded-sm peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#fdfdfc] after:border-zinc-300 after:border after:rounded-sm after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-zinc-600"></div>
                      </label>
                      <button 
                        onClick={() => startEditing(alarm)}
                        className="text-zinc-400 hover:text-zinc-500 p-2 rounded-none hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button 
                        onClick={() => deleteAlarm(alarm.id)}
                        className="text-zinc-400 hover:text-red-500 p-2 rounded-none hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                   </>
               )}
            </div>
          </div>
        ))}
        {alarms.length === 0 && (
          <div className="text-center py-10 text-zinc-400">
            <Bell size={40} className="mx-auto mb-2 opacity-30" />
            <p>No alarms set</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClockApp;
