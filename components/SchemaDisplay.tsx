import React from 'react';
import type { Collection, Schema, HoveredElement } from '../types';
import { DatabaseIcon } from './icons';

interface SchemaDisplayProps {
  schema: Schema;
  onHover: (element: HoveredElement | null) => void;
  hoveredElement: HoveredElement | null;
}

const SchemaDisplay: React.FC<SchemaDisplayProps> = ({ schema, onHover, hoveredElement }) => {

  const handleCollectionHover = (collection: Collection) => {
    onHover({
      id: `collection-${collection.name}`,
      description: collection.description,
      relevantRequirements: collection.relevantRequirements,
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {schema.collections.map((collection) => {
        const collectionId = `collection-${collection.name}`;
        // Determine if the collection or any of its children are currently hovered to apply the active style
        const isCollectionActive = hoveredElement?.id === collectionId || hoveredElement?.id.startsWith(`field-${collection.name}-`);

        return (
          <div
            key={collectionId}
            className={`
              relative flex flex-col h-full bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg border shadow-sm
              transition-all duration-300 ease-in-out
              ${isCollectionActive
                ? 'scale-[1.02] shadow-xl border-brand-accent dark:border-brand-secondary z-20'
                : 'border-slate-200 dark:border-slate-700 z-10'
              }
            `}
            onMouseEnter={() => handleCollectionHover(collection)}
            onMouseLeave={() => onHover(null)}
          >
            {/* Tooltip for the collection itself */}
            {hoveredElement?.id === collectionId && (
              <div className="absolute -top-2 -right-2 transform translate-x-full w-64 p-3 bg-slate-800 dark:bg-slate-900 text-white text-xs rounded-md shadow-lg z-50 hidden lg:block opacity-95">
                {hoveredElement.description}
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              <DatabaseIcon className="w-6 h-6 text-brand-secondary" />
              <h4 className="text-xl font-bold tracking-wide text-slate-800 dark:text-slate-100">{collection.name}</h4>
            </div>
            <div className="pl-9 space-y-2 flex-grow">
              {collection.fields.map((field) => {
                const fieldId = `field-${collection.name}-${field.name}`;
                return (
                  <div
                    key={fieldId}
                    className="relative flex items-baseline gap-4 py-1 px-2 rounded-md transition-colors duration-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                    onMouseEnter={() => onHover({
                      id: fieldId,
                      description: field.description,
                      relevantRequirements: field.relevantRequirements
                    })}
                    // When leaving a field, set the hover state back to the parent collection. This fixes the bug.
                    onMouseLeave={() => handleCollectionHover(collection)}
                  >
                    {/* Tooltip for the field */}
                    {hoveredElement?.id === fieldId && (
                       <div className="absolute -top-2 -right-2 transform translate-x-full w-64 p-3 bg-slate-800 dark:bg-slate-900 text-white text-xs rounded-md shadow-lg z-50 hidden lg:block opacity-95">
                        {hoveredElement.description}
                      </div>
                    )}
                    <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{field.name}:</span>
                    <span className="text-sm font-semibold text-brand-accent">{field.type}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SchemaDisplay;