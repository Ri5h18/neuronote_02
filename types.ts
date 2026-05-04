
export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export type NoteFont = 'sans' | 'serif' | 'mono' | 'hand';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  images?: string[]; // Array of Base64 strings
  folderId?: string; // Reference to Folder id
  fontStyle?: NoteFont;
  fontSize?: number;
  pinned?: boolean;
}

export type FlashcardState = 'new' | 'learning' | 'review' | 'relearning';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  frontImage?: string; // Base64 string for the image
  backImage?: string; // Base64 string for the image
  deckId: string;
  
  state: FlashcardState;
  nextReview: number; // Timestamp
  interval: number; // In minutes for learning, days for review
  easeFactor: number; // Default 2.5
  repetitions: number;
  lapses: number; // Times failed
}

export interface DeckSettings {
  newCardsPerDay: number;
  reviewLimitPerDay: number;
  learningSteps: number[]; // e.g., [1, 10] minutes
  graduatingInterval: number; // days
  easyBonus: number; // multiplier
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  settings: DeckSettings;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: number | null;
  priority: 'low' | 'medium' | 'high';
  image?: string; // Base64 string
  subtasks?: { id: string; text: string; completed: boolean }[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  description?: string;
  type: 'work' | 'personal' | 'health' | 'other' | 'task' | 'study' | 'custom';
  image?: string; // Base64 string
}

export interface Alarm {
  id: string;
  time: string; // HH:MM 24h format
  label: string;
  active: boolean;
}

export interface StudyLog {
  date: string; // YYYY-MM-DD
  count: number;
}

export enum AppView {
  DASHBOARD = 'dashboard',
  NOTES = 'notes',
  FLASHCARDS = 'flashcards',
  TODO = 'todo',
  CALENDAR = 'calendar',
  CLOCK = 'clock',
}
