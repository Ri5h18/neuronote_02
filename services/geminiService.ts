
import { GoogleGenAI, Type } from "@google/genai";
import { Note, Flashcard, Todo, CalendarEvent } from "../types";

const getApiKey = (): string | undefined => {
  return process.env.GEMINI_API_KEY || process.env.API_KEY;
};

const flashcardSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      front: { type: Type.STRING, description: "The question or concept on the front of the card" },
      back: { type: Type.STRING, description: "The answer or definition on the back of the card" }
    },
    required: ["front", "back"],
    propertyOrdering: ["front", "back"]
  }
};

export const generateFlashcardsFromNote = async (note: Note, count: number = 5): Promise<{front: string, back: string}[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const prompt = `
      Create ${count} high-quality flashcards based on the following note content.
      The flashcards should key concepts, definitions, and important details.
      Keep the 'front' concise and the 'back' informative but clear.

      Note Title: ${note.title}
      Note Content:
      ${note.content}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: flashcardSchema,
        temperature: 0.3, // Lower temperature for more factual extraction
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as {front: string, back: string}[];
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw error;
  }
};

export const suggestTasksFromNote = async (noteContent: string): Promise<string[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return [];

    const ai = new GoogleGenAI({ apiKey });
    
    const taskSchema = {
        type: Type.ARRAY,
        items: { type: Type.STRING }
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Identify actionable tasks or to-do items implied in this text. Return a JSON list of strings. Text: ${noteContent}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: taskSchema
            }
        });
        
        const text = response.text;
        if(!text) return [];
        return JSON.parse(text);
    } catch (e) {
        console.error(e);
        return [];
    }
}


interface AppContext {
    notes: Note[];
    todos: Todo[];
    events: CalendarEvent[];
    flashcards: Flashcard[];
}


const findRelevantContext = (query: string, context: AppContext) => {
    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 3);
    
    const relevantNotes = context.notes.filter(note => {
        const text = (note.title + " " + note.content).toLowerCase();
        return keywords.some(k => text.includes(k));
    }).slice(0, 10); // Top 10 matches

    const relevantTodos = context.todos.filter(todo => {
        const text = todo.text.toLowerCase();
        return keywords.some(k => text.includes(k));
    }).slice(0, 10);

    const relevantEvents = context.events.filter(event => {
        const text = (event.title + " " + (event.description || "")).toLowerCase();
        return keywords.some(k => text.includes(k));
    }).slice(0, 10);

    const relevantFlashcards = context.flashcards.filter(card => {
        const text = (card.front + " " + card.back).toLowerCase();
        return keywords.some(k => text.includes(k));
    }).slice(0, 10);

    const finalNotes = relevantNotes.length > 0 ? relevantNotes : context.notes.slice(0, 5);
    const finalTodos = relevantTodos.length > 0 ? relevantTodos : context.todos.slice(0, 10);
    const finalEvents = relevantEvents.length > 0 ? relevantEvents : context.events.slice(0, 5);
    const finalFlashcards = relevantFlashcards.length > 0 ? relevantFlashcards : context.flashcards.slice(0, 5);

    return { notes: finalNotes, todos: finalTodos, events: finalEvents, flashcards: finalFlashcards };
};

export const getChatResponseStream = async (
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    newMessage: string,
    context: AppContext,
    onChunk: (text: string) => void
) => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });

    const retrieved = findRelevantContext(newMessage, context);

    const contextString = `
    You are NeuroNote AI, an advanced productivity assistant.
    
    CURRENT USER DATA (Retrieved based on relevance):
    
    [NOTES]
    ${retrieved.notes.length > 0 
        ? retrieved.notes.map(n => `- Title: ${n.title}\n  Content: ${n.content.substring(0, 500)}...`).join('\n\n')
        : "No relevant notes found."}
    
    [TASKS/TODOS]
    ${retrieved.todos.length > 0 
        ? retrieved.todos.map(t => `- [${t.completed ? 'X' : ' '}] ${t.text} (Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No date'})`).join('\n')
        : "No relevant tasks found."}
    
    [CALENDAR EVENTS]
    ${retrieved.events.length > 0 
        ? retrieved.events.map(e => `- ${e.title} on ${new Date(e.start).toLocaleString()}`).join('\n')
        : "No relevant events found."}
    
    [FLASHCARDS]
    ${retrieved.flashcards.length > 0 
        ? retrieved.flashcards.map(c => `- Front: ${c.front}\n  Back: ${c.back}`).join('\n\n')
        : "No relevant flashcards found."}
    
    INSTRUCTIONS:
    1. Answer questions based on the user's data above (Notes, Tasks, Events, and Flashcards).
    2. If the user asks about something not in the data, state that you don't have that information.
    3. Use Markdown for formatting. Use bolding for emphasis, bullet points for lists, and code blocks for structured data.
    4. Be helpful, professional, and concise.
    5. You only have read access to the data.
    6. If a user asks to "summarize my notes", use the provided note contents.
    7. If a user asks "what should I study?", look at the flashcards and suggest topics based on the cards they have.
    8. You can help the user connect ideas between different notes (Obsidian-style).
    `;

    const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
            systemInstruction: contextString,
            temperature: 0.7,
        },
        history: history
    });

    const result = await chat.sendMessageStream({ message: newMessage });

    for await (const chunk of result) {
        onChunk(chunk.text || '');
    }
};
