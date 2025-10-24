import React from 'react';

interface RequirementHighlighterProps {
  text: string;
  // FIX: Changed type to `any[]` to handle potentially untyped data from the API response.
  highlights: any[];
  fontSize: number;
}

const RequirementHighlighter: React.FC<RequirementHighlighterProps> = ({ text, highlights, fontSize }) => {
  if (!highlights || highlights.length === 0) {
    return <div className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: `${fontSize}px` }}>{text}</div>;
  }

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // FIX: Let TypeScript infer the type, which will be correctly determined as `string[]` due to the type guard in `filter`.
  const uniqueHighlights = [...new Set(highlights.filter((h): h is string => typeof h === 'string'))];
  
  // Sort highlights by length descending to match longer phrases first
  uniqueHighlights.sort((a, b) => b.length - a.length);

  const regex = new RegExp(`(${uniqueHighlights.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <div className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: `${fontSize}px` }}>
      {parts.filter(part => part).map((part, i) =>
        uniqueHighlights.some(h => h.toLowerCase() === part.toLowerCase()) ? (
          <span key={i} className="bg-brand-secondary/30 dark:bg-brand-accent/40 rounded-md transition-all duration-300 animate-highlight-pulse">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </div>
  );
};

export default RequirementHighlighter;