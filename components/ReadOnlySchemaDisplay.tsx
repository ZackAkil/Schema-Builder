import React from 'react';
import type { Schema } from '../types';
import { DatabaseIcon } from './icons';

interface ReadOnlySchemaDisplayProps {
  schema: Schema;
}

const ReadOnlySchemaDisplay: React.FC<ReadOnlySchemaDisplayProps> = ({ schema }) => {
  if (!schema || !schema.collections) {
    return (
      <div className="p-4 text-sm text-red-500 bg-red-100 dark:bg-red-900/50 rounded-md">
        Invalid schema data provided.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {schema.collections.map((collection, index) => (
        <div
          key={`${collection.name}-${index}`}
          className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-3">
            <DatabaseIcon className="w-5 h-5 text-brand-secondary flex-shrink-0" />
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">{collection.name}</h4>
          </div>
          <div className="pl-8 space-y-2">
            {collection.fields.map((field) => (
              <div
                key={field.name}
                className="flex items-baseline gap-3 py-1 px-2"
              >
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{field.name}:</span>
                <span className="text-xs font-semibold text-brand-accent">{field.type}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReadOnlySchemaDisplay;