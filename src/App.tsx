import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eraser, 
  Send, 
  Upload, 
  Plus, 
  Trash2, 
  Search, 
  Download, 
  Info, 
  Cpu, 
  FileText, 
  Settings,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Trophy,
  History,
  Target,
  Zap,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react';
import { NLPEngine, ProcessedWord, DEFAULT_ABBREVIATIONS } from '@/lib/nlp-engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Initial state for custom abbreviations
const STORAGE_KEY = 'shabda_ai_custom_dict';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [groundTruth, setGroundTruth] = useState('');
  const [processedWords, setProcessedWords] = useState<ProcessedWord[]>([]);
  const [customDict, setCustomDict] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });
  const [newAbbrev, setNewAbbrev] = useState({ key: '', value: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('processor');
  const [importUrl, setImportUrl] = useState('');

  // Initialize engine with custom dictionary
  const engine = useMemo(() => {
    const finalDict = { ...DEFAULT_ABBREVIATIONS, ...customDict };
    return new NLPEngine(finalDict);
  }, [customDict]);

  // Persist custom dict
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customDict));
  }, [customDict]);

  const handleProcess = useCallback(() => {
    if (!inputText.trim()) {
      toast.error("Please enter some text to process");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const results = engine.processText(inputText);
      setProcessedWords(results);
      setIsProcessing(false);
      
      const changesCount = results.filter(p => p.type !== 'none').length;
      if (changesCount === 0 && inputText.trim().length > 0) {
        toast.info("No abbreviations detected in the current sentence.");
      } else {
        toast.success(`Processed ${results.length} words with ${changesCount} normalizations`);
      }
    }, 300);
  }, [inputText, engine]);

  const handleQuickAdd = (word: string) => {
    setNewAbbrev({ key: word, value: '' });
    setActiveTab('editor');
    toast.info(`Preparing to teach: "${word}"`);
  };

  const handleClear = () => {
    setInputText('');
    setGroundTruth('');
    setProcessedWords([]);
    toast.info("Input cleared");
  };

  const handleClearDict = () => {
    if (confirm("Are you sure you want to clear your custom dictionary? This cannot be undone.")) {
      setCustomDict({});
      toast.warning("Custom dictionary cleared");
    }
  };

  const handleAddAbbrev = () => {
    if (!newAbbrev.key || !newAbbrev.value) {
      toast.error("Both abbreviation and expansion are required");
      return;
    }
    setCustomDict(prev => ({
      ...prev,
      [newAbbrev.key.toLowerCase().trim()]: newAbbrev.value.toLowerCase().trim()
    }));
    setNewAbbrev({ key: '', value: '' });
    toast.success(`Abbreviation "${newAbbrev.key}" added`);
  };

  const handleRemoveAbbrev = (key: string) => {
    setCustomDict(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    toast.info(`Abbreviation "${key}" removed`);
  };

  const handleUrlImport = async () => {
    if (!importUrl) return;
    setIsProcessing(true);
    try {
      const response = await fetch(importUrl);
      const text = await response.text();
      
      if (importUrl.endsWith('.json')) {
        const data = JSON.parse(text);
        setCustomDict(prev => ({ ...prev, ...data }));
        toast.success(`Imported from JSON URL`);
      } else {
        Papa.parse(text, {
          complete: (results) => {
            processImportedData(results.data as string[][]);
          },
          header: false
        });
      }
    } catch (err) {
      toast.error("Failed to fetch dataset from URL. Ensure the URL is public and CORS-enabled.");
    } finally {
      setIsProcessing(false);
      setImportUrl('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        complete: (results) => {
          processImportedData(results.data as string[][]);
        },
        header: false
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];
        processImportedData(data);
      };
      reader.readAsBinaryString(file);
    } else if (fileName.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        const lines = content.split('\n').map(l => l.split('\t'));
        processImportedData(lines);
      };
      reader.readAsText(file);
    } else {
      toast.error("Unsupported file format. Please use CSV, XLSX, or TXT (TSV)");
    }
  };

  const processImportedData = (data: string[][]) => {
    const newItems: Record<string, string> = {};
    let count = 0;
    
    let keyIdx = 0;
    let valIdx = 1;

    const sampleRows = data.slice(0, 5).filter(r => r.length >= 2);
    if (sampleRows.length > 0) {
      const firstRow = sampleRows[0];
      if (firstRow.length >= 3) {
        const firstVal = String(firstRow[0]).trim();
        if (!firstVal || !isNaN(Number(firstVal)) || firstVal === '0') {
          keyIdx = 1;
          valIdx = 2;
        }
      }
    }

    data.forEach(row => {
      if (row.length > Math.max(keyIdx, valIdx)) {
        const key = String(row[keyIdx]).trim().toLowerCase();
        const val = String(row[valIdx]).trim().toLowerCase();
        
        const skipHeaders = ['abbreviation', 'key', 'acronym', 'expansion', 'value', 'index', '0', '1', 'id', 'sn'];
        if (key && val && !skipHeaders.includes(key) && isNaN(Number(key)) && key.length > 0) {
          newItems[key] = val;
          count++;
        }
      }
    });

    if (count > 0) {
      setCustomDict(prev => ({ ...prev, ...newItems }));
      toast.success(`Successfully added ${count} new terms to dict`);
    } else {
      toast.error("No valid data found or columns misaligned. Check file format.");
    }
  };

  const normalizedSentence = useMemo(() => {
    return processedWords.map(pw => pw.normalized).join(' ');
  }, [processedWords]);

  const filteredDict = useMemo(() => {
    const all = { ...engine.getDictionary() };
    return Object.entries(all).filter(([k, v]) => 
      k.includes(searchQuery.toLowerCase()) || v.includes(searchQuery.toLowerCase())
    ).sort();
  }, [searchQuery, engine]);

  const stats = useMemo(() => {
    const totalWords = processedWords.length;
    const transformed = processedWords.filter(p => p.type !== 'none').length;
    const avgConfidence = totalWords > 0 
      ? (processedWords.reduce((acc, curr) => acc + curr.confidence, 0) / totalWords) * 100 
      : 0;
    
    // Competitive Evaluation Metrics
    let accuracy = 0;
    let f1 = 0;
    let rouge = 0;
    let rmse = 0;
    let logloss = 0;

    if (groundTruth && normalizedSentence) {
      const pred = normalizedSentence.toLowerCase().trim().split(/\s+/).filter(Boolean);
      const target = groundTruth.toLowerCase().trim().split(/\s+/).filter(Boolean);
      
      const minLen = Math.min(pred.length, target.length);
      let matches = 0;
      let squaredErrors = 0;
      let logSum = 0;

      // Evaluation Loop
      const maxLen = Math.max(pred.length, target.length);
      for (let i = 0; i < maxLen; i++) {
        const pWord = pred[i];
        const tWord = target[i];
        const conf = i < processedWords.length ? processedWords[i].confidence : 0.5;
        const eps = 1e-15;
        const p = Math.max(eps, Math.min(1 - eps, conf));
        
        const isMatch = pWord === tWord;
        if (isMatch) {
          matches++;
          squaredErrors += Math.pow(1 - conf, 2);
          logSum += Math.log(p);
        } else {
          squaredErrors += Math.pow(conf, 2);
          logSum += Math.log(1 - p);
        }
      }
      
      accuracy = target.length > 0 ? (matches / target.length) : 0;
      
      // Precision / Recall for Word-level F1
      const precision = pred.length > 0 ? matches / pred.length : 0;
      const recall = target.length > 0 ? matches / target.length : 0;
      f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

      // Unigram Recall (ROUGE-1)
      rouge = recall;

      // RMSE and Log Loss
      rmse = Math.sqrt(squaredErrors / (maxLen || 1));
      logloss = -logSum / (maxLen || 1);
    }

    return { totalWords, transformed, avgConfidence, accuracy, f1, rouge, rmse, logloss };
  }, [processedWords, groundTruth, normalizedSentence]);

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 font-sans selection:bg-blue-100 p-4 md:p-8">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center justify-center p-2 mb-4 rounded-full bg-indigo-50 text-indigo-700">
            <Cpu className="w-5 h-5 mr-2" />
            <span className="text-sm font-semibold uppercase tracking-wider">Metrics-Driven Normalization</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-800 mb-4 font-mono uppercase">
            shabda<span className="text-indigo-600">AI</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Optimized for <strong>Accuracy</strong>, <strong>F1-Score</strong>, <strong>RMSE</strong>, <strong>ROUGE-1</strong>, and <strong>Log Loss</strong> benchmarks.
          </p>
        </motion.div>
      </header>

      <main className="max-w-6xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-white/50 border shadow-sm rounded-xl p-1 gap-1 h-auto">
            <TabsTrigger value="processor" className="data-[state=active]:bg-white rounded-lg py-2">Processor</TabsTrigger>
            <TabsTrigger value="datasets" className="data-[state=active]:bg-white rounded-lg py-2">Datasets</TabsTrigger>
            <TabsTrigger value="editor" className="data-[state=active]:bg-white rounded-lg py-2">Glossary</TabsTrigger>
            <TabsTrigger value="about" className="data-[state=active]:bg-white rounded-lg py-2">Info</TabsTrigger>
          </TabsList>

          {/* Tab: Processor */}
          <TabsContent value="processor" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Input Section */}
              <Card className="lg:col-span-2 border-slate-200 shadow-md overflow-hidden rounded-2xl">
                <CardHeader className="bg-slate-50/50 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center font-mono">
                      <FileText className="w-5 h-5 mr-3 text-indigo-500" />
                      INPUT_SOURCE
                    </CardTitle>
                    <div className="flex space-x-2">
                       <Button variant="ghost" size="sm" onClick={handleClear} disabled={!inputText}>
                         <History className="w-4 h-4 mr-2" /> Reset
                       </Button>
                       <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all font-bold" onClick={handleProcess} disabled={isProcessing || !inputText}>
                         {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : (
                           <>
                             <Zap className="w-4 h-4 mr-2 fill-current" /> EXECUTE ENGINE
                           </>
                         )}
                       </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400 uppercase letter tracking-widest">Target Sequence (Noisy)</Label>
                    <textarea
                      id="input-text"
                      className="w-full min-h-[160px] p-5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-0 outline-none transition-all resize-none text-xl font-light bg-white"
                      placeholder="e.g. kkrho broooo? fci update rha kya v?"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400 uppercase letter tracking-widest">Ground Truth Labels</Label>
                    <Input 
                      className="bg-slate-50 border-none h-12 rounded-xl text-indigo-600 font-medium italic"
                      placeholder="e.g. kya kar rahe ho brother? food corporation of india update raha hai kya bhi?"
                      value={groundTruth}
                      onChange={(e) => setGroundTruth(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400 mt-1 italic italic flex items-center">
                       <Info className="w-3 h-3 mr-1" />
                       Required to calculate Log Loss and RMSE metrics.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics/Metrics Section */}
              <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="bg-slate-900 text-white border-b">
                  <CardTitle className="text-xl flex items-center font-mono uppercase tracking-widest">
                    <Target className="w-5 h-5 mr-3 text-indigo-400" />
                    Metrics_Panel
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                       <span className="text-[9px] uppercase font-bold text-slate-400 mb-1">Accuracy</span>
                       <span className="text-xl font-black text-indigo-600">{(stats.accuracy * 100).toFixed(1)}%</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                       <span className="text-[9px] uppercase font-bold text-slate-400 mb-1">F1 Score</span>
                       <span className="text-xl font-black text-emerald-600">{stats.f1.toFixed(3)}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                       <span className="text-[9px] uppercase font-bold text-slate-400 mb-1">RMSE</span>
                       <span className="text-xl font-black text-amber-600">{stats.rmse.toFixed(3)}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                       <span className="text-[9px] uppercase font-bold text-slate-400 mb-1">Log Loss</span>
                       <span className="text-xl font-black text-rose-600">{stats.logloss.toFixed(3)}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-baseline justify-between">
                     <span className="text-[10px] uppercase font-bold text-indigo-400">ROUGE-1 Unigram Recall</span>
                     <span className="text-xl font-black text-indigo-700">{stats.rouge.toFixed(3)}</span>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-sm font-medium text-slate-500">Predicted Normalizations</span>
                      <Badge variant="outline" className="bg-white border-indigo-100 text-indigo-700 font-mono text-xs">
                        {stats.transformed}
                      </Badge>
                    </div>

                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                       <div className="flex justify-between items-end mb-2">
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Ensemble Confidence</p>
                          <span className="text-xs font-mono text-indigo-600 font-bold">{stats.avgConfidence.toFixed(1)}%</span>
                       </div>
                       <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <motion.div 
                            className="bg-indigo-600 h-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.avgConfidence}%` }}
                          />
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Section */}
            <AnimatePresence>
              {processedWords.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-6"
                >
                  <Card className="border-indigo-100 shadow-xl border-l-[6px] border-l-indigo-600 rounded-2xl bg-white overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-50">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-xs font-black uppercase text-indigo-400 tracking-widest">Normalized Ensemble Output</CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 rounded-full" onClick={() => navigator.clipboard.writeText(normalizedSentence)}>
                          <Download className="w-4 h-4 text-slate-400" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="py-6">
                      <p className="text-3xl font-light leading-relaxed text-slate-800 italic">
                        {normalizedSentence}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b">
                      <CardTitle className="text-lg font-mono">DEBUG_BREAKDOWN</CardTitle>
                    </CardHeader>
                    <ScrollArea className="max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent bg-slate-50/50">
                            <TableHead className="w-[180px] font-bold text-[10px] uppercase">Original</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase">Transformation Pipeline</TableHead>
                            <TableHead className="font-bold text-[10px] uppercase">Source</TableHead>
                            <TableHead className="text-right font-bold text-[10px] uppercase">Metric</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {processedWords.map((word, idx) => (
                            <TableRow key={idx} className="group border-slate-50">
                              <TableCell className="font-mono text-sm">
                                <div className="flex items-center">
                                  <div className="w-1 h-8 bg-slate-100 group-hover:bg-indigo-300 mr-3 rounded-full transition-colors" />
                                  <span className="font-semibold text-slate-600">{word.original}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <span className="text-xs text-slate-400 line-through mr-3 opacity-50">{word.cleaned}</span>
                                  <ChevronRight className="w-3 h-3 mx-2 text-indigo-400 opacity-50" />
                                  <span className="font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full text-sm">
                                    {word.normalized}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {word.type === 'exact' && <Badge className="bg-emerald-500 text-white border-none text-[10px] font-black uppercase">Exact</Badge>}
                                {word.type === 'fuzzy' && <Badge className="bg-indigo-500 text-white border-none text-[10px] font-black uppercase">Ensemble</Badge>}
                                {word.type === 'reduced' && <Badge className="bg-purple-100 text-purple-700 border-none text-[10px] font-black uppercase">Reduced</Badge>}
                                {word.type === 'none' && <Badge variant="ghost" className="text-slate-300 text-[10px] font-black uppercase">Literal</Badge>}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-bold text-indigo-900/50">
                                {(word.confidence * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* Tab: Datasets */}
          <TabsContent value="datasets" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Card className="border-slate-200 shadow-md rounded-2xl">
                  <CardHeader>
                    <CardTitle>Batch Import</CardTitle>
                    <CardDescription>Upload CSV, XLSX or TXT datasets for expansion.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center hover:border-indigo-400 transition-all group relative bg-white">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".csv,.xlsx,.xls,.txt"
                        onChange={handleFileUpload}
                      />
                      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-12 h-12 text-slate-200 group-hover:text-indigo-500 transition-colors mb-4" />
                        <span className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">Upload Local Dataset</span>
                        <span className="text-slate-400 text-sm mt-2">CSV, XLSX, TSV</span>
                      </label>
                    </div>

                    <div className="pt-6 border-t border-slate-50 space-y-4">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-left block">Or External Repository Link</Label>
                      <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                        <Input 
                          placeholder="https://dataset-repo.io/data.csv" 
                          className="border-none bg-transparent focus-visible:ring-0 shadow-none h-10"
                          value={importUrl}
                          onChange={(e) => setImportUrl(e.target.value)}
                        />
                        <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl" onClick={handleUrlImport} disabled={!importUrl}>
                          {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Fetch"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-md bg-slate-900 text-white rounded-2xl overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-indigo-300 font-mono text-sm uppercase text-left">Engine Housekeeping</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full text-red-400 hover:bg-red-500/10 hover:text-red-400 border border-red-500/20 rounded-xl" onClick={handleClearDict}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Wipe Custom Dictionary
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden bg-white">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 text-left">
                  <div>
                    <CardTitle className="font-mono text-sm text-indigo-600 uppercase">Registry Status</CardTitle>
                    <CardDescription>Active Pattern Loadout ({filteredDict.length})</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-0 text-left">
                   <div className="p-4 bg-slate-50/50 border-b">
                     <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <Input 
                         placeholder="Filter registry..." 
                         className="pl-10 bg-white border-slate-100 rounded-xl h-10"
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                       />
                     </div>
                   </div>
                   <ScrollArea className="h-[450px]">
                      <div className="py-2">
                        {filteredDict.length > 0 ? (
                          filteredDict.map(([k, v]) => (
                             <div key={k} className="flex items-center justify-between py-3 px-6 hover:bg-indigo-50/30 group transition-colors border-b border-slate-50 last:border-0 lowercase">
                               <div className="flex items-center">
                                 <code className="text-indigo-600 font-black px-2 py-1 bg-indigo-50 rounded text-xs mr-3">{k}</code>
                                 <ChevronRight className="w-3 h-3 text-slate-200" />
                               </div>
                               <span className="text-slate-500 text-xs font-mono max-w-[180px] truncate">{v}</span>
                             </div>
                          ))
                        ) : (
                          <div className="text-center py-20 text-slate-300 italic flex flex-col items-center">
                            <Search className="w-12 h-12 mb-3 opacity-10" />
                            <p className="text-xs uppercase font-black tracking-widest">Null Response</p>
                          </div>
                        )}
                      </div>
                   </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Editor */}
          <TabsContent value="editor" className="space-y-6">
             <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden pb-4 text-left">
                <CardHeader className="bg-slate-50/50 border-b">
                  <CardTitle className="text-lg">Teach Pattern</CardTitle>
                  <CardDescription>Inject custom domain logic directly into the ensemble engine.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Pattern (Shortform)</Label>
                      <Input 
                        className="h-14 rounded-2xl bg-slate-50 border-none px-6 text-indigo-700 font-black text-lg focus-visible:ring-indigo-500" 
                        placeholder="e.g. wru" 
                        value={newAbbrev.key}
                        onChange={(e) => setNewAbbrev(prev => ({ ...prev, key: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest ml-1">Expansion (Truth)</Label>
                      <Input 
                        className="h-14 rounded-2xl bg-slate-50 border-none px-6 text-slate-600 font-medium text-lg focus-visible:ring-indigo-500" 
                        placeholder="e.g. where are you" 
                        value={newAbbrev.value}
                        onChange={(e) => setNewAbbrev(prev => ({ ...prev, value: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-lg shadow-indigo-100" onClick={handleAddAbbrev}>
                    <Plus className="w-5 h-5 mr-3" />
                    Commit to Ensemble Memory
                  </Button>
                </CardContent>
             </Card>

             <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden text-left">
                <CardHeader className="bg-slate-50/50 border-b">
                  <CardTitle className="text-lg">User-Defined Registry</CardTitle>
                  <CardDescription>Manage persistence across sessions.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                   <ScrollArea className="h-[350px]">
                      {Object.keys(customDict).length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent bg-slate-50/30">
                              <TableHead className="px-6 font-black text-[10px] uppercase">Short</TableHead>
                              <TableHead className="px-6 font-black text-[10px] uppercase">Expansion</TableHead>
                              <TableHead className="text-right px-6 font-black text-[10px] uppercase">Ops</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(customDict).map(([k, v]) => (
                               <TableRow key={k} className="border-slate-50">
                                 <TableCell className="px-6">
                                   <div className="bg-indigo-50 text-indigo-700 font-black px-3 py-1 rounded-lg inline-block text-sm">
                                     {k}
                                   </div>
                                 </TableCell>
                                 <TableCell className="px-6 text-slate-600 font-medium">{v}</TableCell>
                                 <TableCell className="text-right px-6">
                                   <Button variant="ghost" size="icon" className="rounded-full text-red-400 hover:bg-red-50 hover:text-red-600" onClick={() => handleRemoveAbbrev(k)}>
                                      <Trash2 className="w-4 h-4" />
                                   </Button>
                                 </TableCell>
                               </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                           <AlertCircle className="w-16 h-16 mb-4 opacity-10" />
                           <p className="text-[10px] uppercase font-black tracking-widest">Registry Empty</p>
                        </div>
                      )}
                   </ScrollArea>
                </CardContent>
             </Card>
          </TabsContent>

          {/* Tab: About */}
          <TabsContent value="about" className="space-y-6">
             <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden border-2 border-indigo-50 text-left">
               <CardContent className="pt-12 space-y-10 px-10">
                 <div className="flex items-start space-x-6">
                    <div className="p-5 bg-indigo-100 rounded-3xl">
                      <Cpu className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black mb-4">The Ensemble Architecture</h3>
                      <p className="text-slate-500 leading-relaxed text-lg font-light">
                        shabdaAI utilizes a weighted ensemble of character-level similarity measures. 
                        Unlike basic fuzzy matching, our engine evaluates candidates through three distinct 
                        pipelines: Jaro-Winkler (prefix bias), Levenshtein (edit cost), and Sorensen-Dice (bi-gram convergence).
                      </p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                    <div className="p-8 border-2 border-slate-50 rounded-3xl bg-slate-50/50">
                       <h4 className="font-black flex items-center mb-6 text-[10px] uppercase tracking-widest text-indigo-600">
                         <CheckCircle2 className="w-4 h-4 mr-2" />
                         Engine Capabilities
                       </h4>
                       <ul className="text-sm text-slate-600 space-y-4">
                         <li className="flex items-center">• <span className="ml-3 font-bold">RCR:</span> Repeated Character Reduction</li>
                         <li className="flex items-center">• <span className="ml-3 font-bold">Multi-Metric:</span> Ensemble Distance Scoring</li>
                         <li className="flex items-center">• <span className="ml-3 font-bold">F1-Boost:</span> Adaptive Threshold Logic</li>
                         <li className="flex items-center">• <span className="ml-3 font-bold">O(n) Cache:</span> Zero-latency word processing</li>
                       </ul>
                    </div>
                    <div className="p-8 border-2 border-slate-50 rounded-3xl bg-slate-50/50">
                       <h4 className="font-black flex items-center mb-6 text-[10px] uppercase tracking-widest text-indigo-600">
                         <CheckCircle2 className="w-4 h-4 mr-2" />
                         Validation Metrics
                       </h4>
                       <ul className="text-sm text-slate-600 space-y-4">
                         <li className="flex items-center">• <span className="ml-3 font-bold text-indigo-600">Accuracy:</span> Direct target overlap</li>
                         <li className="flex items-center">• <span className="ml-3 font-bold text-indigo-600">F1 Score:</span> Harmonic mean of precision/recall</li>
                         <li className="flex items-center">• <span className="ml-3 font-bold text-indigo-600">ROUGE-1:</span> Expansion recall index</li>
                       </ul>
                    </div>
                 </div>

                 <footer className="py-8 border-t border-slate-50 text-center">
                    <div className="inline-flex items-center px-4 py-2 bg-slate-50 rounded-full text-slate-400 text-xs font-mono uppercase">
                      shabdaAI v2.0.1 | CORE_ENGINE_BUILD | 2026
                    </div>
                 </footer>
               </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </main>

      <div className="fixed bottom-0 left-0 w-full h-[6px] bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-400" />
    </div>
  );
}
