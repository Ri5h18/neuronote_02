
import React, { useRef, useState, useEffect } from 'react';
import { 
    Bold, Italic, Strikethrough, Heading, Link, List, 
    Quote, Code, AlertTriangle, ListOrdered
} from 'lucide-react';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    className?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, onBlur, placeholder, className }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [internalValue, setInternalValue] = useState(value);

    useEffect(() => {
        if (value !== internalValue) {
            setInternalValue(value);
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setInternalValue(newValue);
        onChange(newValue);
    };

    const insertFormat = (startTag: string, endTag: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value; 
        const selectedText = text.substring(start, end);
        
        const newText = text.substring(0, start) + startTag + selectedText + endTag + text.substring(end);
        
        setInternalValue(newText);
        onChange(newText);
        
        setTimeout(() => {
            textarea.focus();
            if (start === end) {
                const newPos = start + startTag.length;
                textarea.setSelectionRange(newPos, newPos);
            } else {
                textarea.setSelectionRange(start, start + startTag.length + selectedText.length + endTag.length);
            }
        }, 0);
    };

    const insertList = (type: 'bullet' | 'ordered') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;

        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = text.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = text.length;

        const content = text.substring(lineStart, lineEnd);
        const lines = content.split('\n');

        const newLines = lines.map((line, index) => {
            const cleanLine = line.replace(/^(\s*)(\d+\.|-|\*|\+)\s+/, '$1');
            if (type === 'ordered') return `${index + 1}. ${cleanLine}`;
            return `- ${cleanLine}`;
        });

        const newContent = newLines.join('\n');
        const newText = text.substring(0, lineStart) + newContent + text.substring(lineEnd);

        setInternalValue(newText);
        onChange(newText);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStart, lineStart + newContent.length);
        }, 0);
    };

    const handleToolbarAction = (e: React.MouseEvent, action: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        action();
    };

    return (
        <div className={`flex flex-col rounded-none overflow-hidden h-full ${className}`}>
            {}
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-zinc-300 dark:border-zinc-700 bg-[#f4f4f5]/50 dark:bg-[#18181b]/50 backdrop-blur-sm sticky top-0 z-10">
                 <ToolbarButton onMouseDown={(e) => handleToolbarAction(e, () => insertFormat('**', '**'))} icon={<Bold size={16} />} tooltip="Bold (Ctrl+B)" />
                 <ToolbarButton onMouseDown={(e) => handleToolbarAction(e, () => insertFormat('*', '*'))} icon={<Italic size={16} />} tooltip="Italic (Ctrl+I)" />
                 <ToolbarButton onMouseDown={(e) => handleToolbarAction(e, () => insertFormat('~~', '~~'))} icon={<Strikethrough size={16} />} tooltip="Strikethrough" />
                 
                 <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700 mx-1" />
                 
                 <ToolbarButton onMouseDown={(e) => handleToolbarAction(e, () => insertFormat('### '))} icon={<Heading size={16} />} tooltip="Heading" />
                 <ToolbarButton onMouseDown={(e) => handleToolbarAction(e, () => insertFormat('[', '](url)'))} icon={<Link size={16} />} tooltip="Link" />
                 
                 <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700 mx-1" />

                 <ToolbarButton onMouseDown={(e) => handleToolbarAction(e, () => insertList('bullet'))} icon={<List size={16} />} tooltip="Bullet List" />
                 <ToolbarButton onMouseDown={(e) => handleToolbarAction(e, () => insertList('ordered'))} icon={<ListOrdered size={16} />} tooltip="Numbered List" />
                 
                 <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700 mx-1" />

                 <ToolbarButton onMouseDown={(e) => handleToolbarAction(e, () => insertFormat('> [!IMPORTANT]\n> '))} icon={<AlertTriangle size={16} />} tooltip="Callout" />
                 <ToolbarButton onMouseDown={(e) => handleToolbarAction(e, () => insertFormat('> '))} icon={<Quote size={16} />} tooltip="Quote" />
                 <ToolbarButton onMouseDown={(e) => handleToolbarAction(e, () => insertFormat('```\n', '\n```'))} icon={<Code size={16} />} tooltip="Code Block" />
            </div>

            {}
            <div className="flex-1 relative bg-[#fdfdfc] dark:bg-transparent">
                <textarea
                    ref={textareaRef}
                    value={internalValue}
                    onChange={handleChange}
                    onBlur={onBlur}
                    placeholder={placeholder || "Start typing..."}
                    className="w-full h-full py-4 px-4 bg-transparent resize-none focus:outline-none text-zinc-800 dark:text-zinc-200 font-[inherit] text-[inherit] leading-relaxed"
                />
            </div>
        </div>
    );
}

const ToolbarButton: React.FC<{ onMouseDown: (e: React.MouseEvent) => void; icon: React.ReactNode; tooltip: string }> = ({ onMouseDown, icon, tooltip }) => (
    <button 
        type="button"
        onMouseDown={onMouseDown}
        title={tooltip}
        className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white hover:bg-[#fdfdfc] dark:hover:bg-zinc-700 rounded-sm transition-colors"
    >
        {icon}
    </button>
);
