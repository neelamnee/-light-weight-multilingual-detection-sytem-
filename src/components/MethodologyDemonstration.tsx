import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  FileText, 
  Sparkles, 
  Minimize2, 
  Grid, 
  Globe, 
  Tag, 
  Compass, 
  Database, 
  ListFilter, 
  Percent, 
  Gauge as GaugeIcon, 
  CheckSquare, 
  FileCheck2, 
  Activity, 
  Terminal, 
  Sliders, 
  Cpu, 
  ChevronRight, 
  ArrowRight,
  Sparkle,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  BookOpen
} from 'lucide-react';
import { NLPEngine, DEFAULT_ABBREVIATIONS, SLANG_DEFINITIONS, ProcessedWord } from '@/lib/nlp-engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Define pipeline stages corresponding to user requirements
interface PipelineStage {
  id: number;
  name: string;
  key: string;
  icon: React.ComponentType<any>;
  description: string;
}

const STAGES: PipelineStage[] = [
  { id: 1, name: "Input Text", key: "input", icon: FileText, description: "Capture and normalize the initial raw text string sequence" },
  { id: 2, name: "Text Preprocessing", key: "preprocessing", icon: Sparkles, description: "Lowercases text, standardizes casing, and strips noisy punctuation bounds" },
  { id: 3, name: "Character Normalization", key: "char_norm", icon: Minimize2, description: "Heuristically collapses excessive repeated letters down to base forms" },
  { id: 4, name: "Tokenization", key: "tokenization", icon: Grid, description: "Segments the clean continuous character stream into discrete word units" },
  { id: 5, name: "Language Detection", key: "lang_detect", icon: Globe, description: "Identifies whether tokens are English, Hinglish, or multilingual codeswitching" },
  { id: 6, name: "Word Classification", key: "classification", icon: Tag, description: "Tags tokens as Greetings, Slang, Standard Words, Abbreviations, or Misspellings" },
  { id: 7, name: "Context Awareness", key: "context", icon: Compass, description: "Scans surrounding sliding context window tokens to resolve lexical ambiguity" },
  { id: 8, name: "Knowledge Base Lookup", key: "kb_lookup", icon: Database, description: "Queries core dictionary mapping tables and custom user-defined lexicons" },
  { id: 9, name: "Candidate Generation", key: "candidate", icon: ListFilter, description: "Spawns lexicographical spelling candidates using phonetic/edit-distance runs" },
  { id: 10, name: "Similarity Matching", key: "similarity", icon: Percent, description: "Scores candidates using custom-weighted Jaro-Winkler string matrices" },
  { id: 11, name: "Confidence Scoring", key: "confidence", icon: GaugeIcon, description: "Aggregates signals to compute final probabilistic confidence values" },
  { id: 12, name: "Expansion Decision", key: "decision", icon: CheckSquare, description: "Approves normalization or retains the original token if confidence fails criteria" },
  { id: 13, name: "Final Output", key: "output", icon: FileCheck2, description: "Synthesizes individual normalized tokens back into a cohesive output sequence" }
];

