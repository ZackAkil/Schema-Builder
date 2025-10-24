import React, { useState, useCallback } from 'react';
import { generateSchemaFromRequirements, runRobustnessTest } from './services/geminiService';
import type { Schema, HoveredElement, GeminiResponse, RobustnessGroup } from './types';
import SchemaDisplay from './components/SchemaDisplay';
import RequirementHighlighter from './components/RequirementHighlighter';
import { DatabaseIcon, SparklesIcon, FontSizeIcon, ShieldCheckIcon, EyeIcon } from './components/icons';
import RobustnessResultsModal from './components/RobustnessResultsModal';

const placeholderRequirements = `I'm building a blog application.
Users should be able to sign up with an email and password.
Each user can create multiple posts.
A post must have a title, content, and a publication date.
Posts can have multiple tags for categorization.
Users can leave comments on posts.
Each comment is written by a user and has text content.`;

const App: React.FC = () => {
  const [requirements, setRequirements] = useState<string>(placeholderRequirements);
  const [generatedSchema, setGeneratedSchema] = useState<Schema | null>(null);
  const [justification, setJustification] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredElement, setHoveredElement] = useState<HoveredElement | null>(null);
  const [fontSize, setFontSize] = useState<number>(16);
  
  const [isTestingRobustness, setIsTestingRobustness] = useState<boolean>(false);
  const [robustnessScore, setRobustnessScore] = useState<number | null>(null);
  const [robustnessError, setRobustnessError] = useState<string | null>(null);
  const [robustnessComparisonGroups, setRobustnessComparisonGroups] = useState<RobustnessGroup[]>([]);
  const [isRobustnessModalOpen, setIsRobustnessModalOpen] = useState<boolean>(false);


  const resetRobustnessState = () => {
    setIsTestingRobustness(false);
    setRobustnessScore(null);
    setRobustnessError(null);
    setRobustnessComparisonGroups([]);
    setIsRobustnessModalOpen(false);
  };

  const handleGenerateSchema = useCallback(async () => {
    if (!requirements.trim()) {
      setError('Please provide your application requirements.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedSchema(null);
    setJustification('');
    setHoveredElement(null);
    resetRobustnessState();

    try {
      const response: GeminiResponse = await generateSchemaFromRequirements(requirements);
      setGeneratedSchema(response.schema);
      setJustification(response.justification);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [requirements]);

  const handleEditRequirements = useCallback(() => {
    setGeneratedSchema(null);
    setJustification('');
    setError(null);
    setHoveredElement(null);
    resetRobustnessState();
  }, []);
  
  /**
   * Creates a "structural digest" of a schema for accurate comparison.
   * It strips descriptive text and `relevantRequirements` fields, trims whitespace,
   * and explicitly sorts all fields and collections alphabetically. This ensures the
   * comparison is based on structure alone, not prose or element order.
   */
  const normalizeSchema = (schema: Schema): object => {
    const safeString = (s: any): string => (s && typeof s === 'string') ? s.trim() : '';

    const normalizedCollections = (schema.collections || []).map(collection => {
      const fields = collection.fields || [];
      const normalizedFields = fields.map(field => ({
        name: safeString(field.name),
        type: safeString(field.type),
      }));

      // Explicitly sort the new array of fields by name.
      normalizedFields.sort((a, b) => a.name.localeCompare(b.name));

      return {
        name: safeString(collection.name),
        fields: normalizedFields,
      };
    });

    // Explicitly sort the new array of collections by name.
    normalizedCollections.sort((a, b) => a.name.localeCompare(b.name));

    return { collections: normalizedCollections };
  };


  const handleRobustnessTest = useCallback(async () => {
    setIsTestingRobustness(true);
    setRobustnessScore(null);
    setRobustnessError(null);
    setRobustnessComparisonGroups([]);
    
    try {
      const responses = await runRobustnessTest(requirements);
      const temperatures = [0.5, 0.6, 0.7, 0.8, 0.9];
      
      const groups = new Map<string, { representative: GeminiResponse; temperatures: number[] }>();

      console.log('--- Robustness Test Debug: Normalized Schemas ---');
      responses.forEach((response, index) => {
        // Ensure we don't try to normalize a null or undefined schema
        if (!response || !response.schema) {
          console.log(`Schema @ temp ${temperatures[index]}: Invalid or empty.`);
          return;
        }
        
        const normalizedString = JSON.stringify(normalizeSchema(response.schema));
        
        // Pretty-print the normalized JSON to the console for easy debugging
        console.log(`--- Schema @ temp ${temperatures[index]} ---`);
        console.log(JSON.stringify(JSON.parse(normalizedString), null, 2));
        
        if (groups.has(normalizedString)) {
          groups.get(normalizedString)!.temperatures.push(temperatures[index]);
        } else {
          groups.set(normalizedString, {
            representative: response,
            temperatures: [temperatures[index]],
          });
        }
      });
      console.log('--- End of Robustness Test Debug ---');
      
      const formattedGroups: RobustnessGroup[] = Array.from(groups.values()).map(group => ({
        ...group,
        count: group.temperatures.length,
      })).sort((a, b) => b.count - a.count); // Sort groups by size, largest first

      setRobustnessComparisonGroups(formattedGroups);
      
      const maxCount = formattedGroups.length > 0 ? formattedGroups[0].count : 0;
      
      let score = 0;
      if (maxCount === 5) score = 100;
      else if (maxCount === 4) score = 75;
      else if (maxCount === 3) score = 50;
      else if (maxCount === 2) score = 25;

      setRobustnessScore(score);
    } catch (err) {
       setRobustnessError(err instanceof Error ? err.message : 'An unexpected error occurred during the test.');
    } finally {
      setIsTestingRobustness(false);
    }
  }, [requirements]);

  const handleHover = useCallback((element: HoveredElement | null) => {
    setHoveredElement(element);
  }, []);
  
  const RobustnessScoreDisplay: React.FC<{ score: number | null }> = ({ score }) => {
    if (score === null) return null;

    const getScoreDetails = () => {
      if (score >= 90) return { text: 'Highly Robust', color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/50' };
      if (score >= 70) return { text: 'Robust', color: 'text-emerald-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/50' };
      if (score >= 40) return { text: 'Moderately Stable', color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/50' };
      if (score >= 20) return { text: 'Slightly Unstable', color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/50' };
      return { text: 'Highly Unstable', color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/50' };
    };

    const { text, color, bgColor } = getScoreDetails();

    return (
      <div className={`mt-4 p-3 rounded-lg border border-transparent ${bgColor}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className={`w-6 h-6 ${color}`} />
            <div>
              <p className={`font-bold ${color}`}>Requirements Robustness: {text}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Score: <span className="font-semibold">{score}/100</span>. This reflects how consistently the AI interprets your requirements.
              </p>
            </div>
          </div>
          {robustnessComparisonGroups.length > 0 && (
            <button 
              onClick={() => setIsRobustnessModalOpen(true)}
              className="text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-1 px-3 rounded-md transition-colors duration-200 flex items-center gap-2 flex-shrink-0"
            >
              <EyeIcon className="h-4 w-4" />
              View Comparison
            </button>
          )}
        </div>
      </div>
    );
  };

  const SkeletonLoader: React.FC = () => (
    <div className="space-y-6 animate-pulse-fast">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
      <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <div key={i} className="bg-slate-200/50 dark:bg-slate-800/50 p-4 rounded-lg h-48">
            <div className="h-8 bg-slate-300 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
            <div className="pl-9 space-y-3">
              <div className="h-5 bg-slate-300 dark:bg-slate-700 rounded w-3/4"></div>
              <div className="h-5 bg-slate-300 dark:bg-slate-700 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DatabaseIcon className="w-8 h-8 text-brand-primary" />
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
              NoSQL Schema Generator
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className={`grid grid-cols-1 ${!generatedSchema ? 'lg:grid-cols-2' : ''} gap-8`}>
          {/* Left Column: Input */}
          {!generatedSchema && (
            <div className="flex flex-col">
              <h2 className="text-xl font-semibold mb-2">1. Describe Your App Requirements</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                List what your application needs to do. The more detail, the better the schema.
              </p>
              <div className="flex-grow rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm min-h-[300px] lg:min-h-0">
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="e.g., Users can create posts. Posts have a title and content..."
                  className="w-full h-full bg-transparent border-0 focus:ring-0 resize-none p-0 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <button
                onClick={handleGenerateSchema}
                disabled={isLoading}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-blue-900 disabled:bg-slate-500 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 shadow-lg disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    Generate Schema
                  </>
                )}
              </button>
            </div>
          )}

          {/* Right/Main Column: Output */}
          <div className={`flex flex-col ${generatedSchema ? 'lg:col-span-2' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
               <h2 className="text-xl font-semibold">
                {generatedSchema ? 'Generated Schema & Justification' : '2. Generated Schema & Justification'}
              </h2>
              {generatedSchema && (
                 <div className="flex items-center gap-2">
                   <button
                      onClick={handleRobustnessTest}
                      disabled={isTestingRobustness}
                      className="text-sm bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                    >
                      {isTestingRobustness ? (
                         <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <ShieldCheckIcon className="h-4 w-4" />
                      )}
                      {isTestingRobustness ? 'Testing...' : 'Run Robustness Test'}
                   </button>
                   <button
                      onClick={handleEditRequirements}
                      className="text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                      Edit Requirements
                    </button>
                 </div>
              )}
            </div>
            
             {!generatedSchema && (
               <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Hover over any collection or field to see why it's needed and highlight the relevant requirements.
                </p>
             )}
            
            <div className="flex-grow rounded-lg border border-slate-300 dark:border-slate-700 bg-white/30 dark:bg-slate-800/30 p-4 md:p-6 shadow-sm min-h-[400px]">
              {error && <div className="text-red-500 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 p-4 rounded-md">{error}</div>}
              
              {isLoading && <SkeletonLoader />}

              {!isLoading && !error && !generatedSchema && (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
                  <DatabaseIcon className="w-16 h-16 mb-4 text-slate-400 dark:text-slate-600" />
                  <p className="font-semibold">Your schema will appear here.</p>
                  <p className="text-sm">Click "Generate Schema" to begin.</p>
                </div>
              )}
              
              {generatedSchema && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-brand-secondary mb-2">Design Justification</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-900/50 p-4 rounded-md border border-slate-200 dark:border-slate-700">{justification}</p>
                    
                    {robustnessError && <div className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-700 p-3 rounded-md text-sm">{robustnessError}</div>}
                    <RobustnessScoreDisplay score={robustnessScore} />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-1">
                        <div className="flex items-center justify-between sticky top-[4.5rem] bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm py-2">
                          <h3 className="text-lg font-semibold text-brand-secondary">Requirements Analysis</h3>
                           <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400" title={`Font size: ${fontSize}px`}>
                              <FontSizeIcon className="w-5 h-5" />
                              <input
                                  type="range"
                                  min="12"
                                  max="24"
                                  step="1"
                                  value={fontSize}
                                  onChange={(e) => setFontSize(Number(e.target.value))}
                                  className="w-24 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full appearance-none cursor-pointer"
                              />
                           </div>
                        </div>
                        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 max-h-[calc(100vh-12rem)] overflow-y-auto">
                        <RequirementHighlighter
                            text={requirements}
                            highlights={hoveredElement?.relevantRequirements || []}
                            fontSize={fontSize}
                        />
                        </div>
                    </div>
                    <div className="xl:col-span-2">
                        <SchemaDisplay
                            schema={generatedSchema}
                            onHover={handleHover}
                            hoveredElement={hoveredElement}
                        />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <RobustnessResultsModal
        isOpen={isRobustnessModalOpen}
        onClose={() => setIsRobustnessModalOpen(false)}
        groups={robustnessComparisonGroups}
      />
    </div>
  );
};

export default App;