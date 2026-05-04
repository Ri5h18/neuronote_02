
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, Circle, Trash2, Calendar as CalIcon, Tag, Image as ImageIcon, X, Save, ChevronDown, ChevronRight, ListTodo } from 'lucide-react';
import { Todo } from '../types';
import { format, isToday, isTomorrow } from 'date-fns';
import { generateId, compressImage } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TodoAppProps {
  todos: Todo[];
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
}

const TodoApp: React.FC<TodoAppProps> = ({ todos, setTodos }) => {
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDate, setNewTodoDate] = useState<string>(''); // YYYY-MM-DD
  const [newTodoImage, setNewTodoImage] = useState<string>('');
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [expandedTodoId, setExpandedTodoId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    
    const dueDate = newTodoDate ? new Date(newTodoDate).getTime() : null;

    const newTodo: Todo = {
      id: generateId(),
      text: newTodoText,
      completed: false,
      priority: newTodoPriority,
      dueDate: dueDate,
      image: newTodoImage || undefined,
      subtasks: []
    };
    setTodos([newTodo, ...todos]);
    setNewTodoText('');
    setNewTodoDate('');
    setNewTodoImage('');
    setNewTodoPriority('medium');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const compressed = await compressImage(file);
              setNewTodoImage(compressed);
          } catch (e) {
              console.error(e);
          }
      }
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
    setEditPriority(todo.priority);
    if (todo.dueDate && !isNaN(todo.dueDate)) {
        setEditDate(format(new Date(todo.dueDate), 'yyyy-MM-dd'));
    } else {
        setEditDate('');
    }
  };

  const saveEdit = () => {
    if (editingId) {
      const dueDate = editDate ? new Date(editDate).getTime() : null;
      setTodos(todos.map(t => t.id === editingId ? { ...t, text: editText, dueDate, priority: editPriority } : t));
      setEditingId(null);
    }
  };

  const cancelEdit = () => {
      setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const addSubtask = (todoId: string, text: string) => {
      setTodos(todos.map(t => t.id === todoId ? {
          ...t,
          subtasks: [...(t.subtasks || []), { id: generateId(), text, completed: false }]
      } : t));
  };

  const toggleSubtask = (todoId: string, subtaskId: string) => {
      setTodos(todos.map(t => t.id === todoId ? {
          ...t,
          subtasks: t.subtasks?.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s)
      } : t));
  };

  const toggleExpand = (id: string) => {
      setExpandedTodoId(expandedTodoId === id ? null : id);
  };

  const deleteSubtask = (todoId: string, subtaskId: string) => {
      setTodos(todos.map(t => t.id === todoId ? {
          ...t,
          subtasks: t.subtasks?.filter(s => s.id !== subtaskId)
      } : t));
  };

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const formatDateLabel = (timestamp?: number | null) => {
    if (!timestamp || isNaN(timestamp)) return '';
    const date = new Date(timestamp);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      <div className="bg-[#fdfdfc] dark:bg-[#18181b] rounded-sm shadow-none border border-zinc-300 dark:border-zinc-700 flex flex-col flex-1 overflow-hidden">
        <div className="p-8 border-b border-zinc-300 dark:border-zinc-700">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6 font-serif tracking-tight">Tasks</h1>
          
          <form onSubmit={addTodo} className="relative group">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 bg-[#f4f4f5] dark:bg-[#09090b]/50 rounded-none border border-zinc-300 dark:border-zinc-700 focus-within:ring-2 focus-within:ring-zinc-500/20 focus-within:border-zinc-500 transition-all p-2">
                    <Plus className="text-zinc-400 ml-2" size={24} />
                    <input
                        type="text"
                        value={newTodoText}
                        onChange={(e) => setNewTodoText(e.target.value)}
                        placeholder="Add a new task..."
                        className="flex-1 bg-transparent py-2 px-2 focus:outline-none text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 h-10"
                    />
                    
                    <select 
                        value={newTodoPriority} 
                        onChange={e => setNewTodoPriority(e.target.value as any)}
                        className={`text-xs font-bold px-2 py-1 rounded-none bg-[#fdfdfc] dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-700 outline-none ${newTodoPriority === 'high' ? 'text-red-500' : newTodoPriority === 'medium' ? 'text-orange-500' : 'text-blue-500'}`}
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>

                    <label className={`cursor-pointer p-2 rounded-none hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors ${newTodoImage ? 'text-zinc-500' : 'text-zinc-400'}`} title="Add image">
                        <ImageIcon size={20} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    <button 
                        type="submit" 
                        disabled={!newTodoText.trim()}
                        className="bg-zinc-600 hover:bg-zinc-700 text-white p-2 rounded-none transition-colors border border-zinc-400 dark:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={20} />
                    </button>
                </div>
                {newTodoImage && (
                    <div className="relative inline-block w-20 h-20 group ml-2 mb-2">
                        <img src={newTodoImage} className="w-full h-full object-cover rounded-sm border border-zinc-300 dark:border-zinc-700" />
                        <button type="button" onClick={() => setNewTodoImage('')} className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white rounded-sm">
                            <X size={16} />
                        </button>
                    </div>
                )}
            </div>
          </form>

          <div className="flex items-center justify-between mt-6">
              <div className="flex gap-2">
                  <button onClick={() => setFilter('all')} className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors ${filter === 'all' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>All</button>
                  <button onClick={() => setFilter('active')} className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors ${filter === 'active' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>Active</button>
                  <button onClick={() => setFilter('completed')} className={`px-3 py-1 text-sm font-medium rounded-sm transition-colors ${filter === 'completed' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>Completed</button>
              </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-[#f4f4f5] dark:bg-[#09090b]/50">
          <AnimatePresence>
            {filteredTodos.map(todo => (
              <motion.div 
                key={todo.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-[#fdfdfc] dark:bg-[#18181b] border-l-4 rounded-r-sm shadow-none border-y border-r border-zinc-300 dark:border-zinc-700 mb-3 group hover:border-zinc-400 dark:hover:border-zinc-600 transition-all ${todo.priority === 'high' ? 'border-l-red-500' : todo.priority === 'medium' ? 'border-l-orange-500' : 'border-l-blue-500'} ${todo.completed ? 'opacity-60' : ''}`}
              >
                  <div className="p-4 flex items-start gap-4">
                      <button 
                          onClick={() => toggleTodo(todo.id)}
                          className={`mt-1 flex-shrink-0 w-6 h-6 rounded-sm border-2 flex items-center justify-center transition-colors ${todo.completed ? 'bg-zinc-500 border-zinc-500 text-white' : 'border-zinc-300 dark:border-zinc-600'}`}
                      >
                          {todo.completed && <Check size={14} strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                          {editingId === todo.id ? (
                              <input 
                                  ref={editInputRef}
                                  type="text" 
                                  value={editText} 
                                  onChange={e => setEditText(e.target.value)}
                                  onBlur={() => saveEdit()}
                                  onKeyDown={handleKeyDown}
                                  className="w-full bg-transparent border-b-2 border-zinc-500 focus:outline-none text-zinc-900 dark:text-white text-lg font-medium"
                              />
                          ) : (
                              <div className="flex flex-col">
                                  <span 
                                      onDoubleClick={() => startEditing(todo)}
                                      className={`text-lg font-medium truncate cursor-text ${todo.completed ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-white'}`}
                                  >
                                      {todo.text}
                                  </span>
                                  {todo.dueDate && (
                                      <span className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-widest flex items-center gap-1">
                                          <CalIcon size={10} />
                                          {formatDateLabel(todo.dueDate)}
                                      </span>
                                  )}
                              </div>
                          )}
                          {todo.image && (
                              <div className="mt-3 max-w-xs rounded-sm overflow-hidden border border-zinc-200 dark:border-zinc-800">
                                  <img src={todo.image} alt="Task attachment" className="w-full object-cover max-h-40" />
                              </div>
                          )}
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => toggleExpand(todo.id)}
                            className="p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm"
                            title="Subtasks"
                          >
                              <ListTodo size={18} />
                          </button>
                          <button 
                            onClick={() => deleteTodo(todo.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm"
                          >
                              <Trash2 size={18} />
                          </button>
                      </div>
                  </div>

              <AnimatePresence>
                  {expandedTodoId === todo.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                          <div className="mt-4 pt-4 border-t border-zinc-300 dark:border-zinc-700 space-y-2">
                              <div className="flex items-center gap-2 mb-2">
                                  <ListTodo size={14} className="text-zinc-400" />
                                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Subtasks</span>
                              </div>
                              {todo.subtasks?.map(sub => (
                                  <div key={sub.id} className="flex items-center justify-between group/sub ml-2">
                                      <div className="flex items-center gap-3">
                                          <button 
                                            onClick={() => toggleSubtask(todo.id, sub.id)}
                                            className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${sub.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300 dark:border-zinc-600 text-transparent'}`}
                                          >
                                              <Check size={10} strokeWidth={4} />
                                          </button>
                                          <span className={`text-sm ${sub.completed ? 'line-through text-zinc-400' : 'text-zinc-600 dark:text-zinc-300'}`}>{sub.text}</span>
                                      </div>
                                      <button onClick={() => deleteSubtask(todo.id, sub.id)} className="opacity-0 group-hover/sub:opacity-100 text-zinc-300 hover:text-red-500 transition-all"><X size={14} /></button>
                                  </div>
                              ))}
                              <form 
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const input = e.currentTarget.elements.namedItem('subtask') as HTMLInputElement;
                                    if (input.value.trim()) {
                                        addSubtask(todo.id, input.value.trim());
                                        input.value = '';
                                    }
                                }}
                                className="flex items-center gap-2 ml-2 mt-2"
                              >
                                  <Plus size={14} className="text-zinc-400" />
                                  <input 
                                    name="subtask"
                                    type="text" 
                                    placeholder="Add subtask..." 
                                    className="flex-1 bg-transparent border-none focus:outline-none text-sm text-zinc-600 dark:text-zinc-300"
                                  />
                              </form>
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>
            </motion.div>
          ))}
          </AnimatePresence>
          
          {filteredTodos.length === 0 && (
            <div className="text-center py-20 text-zinc-400 flex flex-col items-center">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-[#18181b] rounded-sm flex items-center justify-center mb-4">
                  <Check size={32} className="text-zinc-300 dark:text-zinc-600" />
              </div>
              <p>No tasks found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodoApp;
