
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, Trash2, Search, FileText, Image as ImageIcon, 
  Sparkles, CheckCircle2, ArrowLeft, Edit3, Eye, Link as LinkIcon,
  Folder as FolderIcon, FolderPlus, ChevronRight, ChevronDown, FolderOpen,
  Star, Pin, PinOff
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import { Note, Folder, Deck, Flashcard, NoteFont } from '../types';
import { generateFlashcardsFromNote, suggestTasksFromNote } from '../services/geminiService';
import { generateId, compressImage } from '../utils';
import { MarkdownEditor } from './MarkdownEditor';

interface NoteAppProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  folders: Folder[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  decks: Deck[];
  setDecks: React.Dispatch<React.SetStateAction<Deck[]>>;
  addFlashcards: (newCards: Omit<Flashcard, 'id'>[]) => void;
  addTasks: (tasks: string[]) => void;
}

interface NoteEditorProps {
  note: Note;
  allNotes: Note[];
  folders: Folder[];
  onSave: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onNavigate: (noteId: string) => void;
  decks: Deck[];
  setDecks: React.Dispatch<React.SetStateAction<Deck[]>>;
  addFlashcards: (newCards: Omit<Flashcard, 'id'>[]) => void;
  addTasks: (tasks: string[]) => void;
  onBack?: () => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ 
  note, allNotes, folders, onSave, onDelete, onNavigate, decks, setDecks, addFlashcards, addTasks, onBack 
}) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [images, setImages] = useState<string[]>(note.images || []);
  const [folderId, setFolderId] = useState<string | undefined>(note.folderId);
  const [fontStyle, setFontStyle] = useState<NoteFont>(note.fontStyle || 'sans');
  const [fontSize, setFontSize] = useState<number>(note.fontSize || 16);
  const [pinned, setPinned] = useState<boolean>(note.pinned || false);
  
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isGenerating, setIsGenerating] = useState(false);

  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdatesRef = React.useRef<Partial<Note>>({});

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setImages(note.images || []);
    setFolderId(note.folderId);
    setFontStyle(note.fontStyle || 'sans');
    setFontSize(note.fontSize || 16);
    setPinned(note.pinned || false);
    setSaveStatus('saved');
    setViewMode('edit');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    pendingUpdatesRef.current = {};
  }, [note.id]); // Intentionally only depend on ID

  const triggerSave = useCallback((updates: Partial<Note>) => {
    setSaveStatus('saving');
    Object.assign(pendingUpdatesRef.current, updates);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      onSave(note.id, { ...pendingUpdatesRef.current, updatedAt: Date.now() });
      pendingUpdatesRef.current = {};
      setSaveStatus('saved');
    }, 1000);
  }, [note.id, onSave]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSaveStatus('unsaved');
    triggerSave({ title: newTitle });
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setSaveStatus('unsaved');
    triggerSave({ content: newContent });
  };

  const handleFontChange = (style: NoteFont) => {
      setFontStyle(style);
      triggerSave({ fontStyle: style });
  };

  const handleFontSizeChange = (size: number) => {
      setFontSize(size);
      triggerSave({ fontSize: size });
  };

  const togglePin = () => {
      const next = !pinned;
      setPinned(next);
      triggerSave({ pinned: next });
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newFolderId = e.target.value || undefined;
      setFolderId(newFolderId);
      triggerSave({ folderId: newFolderId });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        try {
            const compressed = await compressImage(file);
            const newImages = [...images, compressed];
            setImages(newImages);
            triggerSave({ images: newImages });
        } catch (err) { console.error(err); }
    }
  };

  const backlinks = useMemo(() => {
    if (!note.title) return [];
    const normalizedTitle = note.title.toLowerCase();
    return allNotes.filter(n => 
        n.id !== note.id && 
        (n.content || '').toLowerCase().includes(`[[${normalizedTitle}]]`)
    );
  }, [note, allNotes]);

  const renderMarkdownWithWikiLinks = (text: string) => {
    return text.replace(/\[\[(.*?)\]\]/g, (match, linkText) => {
        const targetNote = allNotes.find(n => (n.title || '').toLowerCase() === linkText.toLowerCase());
        const exists = !!targetNote;
        return `[${linkText}](wikilink://${targetNote?.id || 'new'})`;
    });
  };

  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  const components = {
    a: ({ node, ...props }: any) => {
      if (props.href?.startsWith('wikilink://')) {
        const id = props.href.replace('wikilink://', '');
        const exists = id !== 'new';
        return (
          <span 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (exists) onNavigate(id);
            }}
            className={`wiki-link cursor-pointer font-bold ${exists ? 'text-zinc-800 dark:text-zinc-200 hover:underline' : 'text-zinc-400 dark:text-zinc-500 opacity-60'}`}
          >
            {props.children}
          </span>
        );
      }
      return <a {...props} className="text-zinc-800 dark:text-zinc-200 hover:underline" target="_blank" rel="noopener noreferrer" />;
    }
  };

  const handleGenerateFlashcards = async () => {
    setIsGenerating(true);
    try {
        const cards = await generateFlashcardsFromNote({ ...note, title, content });
        let targetDeckId = decks[0]?.id;
        if (!targetDeckId) {
            const newDeck = { id: generateId(), name: 'General', settings: { newCardsPerDay: 20, reviewLimitPerDay: 200, learningSteps: [1, 10], graduatingInterval: 1, easyBonus: 1.3 } };
            setDecks([newDeck]);
            targetDeckId = newDeck.id;
        }
        const cardsToAdd = cards.map(c => ({
            ...c,
            deckId: targetDeckId,
            nextReview: Date.now(),
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            state: 'new' as any,
            lapses: 0
        }));
        addFlashcards(cardsToAdd);
        alert(`Generated ${cards.length} cards`);
    } catch (e) { alert("Failed to generate cards"); } finally { setIsGenerating(false); }
  };

  const handleSuggestTasks = async () => {
      setIsGenerating(true);
      try {
          const tasks = await suggestTasksFromNote(content);
          if (tasks.length) {
              addTasks(tasks);
              alert(`Added ${tasks.length} tasks`);
          } else { alert("No tasks found"); }
      } catch (e) { console.error(e); } finally { setIsGenerating(false); }
  };

  const getFontClass = (style: NoteFont) => {
      switch (style) {
          case 'serif': return 'font-serif';
          case 'mono': return 'font-mono';
          case 'hand': return 'font-hand'; // Assuming you have a custom font-hand, else use generic
          default: return 'font-sans';
      }
  };

  return (
    <div className={`flex flex-col h-full bg-[#fdfdfc] dark:bg-[#18181b] relative ${getFontClass(fontStyle)}`}>
        <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-300 dark:border-zinc-700 bg-[#fdfdfc]/95 dark:bg-[#18181b]/95 sticky top-0 z-10">
            <div className="flex items-center gap-3">
                 {onBack && (
                    <button onClick={onBack} className="md:hidden text-zinc-500"><ArrowLeft size={20} /></button>
                )}
                <div className="flex flex-col">
                    <input 
                        type="text" 
                        value={title}
                        onChange={handleTitleChange}
                        placeholder="Untitled Note"
                        className="text-lg font-bold bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 w-full md:w-96 truncate"
                    />
                    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                        <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved' : 'Synced'}</span>
                        <span className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-700 px-1 rounded">
                             <FolderIcon size={8} />
                             <select 
                                value={folderId || ''} 
                                onChange={handleFolderChange}
                                className="bg-transparent outline-none border-none cursor-pointer"
                             >
                                 <option value="">No Folder</option>
                                 {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                             </select>
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-700/50 p-1 rounded-none">
                 <button onClick={togglePin} className={`p-1.5 rounded-sm transition-all ${pinned ? 'text-yellow-500' : 'text-zinc-400 hover:text-zinc-600'}`} title={pinned ? "Unpin Note" : "Pin Note"}>
                    {pinned ? <Star size={16} fill="currentColor" /> : <Star size={16} />}
                 </button>
                 <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-600 mx-1"></div>
                 {}
                 <div className="flex items-center gap-1 px-2 border-r border-zinc-300 dark:border-zinc-600">
                    {(['sans', 'serif', 'mono', 'hand'] as NoteFont[]).map(s => (
                        <button 
                            key={s} 
                            onClick={() => handleFontChange(s)} 
                            className={`w-6 h-6 flex items-center justify-center rounded-sm text-[10px] font-bold uppercase transition-all ${fontStyle === s ? 'bg-zinc-600 text-white shadow-none' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-600'}`}
                            title={`Switch to ${s} font`}
                        >
                            {s[0]}
                        </button>
                    ))}
                 </div>

                 {}
                 <div className="flex items-center gap-2 px-2 mr-1 border-r border-zinc-300 dark:border-zinc-600">
                    <input 
                        type="range" 
                        min="12" 
                        max="32" 
                        value={fontSize} 
                        onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                        className="w-16 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-none appearance-none cursor-pointer accent-zinc-600"
                    />
                    <span className="text-[10px] font-mono text-zinc-500 w-4">{fontSize}</span>
                 </div>

                 <button onClick={() => setViewMode('edit')} className={`p-1.5 rounded-sm transition-all ${viewMode === 'edit' ? 'bg-[#fdfdfc] dark:bg-zinc-600 text-zinc-800 dark:text-zinc-200 shadow-none' : 'text-zinc-500 hover:text-zinc-700'}`} title="Edit Mode"><Edit3 size={16} /></button>
                 <button onClick={() => setViewMode('preview')} className={`p-1.5 rounded-sm transition-all ${viewMode === 'preview' ? 'bg-[#fdfdfc] dark:bg-zinc-600 text-zinc-800 dark:text-zinc-200 shadow-none' : 'text-zinc-500 hover:text-zinc-700'}`} title="Reading View"><Eye size={16} /></button>
                 <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-600 mx-1"></div>
                 <button onClick={handleGenerateFlashcards} disabled={isGenerating} className={`p-1.5 rounded-sm text-zinc-500 hover:text-purple-600 transition-all ${isGenerating ? 'animate-pulse' : ''}`} title="Generate Flashcards"><Sparkles size={16} /></button>
                 <button onClick={handleSuggestTasks} disabled={isGenerating} className={`p-1.5 rounded-sm text-zinc-500 hover:text-emerald-600 transition-all ${isGenerating ? 'animate-pulse' : ''}`} title="Extract Tasks"><CheckCircle2 size={16} /></button>
                 <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-600 mx-1"></div>
                 <button onClick={() => onDelete(note.id)} className="p-1.5 rounded-sm text-zinc-400 hover:text-red-600 transition-all"><Trash2 size={16} /></button>
            </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col relative" style={{ fontSize: `${fontSize}px` }}>
            {viewMode === 'edit' ? (
                 <MarkdownEditor value={content} onChange={handleContentChange} className={`flex-1 h-full border-none rounded-none p-0 bg-transparent ${getFontClass(fontStyle)}`} placeholder="Start typing..." />
            ) : (
                <div className="flex-1 overflow-y-auto p-8 md:px-12 max-w-3xl mx-auto w-full outline-none">
                    <div className={`prose dark:prose-invert max-w-none markdown-preview ${getFontClass(fontStyle)}`} style={{ fontSize: 'inherit' }}>
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]} 
                            rehypePlugins={[rehypeRaw, rehypeHighlight]}
                            components={components}
                        >
                            {renderMarkdownWithWikiLinks(content || "*No content*")}
                        </ReactMarkdown>
                    </div>
                </div>
            )}
            <div className="absolute bottom-4 left-6 px-2 py-1 bg-[#fdfdfc]/80 dark:bg-[#18181b]/80 backdrop-blur-sm rounded-sm border border-zinc-300 dark:border-zinc-700 text-[10px] font-mono text-zinc-500 z-20">
                {wordCount} words
            </div>
            {viewMode === 'edit' && (
                <label className="absolute bottom-6 right-6 p-3 bg-zinc-600 hover:bg-zinc-700 text-white rounded-sm shadow-none border-2 border-zinc-400 dark:border-zinc-600 cursor-pointer transition-transform hover:scale-105 active:scale-95 z-20">
                    <ImageIcon size={20} /><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
            )}
        </div>

        {images.length > 0 && (
            <div className="p-4 border-t border-zinc-300 dark:border-zinc-700 bg-[#f4f4f5] dark:bg-[#09090b]/30 flex gap-3 overflow-x-auto">
                 {images.map((img, i) => (
                     <div key={i} className="relative group w-20 h-20 flex-shrink-0 rounded-none overflow-hidden border border-zinc-300 dark:border-zinc-700">
                         <img src={img} className="w-full h-full object-cover" />
                         <button onClick={() => { const newImgs = images.filter((_, idx) => idx !== i); setImages(newImgs); triggerSave({ images: newImgs }); }} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"><Trash2 size={16} /></button>
                     </div>
                 ))}
            </div>
        )}

        {backlinks.length > 0 && (
            <div className="border-t border-zinc-300 dark:border-zinc-700 bg-[#f4f4f5]/50 dark:bg-[#18181b]/50 p-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2 font-serif tracking-tight"><LinkIcon size={12} /> Linked Mentions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {backlinks.map(bl => (
                        <button key={bl.id} onClick={() => onNavigate(bl.id)} className="text-left p-3 rounded-none bg-[#fdfdfc] dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 transition-all group">
                            <div className="font-medium text-sm text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-800 mb-1">{bl.title || "Untitled"}</div>
                            <div className="text-xs text-zinc-400 line-clamp-1 opacity-70">{bl.content}</div>
                        </button>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

const NoteApp: React.FC<NoteAppProps> = ({ notes, setNotes, folders, setFolders, ...props }) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder] = useState<'updated' | 'alpha'>('updated');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  const toggleFolder = (id: string) => {
      const next = new Set(expandedFolders);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setExpandedFolders(next);
  };

  const createFolder = () => {
      const name = prompt("Folder Name:");
      if (!name) return;
      setFolders(prev => [...prev, { id: generateId(), name, createdAt: Date.now() }]);
  };

  const deleteFolder = (id: string) => {
      if (confirm("Delete folder? All notes inside will be moved to 'Uncategorized'.")) {
          setNotes(prev => prev.map(n => n.folderId === id ? { ...n, folderId: undefined } : n));
          setFolders(prev => prev.filter(f => f.id !== id));
      }
  };

  const renameFolder = (id: string, currentName: string) => {
      const name = prompt("Rename Folder:", currentName);
      if (!name || name === currentName) return;
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
  };

  const createNote = (fId?: string) => {
    const newNote: Note = {
      id: generateId(),
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      images: [],
      folderId: fId,
      fontStyle: 'sans'
    };
    setNotes(prev => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const handleDeleteNote = (id: string) => {
      if (confirm("Delete this note?")) {
          setNotes(prev => prev.filter(n => n.id !== id));
          if (selectedNoteId === id) setSelectedNoteId(null);
      }
  };

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  const getNotesForFolder = (fId?: string) => {
      return notes.filter(n => {
          const matchFolder = fId === undefined ? !n.folderId : n.folderId === fId;
          const matchSearch = searchQuery ? ((n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (n.content || '').toLowerCase().includes(searchQuery.toLowerCase())) : true;
          return matchFolder && matchSearch;
      }).sort((a, b) => {
          if (sortOrder === 'updated') return (b.updatedAt || 0) - (a.updatedAt || 0);
          return (a.title || '').localeCompare(b.title || '');
      });
  };

  return (
    <div className="flex h-full bg-[#fdfdfc] dark:bg-[#09090b] overflow-hidden">
      <div className={`
        flex-col w-full md:w-64 bg-[#f4f4f5] dark:bg-[#18181b]/30 border-r border-zinc-300 dark:border-zinc-700 flex-shrink-0 overflow-hidden transition-all
        ${selectedNoteId ? 'hidden md:flex' : 'flex'}
      `}>
          <div className="p-3 border-b border-zinc-300 dark:border-zinc-700 flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Explorer</span>
                  <div className="flex gap-1">
                      <button onClick={() => createNote()} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-sm text-zinc-500" title="New Note"><Plus size={14} /></button>
                  </div>
              </div>
              <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full pl-8 pr-2 py-1.5 bg-[#fdfdfc] dark:bg-[#18181b] border border-zinc-300 dark:border-zinc-700 rounded-sm text-xs focus:ring-1 focus:ring-zinc-500/50 outline-none text-zinc-800 dark:text-zinc-200" />
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {notes.some(n => n.pinned) && (
                  <div className="mb-4">
                      <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Star size={10} className="text-yellow-500 fill-yellow-500" /> Pinned
                      </div>
                      {notes.filter(n => n.pinned).map(note => (
                          <button key={note.id} onClick={() => setSelectedNoteId(note.id)} className={`w-full text-left px-2 py-1.5 rounded-sm flex items-center gap-2 group transition-colors ${selectedNoteId === note.id ? 'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700/50'}`}>
                              <FileText size={12} className="opacity-50" />
                              <span className={`text-xs truncate font-medium ${!note.title && 'italic opacity-70'}`}>{note.title || 'Untitled'}</span>
                          </button>
                      ))}
                  </div>
              )}

              <div className="mb-1">
                  <div 
                    onClick={() => toggleFolder('root')}
                    className="flex items-center justify-between px-2 py-1.5 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-sm cursor-pointer group"
                  >
                      <div className="flex items-center gap-2">
                        {expandedFolders.has('root') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <FolderOpen size={14} className="opacity-50" />
                        <span>Uncategorized</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono opacity-50 group-hover:opacity-0">{getNotesForFolder(undefined).length}</span>
                          <button onClick={(e) => { e.stopPropagation(); createNote(undefined); }} className="absolute right-3 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-opacity" title="New Note"><Plus size={12} /></button>
                      </div>
                  </div>
                  {expandedFolders.has('root') && (
                      <div className="ml-4 border-l border-zinc-300 dark:border-zinc-700 pl-2">
                          {getNotesForFolder(undefined).map(note => (
                              <div key={note.id} className={`w-full flex items-center justify-between px-2 py-1.5 rounded-sm group transition-colors cursor-pointer ${selectedNoteId === note.id ? 'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700/50'}`} onClick={() => setSelectedNoteId(note.id)}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                      <FileText size={12} className="opacity-50 flex-shrink-0" />
                                      <span className={`text-xs truncate font-medium ${!note.title && 'italic opacity-70'}`}>{note.title || 'Untitled'}</span>
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }} className="lg:opacity-0 lg:group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-red-500 rounded-sm transition-opacity">
                                      <Trash2 size={12} />
                                  </button>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              {folders.map(folder => (
                  <div key={folder.id} className="mb-1">
                      <div 
                        onClick={() => toggleFolder(folder.id)}
                        className="flex items-center justify-between px-2 py-1.5 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-sm cursor-pointer group"
                      >
                          <div className="flex items-center gap-2">
                            {expandedFolders.has(folder.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <FolderIcon size={14} className="opacity-50" />
                            <span className="truncate">{folder.name}</span>
                          </div>
                          <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                             <button onClick={(e) => { e.stopPropagation(); createNote(folder.id); }} className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" title="New Note"><Plus size={12} /></button>
                             <button onClick={(e) => { e.stopPropagation(); renameFolder(folder.id, folder.name); }} className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" title="Rename"><Edit3 size={12} /></button>
                             <button onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }} className="p-1 text-zinc-400 hover:text-red-500" title="Delete Folder"><Trash2 size={12} /></button>
                          </div>
                      </div>
                      {expandedFolders.has(folder.id) && (
                          <div className="ml-4 border-l border-zinc-300 dark:border-zinc-700 pl-2">
                              {getNotesForFolder(folder.id).map(note => (
                                  <div key={note.id} className={`w-full flex items-center justify-between px-2 py-1.5 rounded-sm group transition-colors cursor-pointer ${selectedNoteId === note.id ? 'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700/50'}`} onClick={() => setSelectedNoteId(note.id)}>
                                      <div className="flex items-center gap-2 overflow-hidden">
                                          <FileText size={12} className="opacity-50 flex-shrink-0" />
                                          <span className={`text-xs truncate font-medium ${!note.title && 'italic opacity-70'}`}>{note.title || 'Untitled'}</span>
                                      </div>
                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }} className="lg:opacity-0 lg:group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-red-500 rounded-sm transition-opacity">
                                          <Trash2 size={12} />
                                      </button>
                                  </div>
                              ))}
                              {getNotesForFolder(folder.id).length === 0 && <div className="p-2 text-[10px] text-zinc-400 italic">Empty</div>}
                          </div>
                      )}
                  </div>
              ))}
              <div className="mt-4 px-2">
                  <button onClick={createFolder} className="w-full flex items-center justify-center gap-2 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-sm transition-colors border border-dashed border-zinc-300 dark:border-zinc-700">
                      <FolderPlus size={14} />
                      <span>Create Folder</span>
                  </button>
              </div>
          </div>
      </div>

      <div className={`flex-1 bg-[#fdfdfc] dark:bg-[#18181b] relative transition-all flex flex-col ${!selectedNoteId ? 'hidden md:flex' : 'flex'}`}>
          {selectedNote ? (
              <NoteEditor 
                key={selectedNote.id}
                note={selectedNote} 
                allNotes={notes}
                folders={folders}
                onSave={handleUpdateNote} 
                onDelete={handleDeleteNote}
                onNavigate={setSelectedNoteId}
                {...props}
                onBack={() => setSelectedNoteId(null)}
              />
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-600">
                  <div className="w-24 h-24 bg-[#f4f4f5] dark:bg-[#18181b] rounded-sm flex items-center justify-center mb-6">
                      <FolderIcon size={48} className="opacity-20" />
                  </div>
                  <p className="font-medium text-lg">Select a file from the explorer</p>
                  <button onClick={() => createNote()} className="mt-4 text-zinc-500 hover:underline text-sm">Create a new note</button>
              </div>
          )}
      </div>
    </div>
  );
};

export default NoteApp;
