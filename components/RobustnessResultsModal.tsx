import React from 'react';
import type { RobustnessGroup } from '../types';
import ReadOnlySchemaDisplay from './ReadOnlySchemaDisplay';
import { XIcon } from './icons';

interface RobustnessResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: RobustnessGroup[];
}

const RobustnessResultsModal: React.FC<RobustnessResultsModalProps> = ({ isOpen, onClose, groups }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-100 dark:bg-slate-900 w-full max-w-7xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <h2 className="text-xl font-bold">Robustness Test Comparison</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close modal"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        <main className="flex-grow overflow-y-auto p-6 space-y-8 bg-slate-200/50 dark:bg-slate-950/50">
          {groups.map((group, index) => (
            <div key={index} className="bg-white dark:bg-slate-800/50 p-4 sm:p-6 rounded-lg border border-slate-300 dark:border-slate-700 shadow-md">
              <header className="mb-4 pb-3 border-b border-slate-300 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  Variant {index + 1}: {group.count} Identical Schema{group.count > 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Generated with temperature settings: <span className="font-semibold text-brand-primary dark:text-brand-accent">{group.temperatures.map(t => t.toFixed(1)).join(', ')}</span>
                </p>
              </header>
              <div className="max-w-md mx-auto">
                <ReadOnlySchemaDisplay schema={group.representative.schema} />
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div className="flex items-center justify-center h-full text-center text-slate-500">
              <div>
                <h3 className="text-lg font-semibold">No results to display.</h3>
                <p className="text-sm">Run the robustness test to see the comparison.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default RobustnessResultsModal;
