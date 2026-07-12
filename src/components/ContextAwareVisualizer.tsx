import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  HelpCircle, 
  ArrowRight, 
  Cpu, 
  RefreshCw, 
  MessageSquare, 
  Briefcase, 
  Clock, 
  FileText, 
  Zap, 
  Activity, 
  TrendingUp,
  Award,
  BookOpen
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  resolveSentenceContext, 
  AMBIGUITY_RECOGNITION, 
  DisambiguationResult, 
  ContextMatchDetail 
} from "@/lib/context-resolver";

const PRESET_EXAMPLES = [
  {
    text: "PM me the report",
    label: "PM (Message)",
    category: "Communication",
    icon: MessageSquare,
  },
  {
    text: "PM approved the budget",
    label: "PM (Manager)",
    category: "Business",
    icon: Briefcase,
  },
  {
    text: "Apply at the hr department",
    label: "HR (Department)",
    category: "Corporate",
    icon: Briefcase,
  },
  {
    text: "Wait for 1 hr before calling",
    label: "HR (Hour)",
    category: "Time",
    icon: Clock,
  },
  {
    text: "We are training an ml model",
    label: "ML (Tech)",
    category: "AI/ML",
    icon: Sparkles,
  },
  {
    text: "Pour 250 ml of milk into a bowl",
    label: "ML (Volume)",
    category: "Science/Liquid",
    icon: Clock,
  },
  {
    text: "MD patient checkup went well",
    label: "MD (Doctor)",
    category: "Healthcare",
    icon: Activity,
  },
  {
    text: "MD requested company revenues report",
    label: "MD (Director)",
    category: "Business Exec",
    icon: Briefcase,
  },
  {
    text: "I am busy atm ttyl",
    label: "ATM (Moment)",
    category: "Temporal",
    icon: Clock,
  },
  {
    text: "Withdraw cash from the nearest atm machine",
    label: "ATM (Banking)",
    category: "Finance",
    icon: TrendingUp,
  },
];