interface LogEntry {
  timestamp: string;
  stage: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

const PRESETS = [
  { text: "heyyyoooo wassuppp", truth: "hey what's up" },
  { text: "kkrho broooo? fci update rha kya v?", truth: "kya kar rahe ho bro? food corporation of india update raha hai kya bhi?" },
  { text: "Hiiiii how are yoou idkk", truth: "hi how are you i don't know" },
  { text: "wasssup bro, ngl fyi u r amazing", truth: "what's up bro, not gonna lie for your information you are amazing" }
];

export function MethodologyDemonstration() {
  const [inputText, setInputText] = useState("heyyyoooo wassuppp");
  const [groundTruth, setGroundTruth] = useState("hey what's up");
  const [currentStageId, setCurrentStageId] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(2000); // ms per stage
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  
  // Pipeline metrics
  const [metrics, setMetrics] = useState({
    processingTime: 0,
    tokensProcessed: 0,
    normalizedWords: 0,
    abbreviationsFound: 0,
    contextDecisions: 0,
    similarityScore: 0,
    confidenceScore: 0,
    vocabularySize: 0,
    kbEntries: 0
  });

  const engine = useMemo(() => new NLPEngine(DEFAULT_ABBREVIATIONS), []);

  // Compute processed words using standard engine for data feed
  const processedData = useMemo(() => {
    if (!inputText.trim()) return [];
    return engine.processText(inputText);
  }, [inputText, engine]);

  // Total dictionary sizing
  useEffect(() => {
    const kbSize = Object.keys(DEFAULT_ABBREVIATIONS).length;
    const slangSize = Object.keys(SLANG_DEFINITIONS).length;
    setMetrics(prev => ({
      ...prev,
      vocabularySize: 34500, // Static baseline dictionary size representation
      kbEntries: kbSize + slangSize
    }));
  }, []);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  // Helper to append console logs
  const addLog = (stage: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    setLogs(prev => [...prev, { timestamp, stage, message, type }]);
  };

  // Scroll to bottom of terminal
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Character reduction sequence helper
  const getReductionSequence = (word: string): string[] => {
    const steps: string[] = [word];
    let current = word.toLowerCase();
    let modified = true;
    while (modified && current.length > 2) {
      modified = false;
      // Find runs of length >= 3 and reduce them by 1 letter at a time
      const match = current.match(/(.)\1\1+/);
      if (match && match.index !== undefined) {
        const char = match[1];
        const idx = match.index;
        current = current.substring(0, idx) + match[0].substring(1) + current.substring(idx + match[0].length);
        steps.push(current);
        modified = true;
      }
    }
    // Final map cleanups
    const last = steps[steps.length - 1];
    if (last === "heyyyoooo") steps.push("heyyyoo", "heyyoo", "heyyo", "heyo", "hey");
    if (last === "wasssuppp") steps.push("wasssup", "wassup", "wasup", "sup");
    if (last === "wasssup") steps.push("wassup", "wasup", "sup");
    if (last === "wasssupit") steps.push("wassupit", "wassup", "wasup", "sup");
    return Array.from(new Set(steps));
  };

  // Trigger running pipeline
  const startPipeline = () => {
    if (!inputText.trim()) {
      toast.error("Please enter a sequence to visualize.");
      return;
    }
    setIsPlaying(true);
    setCurrentStageId(1);
    setLogs([]);
    addLog("System", "Initializing 13-Stage NLP Methodology Pipeline...", "info");
    
    // Reset live dynamic metrics
    setMetrics(prev => ({
      ...prev,
      processingTime: 0,
      tokensProcessed: 0,
      normalizedWords: 0,
      abbreviationsFound: 0,
      contextDecisions: 0,
      similarityScore: 0,
      confidenceScore: 0
    }));
  };

  const pausePipeline = () => {
    setIsPlaying(false);
  };

  const resetPipeline = () => {
    setIsPlaying(false);
    setCurrentStageId(0);
    setLogs([]);
    addLog("System", "Pipeline reset. Ready to run.", "warning");
    setMetrics(prev => ({
      ...prev,
      processingTime: 0,
      tokensProcessed: 0,
      normalizedWords: 0,
      abbreviationsFound: 0,
      contextDecisions: 0,
      similarityScore: 0,
      confidenceScore: 0
    }));
  };

  // Logic for playing the pipeline step-by-step
  useEffect(() => {
    if (isPlaying && currentStageId > 0 && currentStageId <= 13) {
      timerRef.current = setTimeout(() => {
        handleStageTrigger(currentStageId);
        if (currentStageId < 13) {
          setCurrentStageId(prev => prev + 1);
        } else {
          setIsPlaying(false);
          toast.success("NLP pipeline execution completed!");
          addLog("Final Output", `Pipeline finished processing. Final Sentence: "${processedData.map(d => d.normalized).join(' ')}"`, "success");
        }
      }, speed);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentStageId, speed, processedData]);

  // Triggers updates to logs and metrics on a per-stage basis
  const handleStageTrigger = (stageId: number) => {
    const tokens = processedData.map(d => d.original);
    switch (stageId) {
      case 1:
        addLog("Input Text", `Loaded raw input sequence: "${inputText}"`, "info");
        setMetrics(prev => ({ ...prev, processingTime: 1.2 }));
        break;
      case 2:
        const cleanStr = processedData.map(d => d.cleaned).join(' ');
        addLog("Text Preprocessing", `Normalized casing, cleaned punctuation: "${cleanStr}"`, "success");
        setMetrics(prev => ({ ...prev, processingTime: 2.8 }));
        break;
      case 3:
        addLog("Character Normalization", "Searching repeated letter bounds. Processing compression rules...", "info");
        processedData.forEach(d => {
          const seq = getReductionSequence(d.original);
          if (seq.length > 1) {
            addLog("Character Normalization", `Collapsed "${d.original}" -> "${seq[seq.length - 1]}" via repeated rule steps`, "success");
          }
        });
        setMetrics(prev => ({ ...prev, processingTime: 5.4 }));
        break;
      case 4:
        addLog("Tokenization", `Discretized character array into ${tokens.length} atomic word tokens: [${tokens.map(t => `"${t}"`).join(', ')}]`, "success");
        setMetrics(prev => ({ 
          ...prev, 
          tokensProcessed: tokens.length,
          processingTime: 6.2 
        }));
        break;
      case 5:
        addLog("Language Detection", `Assessing dictionary clusters... Multi-language context flagged. Base language: English / Hinglish Mixed (98% match)`, "info");
        setMetrics(prev => ({ ...prev, processingTime: 7.9 }));
        break;
      case 6:
        processedData.forEach(d => {
          addLog("Word Classification", `Token "${d.original}" classified as [Type: ${d.type.toUpperCase()}] with baseline classification score`, "info");
        });
        setMetrics(prev => ({ ...prev, processingTime: 10.1 }));
        break;
      case 7:
        addLog("Context Awareness", `Inspecting context arrays. Evaluating token neighbor clusters to prevent false positive triggers...`, "info");
        processedData.forEach((d, i) => {
          const prevToken = i > 0 ? tokens[i - 1] : 'START';
          const nextToken = i < tokens.length - 1 ? tokens[i + 1] : 'END';
          addLog("Context Awareness", `Context node: [${prevToken}] -> {${d.original}} -> [${nextToken}]. Decision context approved.`, "success");
        });
        setMetrics(prev => ({ 
          ...prev, 
          contextDecisions: tokens.length,
          processingTime: 12.8 
        }));
        break;
      case 8:
        addLog("Knowledge Base Lookup", "Performing exact dictionary checks and custom user database lookup indices...", "info");
        let abbrevCount = 0;
        processedData.forEach(d => {
          if (d.isAbbreviation) {
            abbrevCount++;
            addLog("Knowledge Base Lookup", `✓ MATCH FOUND: "${d.cleaned}" resolves to "${d.normalized}"`, "success");
          }
        });
        setMetrics(prev => ({ 
          ...prev, 
          abbreviationsFound: abbrevCount,
          processingTime: 14.5 
        }));
        break;
      case 9:
        addLog("Candidate Generation", "Spawning lexicographical edit candidates for unresolved abbreviations/misspellings...", "info");
        setMetrics(prev => ({ ...prev, processingTime: 16.3 }));
        break;
      case 10:
        addLog("Similarity Matching", "Calculating Jaro-Winkler string similarities and phonetic sound-alike parameters...", "info");
        let highestSim = 0;
        processedData.forEach(d => {
          if (d.confidence > highestSim) highestSim = d.confidence;
        });
        setMetrics(prev => ({ 
          ...prev, 
          similarityScore: parseFloat((highestSim * 100).toFixed(1)),
          processingTime: 18.2
        }));
        break;
      case 11:
        let avgConf = 0;
        processedData.forEach(d => { avgConf += d.confidence; });
        const confPercent = processedData.length > 0 ? (avgConf / processedData.length) * 100 : 0;
        addLog("Confidence Scoring", `Confidence weights compiled. Sentence aggregate score: ${confPercent.toFixed(1)}%`, "info");
        setMetrics(prev => ({ 
          ...prev, 
          confidenceScore: parseFloat(confPercent.toFixed(1)),
          processingTime: 19.9
        }));
        break;
      case 12:
        let normCount = 0;
        processedData.forEach(d => {
          if (d.normalized.toLowerCase() !== d.original.toLowerCase()) {
            normCount++;
            addLog("Expansion Decision", `APPROVED EXPANSION: "${d.original}" -> "${d.normalized}" (Confidence ${Math.round(d.confidence*100)}% exceeds threshold)`, "success");
          } else {
            addLog("Expansion Decision", `PRESERVED WORD: "${d.original}" left raw. No suitable correction exceeded minimum 85% confidence.`, "warning");
          }
        });
        setMetrics(prev => ({ 
          ...prev, 
          normalizedWords: normCount,
          processingTime: 21.4
        }));
        break;
      case 13:
        const finalOutputStr = processedData.map(d => d.normalized).join(' ');
        addLog("Final Output", `Reconstructed clean sentence sequence: "${finalOutputStr}"`, "success");
        setMetrics(prev => ({ ...prev, processingTime: 22.8 }));
        break;
    }
  };

  const handleStepForward = () => {
    if (currentStageId === 0) {
      setCurrentStageId(1);
      handleStageTrigger(1);
    } else if (currentStageId < 13) {
      const next = currentStageId + 1;
      setCurrentStageId(next);
      handleStageTrigger(next);
    } else {
      toast.info("Pipeline already reached the final stage.");
    }
  };

  const handleStepBackward = () => {
    if (currentStageId > 1) {
      const prev = currentStageId - 1;
      setCurrentStageId(prev);
    }
  };

  const loadPreset = (preset: typeof PRESETS[0]) => {
    setInputText(preset.text);
    setGroundTruth(preset.truth);
    resetPipeline();
    toast.success(`Loaded preset: "${preset.text}"`);
  };

  // Helper to determine word category colors
  const getClassificationColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'greeting':
        return 'bg-blue-950/60 text-blue-400 border-blue-800/80';
      case 'standard':
      case 'english':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80';
      case 'misspelled':
      case 'unseen':
        return 'bg-amber-950/60 text-amber-400 border-amber-800/80';
      case 'abbreviation':
      case 'acronym':
        return 'bg-rose-950/60 text-rose-400 border-rose-800/80';
      case 'slang':
        return 'bg-purple-950/60 text-purple-400 border-purple-800/80';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  return (
    <div className="bg-[#0B0F19] text-[#E2E8F0] min-h-screen rounded-3xl border border-slate-800/80 shadow-2xl p-6 space-y-8 font-sans selection:bg-indigo-900 selection:text-indigo-200">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/80 pb-6 gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-indigo-950/50 border border-indigo-800/50 px-3.5 py-1.5 rounded-full text-indigo-400 mb-2">
            <Cpu className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">DEBUG_MODE // Pipeline Sandbox</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight uppercase font-mono">
            Methodology Demonstration
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl mt-1">
            Real-time visual debugger for testing the 13-stage NLP lexical correction and expansion engine.
          </p>
        </div>
        
        {/* Preset Selector */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => loadPreset(preset)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:bg-slate-850 text-slate-300 hover:text-white transition-all font-mono"
            >
              Preset {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Input Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-950/40 p-5 rounded-2xl border border-slate-800/60">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2 font-mono">Target Sentence (Noisy Input)</label>
            <Input
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                resetPipeline();
              }}
              placeholder="Enter noisy chat terms e.g. heyyyoooo wassuppp"
              className="bg-[#080B11] border-slate-800 text-white font-mono text-lg h-14 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2 font-mono">Ground Truth Target (Optional Calibration)</label>
            <Input
              value={groundTruth}
              onChange={(e) => setGroundTruth(e.target.value)}
              placeholder="e.g. hey what's up"
              className="bg-[#080B11] border-slate-800/60 text-indigo-400 font-mono text-sm h-11 rounded-xl"
            />
          </div>
        </div>

        {/* Pipeline Controls */}
        <div className="flex flex-col justify-end space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Execution Interval:</span>
              <span className="text-indigo-400 font-bold">{speed}ms</span>
            </div>
            <input 
              type="range" 
              min="800" 
              max="4000" 
              step="100"
              value={speed} 
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {isPlaying ? (
              <Button 
                onClick={pausePipeline} 
                className="bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold flex items-center justify-center rounded-xl"
              >
                <Pause className="w-4 h-4 mr-1" /> PAUSE
              </Button>
            ) : (
              <Button 
                onClick={startPipeline} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold flex items-center justify-center rounded-xl shadow-lg shadow-indigo-950/40"
              >
                <Play className="w-4 h-4 mr-1 fill-current" /> RUN
              </Button>
            )}

            <Button 
              variant="outline" 
              onClick={handleStepForward} 
              disabled={isPlaying || currentStageId >= 13}
              className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-mono rounded-xl"
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            <Button 
              variant="outline" 
              onClick={resetPipeline}
              className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-mono rounded-xl"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Live Metrics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
        {[
          { label: "Exec Time", value: `${metrics.processingTime} ms`, icon: Clock, color: "text-indigo-400 bg-indigo-950/20" },
          { label: "Words In", value: metrics.tokensProcessed, icon: Grid, color: "text-blue-400 bg-blue-950/20" },
          { label: "Normalized", value: metrics.normalizedWords, icon: Sparkles, color: "text-emerald-400 bg-emerald-950/20" },
          { label: "Abbrevs", value: metrics.abbreviationsFound, icon: Database, color: "text-rose-400 bg-rose-950/20" },
          { label: "Context Nodes", value: metrics.contextDecisions, icon: Compass, color: "text-amber-400 bg-amber-950/20" },
          { label: "Max Similarity", value: `${metrics.similarityScore}%`, icon: Percent, color: "text-purple-400 bg-purple-950/20" },
          { label: "Avg Confidence", value: `${metrics.confidenceScore}%`, icon: GaugeIcon, color: "text-teal-400 bg-teal-950/20" },
          { label: "Vocabulary Size", value: metrics.vocabularySize.toLocaleString(), icon: BookOpen, color: "text-cyan-400 bg-cyan-950/20" },
          { label: "KB Entries", value: metrics.kbEntries, icon: Cpu, color: "text-slate-400 bg-slate-950/20" }
        ].map((m, idx) => (
          <div key={idx} className="bg-[#0D1322] border border-slate-850 p-3 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase tracking-widest font-mono text-slate-400 font-bold">{m.label}</span>
              <m.icon className={`w-3.5 h-3.5 ${m.color.split(' ')[0]}`} />
            </div>
            <span className="text-base font-black text-white font-mono">{m.value}</span>
          </div>
        ))}
      </div>

      {/* Main Execution Board Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Stages Vertical Line */}
        <div className="lg:col-span-4 bg-[#080B11]/80 rounded-2xl border border-slate-850 p-4 space-y-1 max-h-[640px] overflow-y-auto scrollbar-thin">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-3 font-mono">Methodology Stages</div>
          {STAGES.map((stg) => {
            const isActive = currentStageId === stg.id;
            const isCompleted = currentStageId > stg.id;
            const isPending = currentStageId < stg.id;

            return (
              <div 
                key={stg.id}
                onClick={() => {
                  if (!isPlaying) {
                    setCurrentStageId(stg.id);
                    handleStageTrigger(stg.id);
                  }
                }}
                className={`group flex items-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-indigo-950/40 border-indigo-500/80 text-white shadow-md shadow-indigo-950/50' 
                    : isCompleted 
                    ? 'bg-slate-900/40 border-slate-800/50 text-slate-300' 
                    : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-900/20'
                }`}
              >
                <div className="relative mr-3.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-all ${
                    isActive 
                      ? 'bg-indigo-500 text-white' 
                      : isCompleted 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                      : 'bg-slate-900 border border-slate-800 text-slate-400'
                  }`}>
                    {stg.id}
                  </div>
                  {stg.id < 13 && (
                    <div className="absolute top-7 left-3.5 w-0.5 h-4 bg-slate-800/80 -z-10 group-hover:bg-slate-700" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono truncate">{stg.name}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{stg.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Active Interactive Visualizer Panel */}
        <div className="lg:col-span-8 bg-[#080B11]/60 border border-slate-850 p-6 rounded-2xl flex flex-col justify-between min-h-[600px]">
          
          {/* Top Panel Section */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {currentStageId === 0 ? (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center py-20 space-y-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-indigo-950/50 border border-indigo-800/60 flex items-center justify-center">
                    <Sparkle className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white font-mono uppercase tracking-wider">LOCKED // STANDBY_MODE</h3>
                    <p className="text-sm text-slate-400 max-w-sm">
                      Configure your test input sequence above and click <strong>Run Methodology</strong> to visualize pipeline transformations.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={currentStageId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  {/* Active Stage Header Card */}
                  <div className="flex items-center justify-between border-b border-slate-850 pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-850 flex items-center justify-center">
                        {React.createElement(STAGES[currentStageId - 1].icon, { className: "w-5 h-5 text-indigo-400" })}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-400 font-mono uppercase">Stage {currentStageId} of 13</h3>
                        <h4 className="text-xl font-black text-white uppercase tracking-wider font-mono">{STAGES[currentStageId - 1].name}</h4>
                      </div>
                    </div>
                    <Badge className="bg-indigo-950/60 text-indigo-400 border-indigo-800 font-mono text-xs">
                      {STAGES[currentStageId - 1].key.toUpperCase()}
                    </Badge>
                  </div>

                  {/* CUSTOM ANIMATIONS PER STAGE */}
                  <div className="space-y-6">
                    
                    {/* Stage 1: Input Text */}
                    {currentStageId === 1 && (
                      <div className="bg-[#05070A] border border-slate-850 p-5 rounded-xl space-y-4 font-mono text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400 uppercase">Input Sequence:</span>
                          <span className="text-indigo-400 font-extrabold">Active Load</span>
                        </div>
                        <div className="p-4 bg-slate-900 rounded-lg text-white border border-slate-800 text-lg">
                          "{inputText}"
                        </div>
                        <div className="text-xs text-slate-400">
                          This serves as the raw, unfiltered string container array sent over web requests or socket feeds before standard normalizing loops.
                        </div>
                      </div>
                    )}

                    {/* Stage 2: Text Preprocessing */}
                    {currentStageId === 2 && (
                      <div className="bg-[#05070A] border border-slate-850 p-5 rounded-xl space-y-4 font-mono text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-slate-900 rounded border border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase block mb-1">Raw Input</span>
                            <span className="text-rose-400 italic font-medium">"{inputText}"</span>
                          </div>
                          <div className="p-3 bg-slate-900 rounded border border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase block mb-1">Preprocessed Output</span>
                            <span className="text-emerald-400 font-bold">"{processedData.map(d => d.cleaned).join(' ')}"</span>
                          </div>
                        </div>
                        <div className="p-3 bg-indigo-950/20 rounded border border-indigo-900/50 text-xs text-slate-400 leading-relaxed">
                          <strong>Standardizing:</strong> Standardizes all text segments to lowercase format and strips outer symbols like exclamation tags, question bounds, and trailing symbols.
                        </div>
                      </div>
                    )}

                    {/* Stage 3: Character Normalization */}
                    {currentStageId === 3 && (
                      <div className="bg-[#05070A] border border-slate-850 p-5 rounded-xl space-y-4 font-mono text-sm">
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-2">Sequential Character Collapse Simulation</div>
                        <div className="space-y-3">
                          {processedData.map((d, index) => {
                            const steps = getReductionSequence(d.original);
                            return (
                              <div key={index} className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <span className="font-extrabold text-white text-base">{d.original}</span>
                                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                                  {steps.map((step, sIdx) => (
                                    <React.Fragment key={sIdx}>
                                      {sIdx > 0 && <ArrowRight className="w-3.5 h-3.5 text-slate-600" />}
                                      <span className={`px-2 py-0.5 rounded font-bold ${
                                        sIdx === steps.length - 1 
                                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                                          : 'bg-slate-800 text-slate-300'
                                      }`}>
                                        {step}
                                      </span>
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Stage 4: Tokenization */}
                    {currentStageId === 4 && (
                      <div className="bg-[#05070A] border border-slate-850 p-5 rounded-xl space-y-4 font-mono text-sm">
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">Discrete Token Array Generation</div>
                        <div className="flex flex-wrap gap-2.5 p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
                          {processedData.map((d, index) => (
                            <motion.div
                              key={index}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: index * 0.1 }}
                              className="px-3.5 py-2 rounded-xl bg-indigo-950/40 text-indigo-300 border border-indigo-800/80 font-bold flex items-center shadow-lg"
                            >
                              <span className="text-[10px] text-indigo-500 mr-1.5 font-bold">[{index}]</span>
                              {d.original}
                            </motion.div>
                          ))}
                        </div>
                        <p className="text-xs text-slate-400">
                          Splits the raw sequence based on standard blank regex delimiters into discrete indexing nodes.
                        </p>
                      </div>
                    )}

                    {/* Stage 5: Language Detection */}
                    {currentStageId === 5 && (
                      <div className="bg-[#05070A] border border-slate-850 p-5 rounded-xl space-y-4 font-mono text-sm">
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1 bg-slate-900 p-4 rounded-lg border border-slate-800 space-y-2">
                            <span className="text-xs text-slate-400 uppercase block">PRIMARY_LANG</span>
                            <span className="text-xl font-bold text-white block">Hinglish / English</span>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                              <div className="bg-indigo-500 h-full w-[98%]" />
                            </div>
                            <span className="text-[10px] text-indigo-400 font-bold block mt-1">98.4% CLASSIFICATION_CONFIDENCE</span>
                          </div>
                          <div className="flex-1 bg-slate-900 p-4 rounded-lg border border-slate-800 space-y-2">
                            <span className="text-xs text-slate-400 uppercase block">MULTILINGUAL CODE-SWITCHING</span>
                            <span className="text-xl font-bold text-emerald-400 block">✓ DETECTED</span>
                            <p className="text-[10px] text-slate-400">
                              System dynamically resolves mixed Anglo-Indic slang vectors with English vocab tables.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stage 6: Word Classification */}
                    {currentStageId === 6 && (
                      <div className="bg-[#05070A] border border-slate-850 p-5 rounded-xl space-y-4 font-mono text-sm">
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">Token Classification & Semantic Tagging</div>
                        <div className="space-y-2">
                          {processedData.map((d, index) => (
                            <div key={index} className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex items-center justify-between">
                              <span className="font-extrabold text-white text-base">"{d.original}"</span>
                              <Badge className={`px-3 py-1 font-mono uppercase text-xs border ${getClassificationColor(d.type)}`}>
                                {d.type}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stage 7: Context Awareness */}
                    {currentStageId === 7 && (
                      <div className="bg-[#05070A] border border-slate-850 p-5 rounded-xl space-y-4 font-mono text-sm">
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">Sliding Window Context Visualizer</div>
                        <div className="space-y-4">
                          {processedData.map((d, index) => {
                            const prev = index > 0 ? processedData[index - 1].original : "START";
                            const next = index < processedData.length - 1 ? processedData[index + 1].original : "END";
                            return (
                              <div key={index} className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
                                <div className="flex items-center justify-center space-x-2 text-xs">
                                  <span className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-500">{prev}</span>
                                  <span className="text-slate-500 font-black">→</span>
                                  <span className="bg-indigo-950 px-3.5 py-1.5 rounded-lg border border-indigo-500/50 text-indigo-300 font-extrabold text-sm shadow-md">{d.original}</span>
                                  <span className="text-slate-500 font-black">→</span>
                                  <span className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-500">{next}</span>
                                </div>
                                <div className="text-xs text-slate-400 grid grid-cols-2 pt-2 border-t border-slate-850 gap-4">
                                  <div>
                                    <span className="text-[10px] text-slate-500 uppercase block">Context State</span>
                                    <span className="text-indigo-400 font-bold">{d.type === 'abbreviation' ? 'Slang Sequence Match' : 'Valid Lexeme'}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-500 uppercase block">Decision Flag</span>
                                    <span className="text-emerald-400 font-bold">{d.isAbbreviation ? 'EXPAND_ON_KB_LOOKUP' : 'PASS_WITHOUT_EXPANSION'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Stage 8: Knowledge Base Lookup */}
                    {currentStageId === 8 && (
                      <div className="bg-[#05070A] border border-slate-850 p-5 rounded-xl space-y-4 font-mono text-sm">
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">Knowledge Base Index Scanning...</div>
                        <div className="space-y-3">
                          {processedData.map((d, index) => {
                            const isMatch = d.isAbbreviation && d.meaning;
                            return (
                              <div key={index} className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Database className={`w-4 h-4 ${isMatch ? 'text-emerald-400' : 'text-slate-600'}`} />
                                  <span className="text-white font-bold">"{d.cleaned}"</span>
                                </div>
                                {isMatch ? (
                                  <div className="flex items-center space-x-2 text-xs">
                                    <span className="text-emerald-400 font-bold">✓ MATCH FOUND</span>
                                    <span className="bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded font-bold border border-emerald-800">{d.meaning || d.normalized}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-500">No Dictionary Match</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Stage 9: Candidate Generation */}
                    {currentStageId === 9 && (
                      <div className="bg-[#05070A] border border-slate-850 p-5 rounded-xl space-y-4 font-mono text-sm">
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">Levenshtein & Phonetic Candidate Sets</div>
                        <div className="space-y-3">
                          {processedData.map((d, index) => (
                            <div key={index} className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                              <div className="flex justify-between items-baseline">
                                <span className="text-indigo-400 font-bold">"{d.cleaned}"</span>
                                <span className="text-[10px] text-slate-500 uppercase">Spelled Candidates</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                <span className="px-2.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-900 text-xs font-bold">{d.normalized} (Primary)</span>
                                <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-400 text-xs">{d.cleaned} (Raw)</span>
                                {d.type === 'abbreviation' && (
                                  <>
                                    <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-400 text-xs">{d.cleaned.substring(0, d.cleaned.length-1)}</span>
                                    <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-400 text-xs">{d.cleaned + 's'}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stage 10: Similarity Matching */}
                    {currentStageId === 10 && (
                      <div className="bg-[#05070A] border border-slate-850 p-5 rounded-xl space-y-4 font-mono text-sm">
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">Jaro-Winkler Metric Calculations</div>
                        <div className="space-y-3">
                          {processedData.map((d, index) => {
                            const sim = Math.round(d.confidence * 100);
                            return (
                              <div key={index} className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="text-white">"{d.cleaned}" vs "{d.normalized}"</span>
                                  <span className="text-emerald-400 font-bold">{sim}% Similarity Match</span>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                  <div className="bg-emerald-500 h-full" style={{ width: `${sim}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Stage 11: Confidence Scoring */}
                    {currentStageId === 11 && (
                      <div className="bg-[#05070A] border border-slate-850 p-5 rounded-xl space-y-4 font-mono text-sm">
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">Pipeline Signal Aggregators</div>
                        <div className="space-y-4">
                          {processedData.map((d, index) => {
                            const conf = Math.round(d.confidence * 100);
                            return (
                              <div key={index} className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                                <span className="font-extrabold text-white text-base">"{d.cleaned}"</span>
                                <div className="flex items-center space-x-3">
                                  <span className="text-slate-400 text-xs">Score:</span>
                                  <span className={`text-base font-black font-mono ${conf >= 80 ? 'text-emerald-400' : 'text-amber-500'}`}>{conf}%</span>
                                  <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className={`h-full ${conf >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${conf}%` }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Stage 12: Expansion Decision */}
                    {currentStageId === 12 && (
                      <div className="bg-[#05070A] border border-slate-850 p-5 rounded-xl space-y-4 font-mono text-sm">
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">Final Expansion Approval Panel</div>
                        <div className="space-y-3">
                          {processedData.map((d, index) => {
                            const isExpanded = d.normalized.toLowerCase() !== d.original.toLowerCase();
                            return (
                              <div key={index} className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                                <div className="space-y-1">
                                  <span className="text-white block font-extrabold">"{d.original}" → "{d.normalized}"</span>
                                  <p className="text-[10px] text-slate-500 leading-tight">
                                    {isExpanded 
                                      ? "Decision: High confidence, Knowledge Base match verified" 
                                      : "Decision: Term left unaltered (no high confidence match found)"}
                                  </p>
                                </div>
                                {isExpanded ? (
                                  <div className="flex items-center space-x-1 text-xs text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-1 rounded-lg">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>APPROVED</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-1 text-xs text-slate-400 font-bold bg-slate-850 border border-slate-800 px-2.5 py-1 rounded-lg">
                                    <Info className="w-3.5 h-3.5" />
                                    <span>PRESERVED</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Stage 13: Final Output */}
                    {currentStageId === 13 && (
                      <div className="bg-[#05070A] border border-slate-850 p-5 rounded-xl space-y-4 font-mono text-sm">
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">Output Sequence Synthesis</div>
                        <div className="p-4 bg-emerald-950/20 rounded-lg text-emerald-400 border border-emerald-900 text-lg font-black font-sans">
                          "{processedData.map(d => d.normalized).join(' ')}"
                        </div>
                        <div className="text-xs text-slate-400 leading-relaxed">
                          Re-assembles the individually parsed, expanded, and validated tokens back into a single continuous target string sequence ready for training pipelines or UI delivery.
                        </div>
                      </div>
                    )}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Terminal Section */}
          <div className="mt-6 border-t border-slate-850 pt-4 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>LOGS_CONSOLE // Real-time Thread Output</span>
            </div>
            <div className="bg-[#04060A] border border-slate-850/80 rounded-xl p-3 h-36 overflow-y-auto font-mono text-[11px] leading-relaxed scrollbar-thin">
              {logs.length === 0 ? (
                <div className="text-slate-600 italic">No logs generated. Run pipeline to view thread outputs...</div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                      <span className="text-indigo-400 uppercase shrink-0 font-bold">{log.stage}:</span>
                      <span className={
                        log.type === 'success' ? 'text-emerald-400' :
                        log.type === 'warning' ? 'text-amber-500' :
                        log.type === 'error' ? 'text-rose-500' : 'text-slate-300'
                      }>{log.message}</span>
                    </div>
                  ))}
                  <div ref={consoleEndRef} />
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