export function ContextAwareVisualizer() {
  const [inputText, setInputText] = useState("PM me the report");
  const [activeAnalysis, setActiveAnalysis] = useState<{
    tokens: string[];
    disambiguations: DisambiguationResult[];
    normalizations: string[];
  } | null>(null);

  const [arrows, setArrows] = useState<{ x1: number; y1: number; x2: number; y2: number; label?: string }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [recalcTrigger, setRecalcTrigger] = useState(0);

  // Analyze the text whenever it changes
  useEffect(() => {
    const analysis = resolveSentenceContext(inputText);
    setActiveAnalysis(analysis);
    // Trigger coordinate recalculation shortly after render to let DOM position settle
    setTimeout(() => {
      setRecalcTrigger(p => p + 1);
    }, 100);
  }, [inputText]);

  // Handle drawing SVG arrows connecting context words to chosen candidates
  useEffect(() => {
    if (!containerRef.current || !activeAnalysis || activeAnalysis.disambiguations.length === 0) {
      setArrows([]);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const newArrows: { x1: number; y1: number; x2: number; y2: number; label?: string }[] = [];

    activeAnalysis.disambiguations.forEach((dis) => {
      // Find the winning candidate index
      const winningCandIdx = dis.candidates.findIndex(c => c.isWinner);
      if (winningCandIdx === -1) return;

      const candBoxId = `cand-box-${dis.abbreviation.toLowerCase()}-${winningCandIdx}`;
      const candEl = document.getElementById(candBoxId);

      if (!candEl) return;
      const candRect = candEl.getBoundingClientRect();

      // We want to connect each matched keyword token to the winning candidate
      const matchedTokens = dis.candidates[winningCandIdx].matchedKeywords;

      if (matchedTokens.length > 0) {
        // Draw arrows from each matched keyword
        activeAnalysis.tokens.forEach((token, idx) => {
          const isTrigger = matchedTokens.some(
            mt => mt.toLowerCase().replace(/[^\w]/g, "") === token.toLowerCase().replace(/[^\w]/g, "")
          );

          if (isTrigger) {
            const tokenEl = document.getElementById(`token-word-${idx}`);
            if (tokenEl) {
              const tokenRect = tokenEl.getBoundingClientRect();

              newArrows.push({
                x1: tokenRect.left + tokenRect.width / 2 - containerRect.left,
                y1: tokenRect.bottom - containerRect.top,
                x2: candRect.left + candRect.width / 2 - containerRect.left,
                y2: candRect.top - containerRect.top,
                label: `Triggers "${dis.selectedExpansion}"`,
              });
            }
          }
        });
      } else {
        // If no trigger words found, draw a default arrow from the abbreviation itself
        const abbrevEl = document.getElementById(`token-word-${dis.wordIndex}`);
        if (abbrevEl) {
          const abbrevRect = abbrevEl.getBoundingClientRect();
          newArrows.push({
            x1: abbrevRect.left + abbrevRect.width / 2 - containerRect.left,
            y1: abbrevRect.bottom - containerRect.top,
            x2: candRect.left + candRect.width / 2 - containerRect.left,
            y2: candRect.top - containerRect.top,
            label: "Default Fallback Path",
          });
        }
      }
    });

    setArrows(newArrows);
  }, [activeAnalysis, recalcTrigger]);

  // Recalculate coordinates on window resize or panel scroll
  useEffect(() => {
    const handleResize = () => setRecalcTrigger(p => p + 1);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const currentDis = activeAnalysis?.disambiguations[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
      {/* Preset Selectors & Sandbox Panel */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              Presets & Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Click a scenario below to see how surrounding context instantly shifts the disambiguation of words like **PM**, **HR**, **ML**, **MD**, and **ATM**.
            </p>
            <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin">
              {PRESET_EXAMPLES.map((example, idx) => {
                const Icon = example.icon;
                const isSelected = inputText.toLowerCase().trim() === example.text.toLowerCase().trim();
                return (
                  <button
                    key={idx}
                    id={`preset-${idx}`}
                    onClick={() => {
                      setInputText(example.text);
                      setRecalcTrigger(p => p + 1);
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left text-xs transition-all ${
                      isSelected
                        ? "bg-indigo-50/80 border-indigo-200 ring-2 ring-indigo-600/10 shadow-sm"
                        : "bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{example.label}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-indigo-100 text-indigo-600">
                          {example.category}
                        </Badge>
                      </div>
                      <p className="text-slate-500 italic">"{example.text}"</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Interactive Sandbox */}
        <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Interactive Sandbox
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Type your own sentence here! Try mixing ambiguous terms with triggering context.
            </p>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Custom Input Sentence</Label>
              <Input
                id="sandbox-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g. Please PM me the file as soon as possible."
                className="rounded-xl border-slate-200 h-11"
              />
            </div>
            <div className="pt-2">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Supported Ambiguities</span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(AMBIGUITY_RECOGNITION).map(key => (
                    <Badge key={key} variant="secondary" className="font-mono text-xs uppercase bg-indigo-50 border border-indigo-100 text-indigo-700">
                      {key}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dynamic Visualization Stage */}
      <div className="lg:col-span-8 flex flex-col space-y-6">
        <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden flex-1 flex flex-col min-h-[500px]">
          <CardHeader className="bg-slate-900 text-white border-b py-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 font-mono uppercase tracking-wider">
                <Cpu className="w-5 h-5 text-indigo-400" />
                Intelligent Decision Stage
              </CardTitle>
              <Badge variant="outline" className="border-indigo-500 text-indigo-300 font-mono text-xs shrink-0 bg-indigo-950/40">
                Layer 2: SURROUNDING_CONTEXT
              </Badge>
            </div>
          </CardHeader>
          <CardContent ref={containerRef} className="p-6 relative flex-1 flex flex-col justify-between bg-[#FCFCFE] overflow-hidden select-none">
            {/* SVG Overlay for Drawing Connectors */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full z-10">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
                </marker>
                <linearGradient id="gradient-line" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              {/* Draw Glowing Arrow Connectors */}
              {arrows.map((arr, idx) => {
                // Calculate middle point for control of quadratic curve
                const cx1 = arr.x1;
                const cy1 = arr.y1 + (arr.y2 - arr.y1) * 0.3;
                const cx2 = arr.x2;
                const cy2 = arr.y1 + (arr.y2 - arr.y1) * 0.7;

                const pathData = `M ${arr.x1} ${arr.y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${arr.x2} ${arr.y2}`;

                return (
                  <g key={idx}>
                    {/* Glowing background line */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="6"
                      strokeOpacity="0.15"
                      className="blur-[2px]"
                    />
                    {/* Primary connection line */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="url(#gradient-line)"
                      strokeWidth="2.5"
                      strokeDasharray="4 3"
                      markerEnd="url(#arrow)"
                    />
                    {/* Animated moving pulse particle */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="10 120"
                      strokeDashoffset="0"
                      className="animate-[dash_4s_linear_infinite]"
                      style={{
                        animation: "dash 3s linear infinite",
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Stage Part 1: Input Sequence Tokens */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Source Sentence Sequence
                </span>
                {activeAnalysis && activeAnalysis.disambiguations.length > 0 && (
                  <Badge className="bg-indigo-100 text-indigo-700 border-none font-semibold text-[10px] uppercase">
                    Detected: "{currentDis?.abbreviation}"
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm z-20 relative">
                {activeAnalysis?.tokens.map((token, idx) => {
                  const isAbbrev = currentDis?.wordIndex === idx;
                  const isTrigger = currentDis?.contextWordsUsed.some(
                    cw => cw.toLowerCase().replace(/[^\w]/g, "") === token.toLowerCase().replace(/[^\w]/g, "")
                  );

                  return (
                    <motion.div
                      key={idx}
                      id={`token-word-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-1.5 ${
                        isAbbrev
                          ? "bg-slate-950 text-white font-mono uppercase ring-4 ring-slate-900/10 shadow-md font-bold scale-105 z-30"
                          : isTrigger
                          ? "bg-indigo-50 text-indigo-700 border-2 border-dashed border-indigo-300 ring-2 ring-indigo-500/10 shadow-sm font-semibold"
                          : "bg-slate-50 text-slate-500 border border-slate-100/70"
                      }`}
                    >
                      {isTrigger && (
                        <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-ping shrink-0" />
                      )}
                      {token}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Stage Part 2: Middle Intelligent Evaluation Layer */}
            <div className="my-10 flex flex-col items-center justify-center relative z-20">
              <motion.div
                animate={{
                  scale: [1, 1.04, 1],
                  borderColor: ["rgba(99, 102, 241, 0.2)", "rgba(99, 102, 241, 0.5)", "rgba(99, 102, 241, 0.2)"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="px-6 py-3.5 rounded-full bg-white border-2 border-indigo-100 shadow-md flex items-center gap-2.5 max-w-sm text-center"
              >
                <div className="p-1.5 rounded-full bg-indigo-500 text-white animate-pulse">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block leading-tight">
                    Decision Agent Layer
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    Evaluating surround key matches...
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Stage Part 3: Candidate Disambiguations */}
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Candidate Expansion Outputs
              </span>

              {currentDis ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-20">
                  {currentDis.candidates.map((cand, idx) => {
                    const isWinner = cand.isWinner;
                    const abbrevData = AMBIGUITY_RECOGNITION[currentDis.abbreviation.toLowerCase()];
                    const candidateConfig = abbrevData.candidates.find(c => c.expansion === cand.candidate);

                    return (
                      <motion.div
                        key={idx}
                        id={`cand-box-${currentDis.abbreviation.toLowerCase()}-${idx}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                          isWinner
                            ? "bg-white border-indigo-500 ring-4 ring-indigo-500/10 shadow-lg"
                            : "bg-slate-50/50 border-slate-150 opacity-60 hover:opacity-80"
                        }`}
                      >
                        {/* Title and Badge */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="space-y-1">
                            <h4 className={`text-base font-bold ${isWinner ? "text-indigo-950" : "text-slate-700"}`}>
                              {cand.candidate}
                            </h4>
                            <p className="text-xs text-slate-500 leading-normal font-medium">
                              {candidateConfig?.description}
                            </p>
                          </div>
                          {isWinner ? (
                            <Badge className="bg-indigo-600 text-white border-none text-[9px] font-black uppercase shrink-0">
                              Selected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] text-slate-400 border-slate-200 shrink-0 uppercase">
                              Alternative
                            </Badge>
                          )}
                        </div>

                        {/* Keyword Matches info */}
                        <div className="mt-4 pt-3 border-t border-slate-100/80 space-y-2">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-slate-400 uppercase tracking-wider">
                              Keyword Matches ({cand.matchedKeywords.length})
                            </span>
                            <span className={`font-mono font-bold ${isWinner ? "text-indigo-600" : "text-slate-400"}`}>
                              +{cand.matchedKeywords.length * 0.35} context weight
                            </span>
                          </div>

                          {cand.matchedKeywords.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {cand.matchedKeywords.map((word, wIdx) => (
                                <Badge
                                  key={wIdx}
                                  variant="secondary"
                                  className={`text-[10px] px-2 py-0.5 border ${
                                    isWinner
                                      ? "bg-indigo-50 border-indigo-100 text-indigo-700"
                                      : "bg-slate-100 border-slate-200 text-slate-500"
                                  }`}
                                >
                                  {word}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic block">
                              No trigger words detected
                            </span>
                          )}
                        </div>

                        {/* Score and percentage */}
                        <div className="mt-4 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">
                              Decision Probability
                            </span>
                            <span className={`font-mono font-black ${isWinner ? "text-indigo-600 text-sm" : "text-slate-500"}`}>
                              {(cand.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${
                                isWinner ? "bg-gradient-to-r from-indigo-500 to-indigo-600" : "bg-slate-300"
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${cand.confidence * 100}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-2xl italic text-slate-400 text-sm">
                  Write a sentence containing PM, HR, ML, MD, or ATM in the Sandbox to visualize candidate evaluation.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Explanation & Decision Reason Panel */}
        <AnimatePresence mode="wait">
          {currentDis && (
            <motion.div
              key={currentDis.abbreviation + currentDis.selectedExpansion}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-indigo-100 bg-indigo-50/15 rounded-2xl shadow-sm overflow-hidden">
                <CardHeader className="bg-indigo-50/30 border-b py-3 px-5">
                  <CardTitle className="text-xs font-black uppercase text-indigo-700 tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-500" />
                    Decision Reasoning Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {currentDis.explanation}
                  </p>
                  <div className="flex items-center gap-1 text-[10.5px] text-indigo-600/80 font-bold">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Context filtering acts as an intelligent routing layer, successfully avoiding typical false expansions.
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
