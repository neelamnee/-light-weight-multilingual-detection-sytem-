import Fuse from 'fuse.js';
import { ENGLISH_WORDS_SET, ENGLISH_WORDS_LIST } from './english-words';
import { AMBIGUITY_RECOGNITION } from './context-resolver';

export const COMMON_TYPO_CORRECTIONS: Record<string, string> = {
  "yoou": "you",
  "yoo": "you",
  "u": "you",
  "r": "are",
  "ur": "your",
  "gud": "good",
  "gd": "good",
  "mrng": "morning",
  "morn": "morning",
  "tomo": "tomorrow",
  "tommorrow": "tomorrow",
  "pls": "please",
  "plz": "please",
  "thx": "thanks",
  "thks": "thanks",
  "thanks": "thanks",
  "wud": "would",
  "cud": "could",
  "shud": "should",
  "abt": "about",
  "wit": "with",
  "wel": "well",
  "pic": "picture",
  "vid": "video",
  "wat": "what",
  "wot": "what",
  "y": "why",
  "n": "no",
  "k": "okay",
  "ok": "okay",
  "kya": "kya",
  "kr": "kar",
  "rha": "raha",
  "rho": "rahe",
  "h": "hai",
  "hn": "haan",
  "bro": "bro",
  "broooo": "bro",
  "broo": "bro",
  "sis": "sister",
  "siss": "sister",
  "hey": "hey",
  "heyy": "hey",
  "heyyy": "hey",
  "heyyyoooo": "hey",
  "wassup": "what's up",
  "wasup": "what's up",
  "wazzup": "what's up",
  "wazup": "what's up",
  "wasssup": "what's up",
  "wassssup": "what's up",
  "wasssuppp": "what's up",
  "sup": "what's up"
};

/**
 * Advanced String Metrics for Ensemble Scoring
 */
const StringMetrics = {
  // Levenshtein Distance (for character edits)
  levenshtein: (s1: string, s2: string): number => {
    const len1 = s1.length, len2 = s2.length;
    if (len1 === 0 || len2 === 0) return s1 === s2 ? 1 : 0;
    const matrix = Array.from({ length: len1 + 1 }, (_, i) => 
      Array.from({ length: len2 + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
    }
    const dist = matrix[len1][len2];
    return 1 - dist / Math.max(len1, len2);
  },

  // Sorensen-Dice Coefficient (for bigram overlap)
  dice: (s1: string, s2: string): number => {
    if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1 : 0;
    const getBigrams = (s: string) => {
      const bigrams = new Set();
      for (let i = 0; i < s.length - 1; i++) bigrams.add(s.substring(i, i + 2));
      return bigrams;
    };
    const b1 = getBigrams(s1), b2 = getBigrams(s2);
    const intersection = new Set([...b1].filter(x => b2.has(x))).size;
    return (2 * intersection) / (b1.size + b2.size);
  },

  // jaro-winkler revised for exactness
  jaroWinkler: (s1: string, s2: string): number => {
    let m = 0;
    if (s1.length === 0 || s2.length === 0) return 0;
    if (s1 === s2) return 1;
    const range = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length).fill(false), s2Matches = new Array(s2.length).fill(false);
    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - range), end = Math.min(i + range + 1, s2.length);
      for (let j = start; j < end; j++) {
        if (!s2Matches[j] && s1[i] === s2[j]) {
          s1Matches[i] = true; s2Matches[j] = true; m++; break;
        }
      }
    }
    if (m === 0) return 0;
    let t = 0, k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (s1Matches[i]) {
        while (!s2Matches[k]) k++;
        if (s1[i] !== s2[k]) t++;
        k++;
      }
    }
    const jaro = (m / s1.length + m / s2.length + (m - t / 2) / m) / 3;
    const p = 0.1; let l = 0;
    const maxPrefixLen = Math.min(s1.length, s2.length);
    while (l < maxPrefixLen && s1[l] === s2[l] && l < 4) l++;
    return Math.min(1, jaro + l * p * (1 - jaro));
  }
};

// Predefined abbreviations (the "Core Dictionary")
export const DEFAULT_ABBREVIATIONS: Record<string, string> = {
  "hru": "how are you",
  "gm": "good morning",
  "ttyl": "talk to you later",
  "brb": "be right back",
  "omw": "on my way",
  "omg": "oh my god",
  "idk": "i don't know",
  "btw": "by the way",
  "pls": "please",
  "plz": "please",
  "msg": "message",
  "asap": "as soon as possible",
  "fyi": "for your information",
  "tba": "to be announced",
  "tbd": "to be determined",
  "rofl": "rolling on the floor laughing",
  "lol": "laugh out loud",
  "gtg": "got to go",
  "np": "no problem",
  "ty": "thank you",
  "thx": "thanks",
  "ur": "your",
  "u": "you",
  "r": "are",
  "k": "okay",
  "ok": "okay",
  "txt": "text",
  "pic": "picture",
  "vid": "video",
  "imo": "in my opinion",
  "imho": "in my humble opinion",
  "nvm": "never mind",
  "lmk": "let me know",
  "tbh": "to be honest",
  "afk": "away from keyboard",
  "smh": "shaking my head",
  "icymi": "in case you missed it",
  "jk": "just kidding",
  "idc": "i don't care",
  "ikr": "i know right",
  "irl": "in real life",
  "tldr": "too long; didn't read",
  "tia": "thanks in advance",
  "aka": "also known as",
  "atm": "at the moment",
  "bc": "because",
  "bff": "best friends forever",
  "mhm": "yes",
  "nn": "night night",
  "gn": "good night",
  "hbd": "happy birthday",
  "bro": "bro",
  "hey": "hey",
  "gud": "good",
  "mrng": "morning",
  "wru": "where are you",
  "watru": "what are you",
  "ftw": "for the win",
  "ftl": "for the loss",
  "wat": "what",
  "wot": "what",
  "y": "why",
  "n": "no",
  "p": "per",
  "etc": "et cetera",
  "vs": "versus",
  // Multilingual / Hinglish
  "kr": "kar",
  "rha": "raha",
  "kya": "kya",
  "nhi": "nahi",
  "v": "bhi",
  "b": "bhi",
  "acha": "achha",
  "kkrho": "kya kar rahe ho",
  "krh": "kar raha",
  "rho": "rahe ho",
  "koi": "koi",
  "kuch": "kuch",
  "sb": "sab",
  "h": "hai",
  "hn": "haan",
  "svp": "s'il vous plaît",
  "tb": "también",
  "pq": "porque",
  // Popular Slang (Gen-Z & Social)
  "afaik": "as far as i know",
  "afaic": "as far as i'm concerned",
  "rn": "right now",
  "ngl": "not gonna lie",
  "wtv": "whatever",
  "fr": "for real",
  "sub": "subscribe",
  "dm": "direct message",
  "lmao": "laughing my ass off",
  "diy": "do it yourself",
  "faq": "frequently asked questions",
  "bogo": "buy one get one",
  "fyp": "for you page",
  "ama": "ask me anything",
  "bae": "before anyone else",
  "yolo": "you only live once",
  "yo": "hey",
  "yoo": "you",
  "iykyk": "if you know you know",
  "grwm": "get ready with me",
  "oof": "expression of pain or dismay",
  "rizz": "charisma",
  "gyatt": "shock exclamation",
  "sigma": "independent leader",
  "skibidi": "cool/weird",
  "yap": "talk excessively",
  "cap": "lie",
  "bet": "agreement deal",
  "bussing": "delicious food",
  "delulu": "delusional",
  "ate": "highly excelled",
  "slay": "succeed brilliantly",
  "stan": "obsessive fan",
  "simp": "submissive admirer",
  "tea": "juicy gossip",
  "sheesh": "expression of awe",
  "sus": "suspicious",
  "bop": "catchy song",
  "glowup": "transformation",
  "salty": "bitter/jealous",
  "mid": "mediocre",
  "extra": "dramatic/excessive",
  "boujee": "luxurious fancy",
  "lowkey": "subtly",
  "highkey": "openly",
  "opp": "opponent/rival",
  "bruh": "disbelief expression",
  "periodt": "end of discussion",
  "clout": "fame/influence",
  "ghost": "suddenly ignore",
  "flex": "show off",
  "shade": "sneaky insults",
  "valid": "acceptable/good",
  "unc": "uncle",
  "icl": "i can't lie",
  "cod": "call of duty",
  "wdym": "what do you mean",
  // Corporate/Academic & Acronyms
  "fci": "food corporation of india",
  "fcp": "factory cost price",
  "un": "united nations",
  "who": "world health organization",
  "api": "application programming interface",
  "db": "database",
  "ui": "user interface",
  "ux": "user experience",
  "ai": "artificial intelligence",
  "ml": "machine learning",
  "nlp": "natural language processing",
  "kpi": "key performance indicator",
  "roi": "return on investment",
  "cta": "call to action",
  "oos": "out of stock",
  "eta": "estimated time of arrival",
  "sql": "structured query language",
  "oop": "object oriented programming",
  "aws": "amazon web services",
  "gcp": "google cloud platform",
  "sdk": "software development kit",
  "ceo": "chief executive officer",
  "cto": "chief technology officer",
  "cfo": "chief finance officer",
  "hr": "human resources",
  "pr": "public relations",
  "b2b": "business to business",
  "b2c": "business to consumer",
};

export const SLANG_DEFINITIONS: Record<string, string> = {
  "rizz": "romantic charisma, charm, or the ability to attract and seduce a partner",
  "gyatt": "an expression of shock, surprise, or excitement (short for 'god damn')",
  "sigma": "a popular, successful, but highly independent and self-reliant person ('independent alpha')",
  "skibidi": "a nonsensical slang term representing cool, bad, or used as a random intensifier",
  "fanum tax": "the act of stealing a piece of food from your friend (popularized by stream culture)",
  "ohio": "used to describe something weird, cringe, or unusual",
  "mewing": "a tongue posture exercise believed to define and sculpt the jawline",
  "mog": "to look significantly more attractive, stylish, or physically superior than someone else",
  "yap": "to talk continuously, ramble, or chatter excessively about trivial things",
  "cap": "a lie, fabrication, or exaggeration (e.g. 'no cap' means 'no lie / for real')",
  "no cap": "seriously, absolutely for real, speaking the truth without lying",
  "bet": "an expression of agreement, approval, or accepting a challenge",
  "bussing": "extremely delicious, flavorful, or high-quality (usually referring to food)",
  "delulu": "delusional or holding extreme, unrealistically optimistic beliefs",
  "ate": "to do something exceptionally well, highly successfully, or beautifully (e.g., 'she ate that')",
  "crumbs": "evidence of effort or leftovers; 'no crumbs' means doing something absolutely flawlessly",
  "slay": "to perform outstandingly, look stunningly beautiful, or succeed brilliantly",
  "stan": "an extremely devoted, obsessive fan of a celebrity, artist, or group",
  "simp": "someone who acts overly sweet, submissive, or attentive to someone they have a crush on",
  "tea": "juicy gossip, secret personal information, or news (e.g., 'spill the tea')",
  "sheesh": "an exclamation of disbelief, shock, or being highly impressed by someone's success or skill",
  "sus": "suspicious, shady, untrustworthy, or questionable (short for 'suspicious')",
  "bop": "an incredibly catchy, high-energy song that makes you want to dance",
  "glowup": "a dramatic physical, mental, or lifestyle transformation for the better",
  "salty": "feeling bitter, defensive, jealous, or unnecessarily angry over a minor issue",
  "mid": "mediocre, average, second-rate, or unimpressive",
  "extra": "over-the-top, dramatic, unnecessary, or excessive behavior",
  "boujee": "luxurious, high-class, wealthy, or fancy in taste and lifestyle",
  "lowkey": "subtly, secretly, quietly, or to a moderate extent",
  "highkey": "openly, clearly, intensely, or with high emphasis",
  "goated": "considered the greatest of all time (abbreviation of G.O.A.T.)",
  "ratio": "when a reply to a post gets more likes or engagement than the original post",
  "clout": "influence, popularity, power, or social media fame",
  "ghost": "to suddenly cut off all communication with some one without warning",
  "cancel": "to collectively reject, boycott, or stop supporting a public figure due to controversial actions",
  "cringe": "feeling intense embarrassment, awkwardness, or second-hand shame on behalf of someone",
  "flex": "to show off your achievements, physical body, status, or valuable possessions",
  "shade": "sneaky, subtle, or indirect insults directed at someone (e.g., 'throwing shade')",
  "rent free": "occupying your thoughts constantly and obsessively without any reason",
  "snack": "someone who looks extremely attractive, stylish, and appealing",
  "valid": "completely understandable, impressive, cool, or socially acceptable",
  "sluff": "to skip class, shirk responsibilities, or take a lazy day",
  "w": "represents a victory, triumph, or win (e.g., 'huge W')",
  "l": "represents a loss, failure, or disappointment (e.g., 'took an L')",
  "opp": "opponent, competitor, rival, or enemy",
  "bruh": "colloquial expression of disbelief, exhaustion, or disappointment, synonym of 'bro'",
  "periodt": "used to end a statement with absolute emphasis, meaning there is no more discussion",
  "hits different": "feels uniquely amazing, comforting, or evokes a special level of emotion",
  "main character": "someone who exhibits confidence, charisma, or behaves as if they are the protagonist",
  "unc": "an older person, older male, or someone who acts like an 'old head' and is out of touch with modern trends",
  "icl": "I can't lie (used to assert honesty in a statement)",
  "cod": "Call of Duty (popular video game franchise) or Cash on Delivery",
  "wdym": "what do you mean (asking for clarification)",
};

/**
 * Metadata for Common Abbreviations to calculate Dictionary Frequency and Context Relevance
 */
export const ABBREVIATIONS_METADATA: Record<string, { frequency: number; keywords: string[] }> = {
  idk: { frequency: 0.95, keywords: ["sure", "know", "answer", "think", "ask", "question", "clue", "idea", "who", "what", "how", "why"] },
  brb: { frequency: 0.90, keywords: ["wait", "later", "minute", "sec", "back", "away", "hold", "call", "dinner", "food", "busy"] },
  pls: { frequency: 0.95, keywords: ["help", "give", "send", "tell", "need", "please", "favor", "do", "would", "could", "ask"] },
  plz: { frequency: 0.92, keywords: ["help", "give", "send", "tell", "need", "please", "favor", "do", "would", "could", "ask"] },
  lol: { frequency: 0.98, keywords: ["funny", "joke", "laugh", "meme", "haha", "cringe", "rofl", "lmao", "silly", "crazy"] },
  lmao: { frequency: 0.92, keywords: ["funny", "joke", "laugh", "meme", "haha", "cringe", "rofl", "lmao", "silly", "crazy"] },
  ty: { frequency: 0.90, keywords: ["help", "thanks", "thank", "grateful", "appreciate", "welcome", "nice", "kind", "done"] },
  thx: { frequency: 0.92, keywords: ["help", "thanks", "thank", "grateful", "appreciate", "welcome", "nice", "kind", "done"] },
  ok: { frequency: 0.99, keywords: ["agree", "fine", "yes", "sure", "cool", "good", "done", "perfect", "understand", "clear"] },
  rn: { frequency: 0.88, keywords: ["busy", "now", "current", "doing", "working", "talking", "at", "moment", "today", "instant"] },
  ngl: { frequency: 0.85, keywords: ["honest", "truth", "think", "really", "actually", "opinion", "say", "feel", "tbh"] },
  btw: { frequency: 0.92, keywords: ["know", "mention", "add", "forgot", "way", "also", "fact", "heard", "did"] },
  lmk: { frequency: 0.85, keywords: ["know", "tell", "send", "update", "status", "ready", "decision", "call", "text"] },
  tbh: { frequency: 0.88, keywords: ["honest", "truth", "think", "really", "actually", "opinion", "say", "feel", "ngl"] },
  wdym: { frequency: 0.85, keywords: ["mean", "what", "explain", "understand", "clue", "confused", "question", "say"] },
  gm: { frequency: 0.80, keywords: ["morning", "sun", "early", "coffee", "wake", "day", "start", "today"] },
  gn: { frequency: 0.80, keywords: ["night", "sleep", "bed", "dream", "late", "dark", "tired"] },
  fci: { frequency: 0.30, keywords: ["food", "corporation", "india", "rice", "wheat", "government", "grain", "supply"] },
  pm: { frequency: 0.75, keywords: ["me", "text", "send", "chat", "msg", "dm", "write", "talk", "reply", "social", "inbox", "sent", "ping", "message", "contact"] },
  hr: { frequency: 0.75, keywords: ["employee", "hired", "department", "salary", "complaint", "benefits", "interview", "recruiting", "workplace", "payroll", "fired", "contract", "staff", "onboarding", "policy"] },
  ml: { frequency: 0.70, keywords: ["ai", "model", "python", "data", "training", "neural", "network", "deep", "supervised", "predict", "dataset", "algorithm", "code", "computer", "llm", "weights", "inference"] },
  md: { frequency: 0.70, keywords: ["hospital", "sick", "clinic", "patient", "medicine", "nurse", "health", "physician", "prescription", "doctor", "treatment", "pain", "illness", "surgeon", "checkup", "flu"] },
  atm: { frequency: 0.75, keywords: ["money", "cash", "bank", "withdraw", "card", "debit", "credit", "teller", "pin", "dollar", "rupees", "finance", "fee", "machine", "location", "find", "fees"] },
};

export interface ProcessedWord {
  original: string;
  cleaned: string;
  normalized: string;
  confidence: number;
  type: 'exact' | 'fuzzy' | 'none' | 'reduced' | 'unseen';
  isAbbreviation: boolean;
  isNoisyCleaned: boolean;
  fallbackCandidate?: string;
  meaning?: string;
  pipelineSteps?: { stage: string; output: string; status: string }[];
  classification?: 'Greeting' | 'English Word' | 'Abbreviation' | 'Internet Slang' | 'Unknown Word';
  contextInfo?: {
    prevToken: string;
    currentToken: string;
    nextToken: string;
    intent: string;
    candidates: { candidate: string; score: number; confidence: number }[];
    contextScore: number;
    confidenceScore: number;
    finalSelection: string;
    reason: string;
  };
}

export class NLPEngine {
  private dictionary: Map<string, string>;
  private fuse: Fuse<string>;

  constructor(customDict: Record<string, string> = {}) {
    this.dictionary = new Map(Object.entries({ ...DEFAULT_ABBREVIATIONS, ...customDict }));
    this.fuse = this.createFuse();
  }

  private createFuse() {
    return new Fuse(Array.from(this.dictionary.keys()), {
      includeScore: true,
      threshold: 0.3,
      location: 0,
      distance: 100,
      minMatchCharLength: 1,
      shouldSort: true,
    });
  }

  /**
   * Intelligently de-duplicates runs of matching characters (length >= 2).
   * Generates combinations (reducing to 1 or 2 copies of the repeated letter).
   */
  private generateDeDuplicatedCandidates(word: string): string[] {
    const isWordAlreadyValid = this.checkEnglishDictionary(word) || 
                               this.getGreetingNormalization(word) !== null || 
                               this.dictionary.has(word) ||
                               SLANG_DEFINITIONS[word] !== undefined;
    
    if (isWordAlreadyValid) {
      return [word];
    }

    const runs: { char: string; start: number; length: number }[] = [];
    let i = 0;
    while (i < word.length) {
      let j = i;
      while (j < word.length && word[j] === word[i]) {
        j++;
      }
      const len = j - i;
      if (len >= 2) {
        runs.push({ char: word[i], start: i, length: len });
      }
      i = j;
    }

    if (runs.length === 0) {
      return [word];
    }

    // Limit to prevent exponential candidate explosion (max 5 active runs)
    const activeRuns = runs.slice(0, 5);

    let candidates: string[] = [""];
    let lastIndex = 0;

    for (const run of activeRuns) {
      const prefix = word.substring(lastIndex, run.start);
      const nextCandidates: string[] = [];
      for (const cand of candidates) {
        nextCandidates.push(cand + prefix + run.char);
        nextCandidates.push(cand + prefix + run.char + run.char);
      }
      candidates = nextCandidates;
      lastIndex = run.start + run.length;
    }

    const suffix = word.substring(lastIndex);
    const uniqueCandidates = Array.from(new Set(candidates.map(cand => cand + suffix)));
    
    // Always sort candidates so that shorter versions (fully reduced) are evaluated first
    return uniqueCandidates.sort((a, b) => a.length - b.length);
  }

  /**
   * Identifies if a word is an expressive greeting and maps to standard forms.
   */
  private getGreetingNormalization(word: string): string | null {
    const clean = word.toLowerCase().trim().replace(/[^\w]/g, '');
    
    // "hi" patterns: h followed by one or more i's
    if (/^h+i+$/i.test(clean)) return "Hi";
    
    // "hey" patterns: h followed by e, y, o
    if (/^h+e+y+[yo]*$/i.test(clean)) return "Hey";
    
    // "hello" patterns: h followed by e, l, o
    if (/^h+e+l+l*o+[lo]*$/i.test(clean)) return "Hello";
    
    // "whats up" / "wassup" / "wazzup" / "whatssssup" patterns: w followed by optional h, a, optional t, s/z, u, p
    if (/^w+h*a+t*[sz]*u+p+s*$/i.test(clean)) return "What's up";
    
    // "sup" patterns: s followed by u, p
    if (/^s+u+p+$/i.test(clean)) return "What's up";
    
    // "yo" patterns: y followed by o's
    if (/^y+o+$/i.test(clean)) return "Yo";
    
    return null;
  }

  /**
   * Verifies standard English dictionary inclusion with basic plural/past stem resolution.
   */
  private checkEnglishDictionary(word: string): boolean {
    const w = word.toLowerCase().trim();
    if (ENGLISH_WORDS_SET.has(w)) return true;
    
    // Try simple morphological suffixes
    if (w.endsWith('s') && w.length > 2 && ENGLISH_WORDS_SET.has(w.slice(0, -1))) return true;
    if (w.endsWith('es') && w.length > 3 && ENGLISH_WORDS_SET.has(w.slice(0, -2))) return true;
    if (w.endsWith('ed') && w.length > 3 && ENGLISH_WORDS_SET.has(w.slice(0, -2))) return true;
    if (w.endsWith('ed') && w.length > 2 && ENGLISH_WORDS_SET.has(w.slice(0, -1))) return true;
    if (w.endsWith('ing') && w.length > 4) {
      const stem = w.slice(0, -3);
      if (ENGLISH_WORDS_SET.has(stem)) return true;
      if (ENGLISH_WORDS_SET.has(stem + 'e')) return true;
    }
    if (w.endsWith('ly') && w.length > 3 && ENGLISH_WORDS_SET.has(w.slice(0, -2))) return true;
    
    return false;
  }

  private isAbbreviationHeuristic(word: string): boolean {
    const clean = word.toLowerCase().trim();
    if (clean.length < 2 || clean.length > 8) return false;
    if (!isNaN(Number(clean))) return false;

    // Common standard words set to exclude typical language grammar
    const standardWords = new Set([
      'the', 'and', 'for', 'you', 'are', 'was', 'with', 'they', 'this', 'have', 'from', 'one', 'had', 'word', 'but', 'not', 'what', 'all', 'were', 'when', 'your', 'can', 'said', 'there', 'use', 'an', 'each', 'which', 'she', 'how', 'their', 'will', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'some', 'her', 'would', 'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more', 'write', 'go', 'see', 'no', 'way', 'could', 'people', 'my', 'than', 'first', 'water', 'been', 'call', 'who', 'oil', 'its', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part', 'new', 'take', 'only', 'me', 'our', 'under', 'very', 'after', 'back', 'good', 'well', 'your', 'with', 'made', 'said', 'here',
      'hai', 'haan', 'kya', 'bhi', 'se', 'ko', 'mein', 'par', 'aur', 'toh', 'bhai', 'yaar', 'meri', 'mera', 'apna', 'apni', 'raha', 'rahe', 'rahi', 'kar', 'karo', 'gaya', 'gayi', 'gaye', 'bina', 'kuch', 'sab', 'koi', 'ek', 'hi', 'billi', 'kutta', 'gadi', 'ghar', 'pani', 'khana'
    ]);

    if (standardWords.has(clean)) return false;
    if (clean.length <= 4) return true;

    // For slightly longer words (5-8), check if it has a high consonant ratio (>= 0.6)
    const vowels = (clean.match(/[aeiouy]/g) || []).length;
    const consonantRatio = (clean.length - vowels) / clean.length;
    if (vowels === 0 || consonantRatio >= 0.6) return true;

    return false;
  }

  /**
   * Sequence-based acronym / subsequence alignment predictor
   */
  public sequencePredictor(word: string): { phrase: string; key: string; score: number } | null {
    const target = word.toLowerCase().trim();
    if (target.length < 2) return null;

    let bestMatch: { phrase: string; key: string; score: number } | null = null;
    const minorWords = new Set(['of', 'to', 'in', 'at', 'on', 'and', 'or', 'the', 'a', 'an', 'is', 'for', 'by', 'with', 'about']);

    this.dictionary.forEach((phrase, key) => {
      const lowerPhrase = phrase.toLowerCase().trim();
      const phraseWords = lowerPhrase.split(/\s+/).filter(Boolean);

      // Guard check: First character must match key or phrase start
      if (target[0] !== lowerPhrase[0] && target[0] !== key[0]) {
        return;
      }

      // 1. Multi-word acronym matching
      if (phraseWords.length > 1) {
        const fullInitials = phraseWords.map(w => w[0]).join('');
        const majorInitials = phraseWords
          .filter(w => !minorWords.has(w))
          .map(w => w[0])
          .join('');

        if (target === fullInitials) {
          if (!bestMatch || bestMatch.score < 0.99) {
            bestMatch = { phrase, key, score: 0.99 };
          }
          return;
        }

        if (target === majorInitials) {
          if (!bestMatch || bestMatch.score < 0.98) {
            bestMatch = { phrase, key, score: 0.98 };
          }
          return;
        }

        let initIdx = 0;
        let matchedInitials = 0;
        for (let i = 0; i < target.length; i++) {
          const ch = target[i];
          const foundIdx = fullInitials.indexOf(ch, initIdx);
          if (foundIdx !== -1) {
            matchedInitials++;
            initIdx = foundIdx + 1;
          } else {
            break;
          }
        }

        if (matchedInitials === target.length) {
          const ratio = target.length / fullInitials.length;
          const score = 0.80 + (ratio * 0.14);
          if (!bestMatch || bestMatch.score < score) {
            bestMatch = { phrase, key, score };
          }
          return;
        }
      }

      // 2. Contraction of abbreviation key (e.g. "wdm" -> key "wdym")
      if (key.length >= 3) {
        if (target[0] === key[0]) {
          let keyIdx = 0;
          let matchedCount = 0;
          for (let i = 0; i < target.length; i++) {
            const ch = target[i];
            const foundIdx = key.indexOf(ch, keyIdx);
            if (foundIdx !== -1) {
              matchedCount++;
              keyIdx = foundIdx + 1;
            } else {
              break;
            }
          }

          if (matchedCount === target.length) {
            const ratio = target.length / key.length;
            const score = 0.70 + (ratio * 0.25);
            if (!bestMatch || bestMatch.score < score) {
              bestMatch = { phrase, key, score };
            }
            return;
          }
        }
      }

      // 3. Prefix matching of key (e.g., "rizzler" -> "rizz") - Only for keys of length >= 3 to avoid matching single-letter abbreviations
      if (key.length >= 3 && target.startsWith(key) && target.length > key.length) {
        const ratio = key.length / target.length;
        const score = 0.84 + (ratio * 0.12);
        if (!bestMatch || bestMatch.score < score) {
          bestMatch = { phrase, key, score };
        }
        return;
      }
    });

    if (bestMatch && bestMatch.score > 0.60) {
      return bestMatch;
    }

    return null;
  }

  /**
   * Full Normalization Pipeline for an individual Word with a 12-Stage Architecture
   */
  public processWord(
    word: string,
    surroundingContext: string[] = [],
    wordIdx: number = 0,
    fullSentenceTokens: string[] = []
  ): ProcessedWord {
    const raw = word.trim();
    if (!raw) {
      return { original: '', cleaned: '', normalized: '', confidence: 0, type: 'none', isAbbreviation: false, isNoisyCleaned: false };
    }

    const pipelineSteps: { stage: string; output: string; status: string }[] = [];

    // Stage 1: Input Text
    pipelineSteps.push({
      stage: "Input Text",
      output: raw,
      status: `Received raw token "${raw}".`
    });

    // Stage 2: Text Preprocessing
    const loweredRaw = raw.toLowerCase();
    let cleaned = loweredRaw.replace(/^[^\w]+|[^\w]+$/g, '');
    const hasPunctuationOrCaseNoise = (raw !== cleaned && loweredRaw !== cleaned);
    pipelineSteps.push({
      stage: "Text Preprocessing",
      output: cleaned,
      status: `Standardized casing and stripped leading/trailing punctuation. Cleaned: "${cleaned}".`
    });

    // Stage 3: Character Normalization
    // Use generateDeDuplicatedCandidates to resolve excessive runs of 2+ characters
    const deDuplicatedCandidates = this.generateDeDuplicatedCandidates(cleaned);
    let charNormalized = cleaned;
    
    // Choose the best candidate that matches standard dictionary words or greetings or abbreviations
    let chosenSource = "heuristic fallback (shortest candidate)";
    if (deDuplicatedCandidates.length > 0) {
      let foundIdeal = false;
      
      // 1. Check if any is a greeting
      for (const cand of deDuplicatedCandidates) {
        if (this.getGreetingNormalization(cand) !== null) {
          charNormalized = cand;
          chosenSource = "expressive greeting match";
          foundIdeal = true;
          break;
        }
      }
      
      // 2. Check if any is a known abbreviation/slang
      if (!foundIdeal) {
        for (const cand of deDuplicatedCandidates) {
          if (this.dictionary.has(cand) || SLANG_DEFINITIONS[cand] !== undefined) {
            charNormalized = cand;
            chosenSource = "known abbreviation/slang registry match";
            foundIdeal = true;
            break;
          }
        }
      }
      
      // 3. Check if any is a valid English word
      if (!foundIdeal) {
        for (const cand of deDuplicatedCandidates) {
          if (this.checkEnglishDictionary(cand)) {
            charNormalized = cand;
            chosenSource = "standard English dictionary match";
            foundIdeal = true;
            break;
          }
        }
      }
      
      // 4. Default to shortest candidate (which collapses excessive repeating character runs)
      if (!foundIdeal) {
        charNormalized = deDuplicatedCandidates[0]; // sorted by shortest length
      }
    }

    const hasRepeatedLetters = (cleaned !== charNormalized);
    const isNoisyCleaned = hasPunctuationOrCaseNoise || hasRepeatedLetters;
    pipelineSteps.push({
      stage: "Character Normalization",
      output: charNormalized,
      status: hasRepeatedLetters
        ? `Reduced duplicate character runs. Candidate selected via ${chosenSource}: "${charNormalized}".`
        : `Preserved character structure (no excessive repeating runs).`
    });

    // Stage 4: Spelling Correction
    let spellCorrected = charNormalized;
    let spellCorrectionApplied = false;
    let spellCorrectionDetails = "Word matches standard formats; skipping correction.";

    const lowercaseCharNorm = charNormalized.toLowerCase();
    if (COMMON_TYPO_CORRECTIONS[lowercaseCharNorm] !== undefined) {
      spellCorrected = COMMON_TYPO_CORRECTIONS[lowercaseCharNorm];
      spellCorrectionApplied = true;
      spellCorrectionDetails = `Corrected common typing variation / typo: "${charNormalized}" -> "${spellCorrected}".`;
    } else {
      const isWordAlreadyValid = this.checkEnglishDictionary(charNormalized) || 
                                 this.getGreetingNormalization(charNormalized) !== null || 
                                 this.dictionary.has(charNormalized) ||
                                 SLANG_DEFINITIONS[charNormalized] !== undefined;
      
      if (!isWordAlreadyValid && charNormalized.length >= 3) {
        let bestSpellCandidate: string | null = null;
        let maxSpellScore = 0;
        for (const dictWord of ENGLISH_WORDS_LIST) {
          const score = StringMetrics.jaroWinkler(charNormalized, dictWord);
          if (score > maxSpellScore) {
            maxSpellScore = score;
            bestSpellCandidate = dictWord;
          }
        }
        if (bestSpellCandidate && maxSpellScore >= 0.88) {
          spellCorrected = bestSpellCandidate;
          spellCorrectionApplied = true;
          spellCorrectionDetails = `Corrected phonetic spelling to closest dictionary match (score ${(maxSpellScore * 100).toFixed(0)}%): "${charNormalized}" -> "${spellCorrected}".`;
        }
      }
    }

    pipelineSteps.push({
      stage: "Spelling Correction",
      output: spellCorrected,
      status: spellCorrectionDetails
    });

    // Stage 5: Greeting Detection
    const greetingNormalization = this.getGreetingNormalization(spellCorrected);
    const isGreeting = greetingNormalization !== null;
    const greetingForm = isGreeting ? greetingNormalization! : spellCorrected;
    
    pipelineSteps.push({
      stage: "Greeting Detection",
      output: greetingForm,
      status: isGreeting 
        ? `Greeting detected and normalized to standard form: "${spellCorrected}" -> "${greetingForm}".` 
        : `No greeting pattern matches found.`
    });

    // Stage 6: English Dictionary Validation
    const isEnglishWord = this.checkEnglishDictionary(greetingForm);
    pipelineSteps.push({
      stage: "English Dictionary Validation",
      output: isEnglishWord ? "Valid English Word" : "Not In Dictionary",
      status: isEnglishWord
        ? `Validated "${greetingForm}" as a valid English word. Restricting fuzzy expansions to preserve sentence integrity.`
        : `Token is not present in standard English dictionary.`
    });

    // Stage 7: Context-Aware Normalization
    let sentenceIntent = "Informative/Social";
    const sentenceLower = fullSentenceTokens.join(" ").toLowerCase();
    const hasQuestion = sentenceLower.includes("?") || /^how|^why|^what|^where|^when|^kya/i.test(sentenceLower);
    const isSentenceGreeting = /hi|hello|hey|gud morning|gm|gn/i.test(sentenceLower);
    const hasBusiness = /approved|budget|meeting|boss|deadline|hired|project|report|scrum|agile|office|work|client|job|status|tasks|assigned|hiring/i.test(sentenceLower);
    const hasTech = /ai|model|python|data|training|neural|network|deep|supervised|predict|dataset|algorithm|code|computer|llm|weights|inference|api|ui|ux|sdk/i.test(sentenceLower);
    const hasTime = /wait|later|minute|sec|back|away|hours|hrs|time|clock|minutes|day|long/i.test(sentenceLower);

    if (hasQuestion) sentenceIntent = "Question";
    else if (isSentenceGreeting) sentenceIntent = "Greeting";
    else if (hasBusiness) sentenceIntent = "Business/Corporate";
    else if (hasTech) sentenceIntent = "Technical/Development";
    else if (hasTime) sentenceIntent = "Time/Temporal";

    const prevToken = wordIdx > 0 ? fullSentenceTokens[wordIdx - 1] : "N/A";
    const nextToken = wordIdx < fullSentenceTokens.length - 1 ? fullSentenceTokens[wordIdx + 1] : "N/A";

    const lowercaseGreetingForm = greetingForm.toLowerCase();
    const abbrevDef = AMBIGUITY_RECOGNITION[lowercaseGreetingForm] || (lowercaseGreetingForm.endsWith("s") && AMBIGUITY_RECOGNITION[lowercaseGreetingForm.slice(0, -1)]);
    const contextCandidates: { candidate: string; score: number; confidence: number; explanation?: string }[] = [];
    let bestContextScore = 0;
    let finalContextMatch = "";

    if (abbrevDef) {
      const totalCandCount = abbrevDef.candidates.length;
      abbrevDef.candidates.forEach(cand => {
        let matchedCount = 0;
        const matchedWords: string[] = [];
        surroundingContext.forEach(ctx => {
          if (cand.keywords.some(kw => ctx === kw || (ctx.length > 3 && kw.startsWith(ctx)) || (kw.length > 3 && ctx.startsWith(kw)))) {
            matchedCount++;
            matchedWords.push(ctx);
          }
        });
        const contextScore = cand.baseScore + (matchedCount * 0.4);
        contextCandidates.push({
          candidate: cand.expansion,
          score: contextScore,
          confidence: 0,
          explanation: matchedCount > 0 
            ? `Matched surrounding keywords: [${matchedWords.join(", ")}]` 
            : `Fell back to baseline scope.`
        });
      });
      const sumScores = contextCandidates.reduce((sum, item) => sum + item.score, 0);
      contextCandidates.forEach(item => {
        item.confidence = sumScores > 0 ? item.score / sumScores : 1 / totalCandCount;
      });
      contextCandidates.sort((a, b) => b.score - a.score);
      bestContextScore = contextCandidates[0]?.score || 0;
      finalContextMatch = contextCandidates[0]?.candidate || "";
    }

    pipelineSteps.push({
      stage: "Context-Aware Normalization",
      output: `Intent: ${sentenceIntent}`,
      status: `Sentence intent identified as "${sentenceIntent}". Window context around "${greetingForm}": [${prevToken}] -> [${greetingForm}] -> [${nextToken}]. ${
        abbrevDef 
          ? `Disambiguated ambiguous abbreviation (Winner: "${finalContextMatch}" with confidence ${(contextCandidates[0]?.confidence * 100).toFixed(0)}%).`
          : `No ambiguous terms requiring sentence context disambiguation.`
      }`
    });

    // Stage 8: Abbreviation Detection
    const hasAbbrevLookup = this.dictionary.has(lowercaseGreetingForm);
    const hasSlangLookup = SLANG_DEFINITIONS[lowercaseGreetingForm] !== undefined;
    const isAbbrevHeuristic = this.isAbbreviationHeuristic(lowercaseGreetingForm);
    
    let classification: 'Greeting' | 'English Word' | 'Abbreviation' | 'Internet Slang' | 'Unknown Word' = 'Unknown Word';
    if (isGreeting) classification = 'Greeting';
    else if (isEnglishWord) classification = 'English Word';
    else if (hasSlangLookup) classification = 'Internet Slang';
    else if (hasAbbrevLookup || isAbbrevHeuristic) classification = 'Abbreviation';

    const isAbbreviation = classification === 'Abbreviation' || classification === 'Internet Slang';

    pipelineSteps.push({
      stage: "Abbreviation Detection",
      output: isAbbreviation ? `Detected: ${classification}` : "Negative",
      status: isAbbreviation
        ? `Abbreviation classified as "${classification}".`
        : `Casing and structure analyzed: not flagged as a noisy abbreviation/slang.`
    });

    // Stage 9: Knowledge Base Lookup
    let isKBHit = false;
    let kbOutput = "No Match";
    let kbExpansion = "";

    if (this.dictionary.has(lowercaseGreetingForm)) {
      isKBHit = true;
      kbExpansion = this.dictionary.get(lowercaseGreetingForm)!;
      kbOutput = `${lowercaseGreetingForm} -> ${kbExpansion}`;
    }

    pipelineSteps.push({
      stage: "Knowledge Base Lookup",
      output: isKBHit ? "Hit Found" : "Miss",
      status: isKBHit
        ? `Found direct pattern match in abbreviation registry: "${kbOutput}".`
        : `No direct matching dictionary entry exists for "${greetingForm}".`
    });

    // Stage 10: Similarity Matching (only if required)
    // Only apply similarity matching when necessary (i.e. not a valid English word and no exact KB hit and not a greeting)
    let similarityMatchRequired = !isEnglishWord && !isGreeting && !isKBHit;
    let bestSimilarityWinner: { key: string; expansion: string; type: 'exact' | 'reduced' | 'fuzzy'; similarity: number; contextWeight: number; finalScore: number } | null = null;
    let similarityDetails = "Similarity matching was skipped to preserve valid English structure.";

    if (similarityMatchRequired) {
      const candidateList: { key: string; expansion: string; type: 'exact' | 'reduced' | 'fuzzy'; baseScore: number }[] = [];
      
      // Sequence contraction matching
      const prediction = this.sequencePredictor(lowercaseGreetingForm);
      if (prediction) {
        candidateList.push({
          key: prediction.key,
          expansion: prediction.phrase,
          type: 'fuzzy',
          baseScore: prediction.score
        });
      }

      // Check all abbreviations
      this.dictionary.forEach((phrase, key) => {
        const jw = StringMetrics.jaroWinkler(lowercaseGreetingForm, key);
        if (jw >= 0.82) {
          candidateList.push({
            key,
            expansion: phrase,
            type: key === lowercaseGreetingForm ? 'exact' : 'fuzzy',
            baseScore: jw
          });
        }
      });

      const rankedCandidates: { key: string; expansion: string; type: 'exact' | 'reduced' | 'fuzzy'; similarity: number; contextWeight: number; finalScore: number }[] = [];
      candidateList.forEach(cand => {
        let sim = cand.baseScore;
        let contextWeight = 0;
        const meta = ABBREVIATIONS_METADATA[cand.key];
        if (meta) {
          surroundingContext.forEach(ctx => {
            if (meta.keywords.includes(ctx)) {
              contextWeight += 0.20;
            }
          });
        }
        if (finalContextMatch === cand.expansion) {
          contextWeight += 0.40;
        }

        rankedCandidates.push({
          key: cand.key,
          expansion: cand.expansion,
          type: cand.type,
          similarity: sim,
          contextWeight,
          finalScore: sim + contextWeight
        });
      });

      rankedCandidates.sort((a, b) => b.finalScore - a.finalScore);
      if (rankedCandidates.length > 0) {
        bestSimilarityWinner = rankedCandidates[0];
        similarityDetails = `Ranked candidates using Ensemble metrics. Winner: "${bestSimilarityWinner.expansion}" (Score: ${bestSimilarityWinner.finalScore.toFixed(2)}).`;
      } else {
        similarityDetails = `Executed similarity metric scan; no high-confidence matching options found.`;
      }
    }

    pipelineSteps.push({
      stage: "Similarity Matching (only if required)",
      output: bestSimilarityWinner ? bestSimilarityWinner.expansion : "Skipped/Not Required",
      status: similarityDetails
    });

    // Stage 11: Expansion Generation
    let selectedNormalized = greetingForm;
    let selectedType: 'exact' | 'fuzzy' | 'none' | 'reduced' | 'unseen' = 'none';
    let decisionReason = "";

    if (isGreeting) {
      selectedNormalized = greetingForm;
      selectedType = hasRepeatedLetters ? 'reduced' : 'exact';
      decisionReason = `Greeting expanded/normalized: "${raw}" -> "${selectedNormalized}".`;
    } else if (isKBHit) {
      selectedNormalized = kbExpansion;
      selectedType = lowercaseGreetingForm !== cleaned ? 'reduced' : 'exact';
      decisionReason = `Exact match abbreviation mapping expanded: "${greetingForm}" -> "${selectedNormalized}".`;
    } else if (bestSimilarityWinner && bestSimilarityWinner.finalScore >= 0.85) {
      selectedNormalized = bestSimilarityWinner.expansion;
      selectedType = 'fuzzy';
      decisionReason = `Fuzzy abbreviation matched and expanded: "${greetingForm}" -> "${selectedNormalized}".`;
    } else if (isEnglishWord) {
      selectedNormalized = greetingForm;
      selectedType = 'none';
      decisionReason = `English dictionary validation succeeded. Token preserved to maintain natural sentence meaning.`;
    } else {
      selectedNormalized = greetingForm;
      selectedType = isAbbrevHeuristic ? 'unseen' : 'none';
      decisionReason = `Preserved token unchanged: no high confidence mappings found.`;
    }

    // Capitalization matching original form
    let finalNormalized = selectedNormalized;
    if (raw.length > 0 && raw[0] === raw[0].toUpperCase()) {
      // If original starts with uppercase, capitalize expansion words
      finalNormalized = selectedNormalized.split(/\s+/).map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ');
    }

    pipelineSteps.push({
      stage: "Expansion Generation",
      output: finalNormalized,
      status: decisionReason
    });

    // Stage 12: Final Output
    pipelineSteps.push({
      stage: "Final Output",
      output: finalNormalized,
      status: `Restored casing and punctuation format. Result: "${finalNormalized}".`
    });

    // Calculate confidence
    let confidence = 1.0;
    if (isGreeting) confidence = 0.98;
    else if (isKBHit) confidence = 1.0;
    else if (bestSimilarityWinner) confidence = Math.min(1.0, bestSimilarityWinner.similarity);
    else if (isEnglishWord) confidence = 0.95;
    else confidence = 0.50;

    const contextInfo = {
      prevToken,
      currentToken: raw,
      nextToken,
      intent: sentenceIntent,
      candidates: contextCandidates.map(c => ({ candidate: c.candidate, score: c.score, confidence: c.confidence })),
      contextScore: bestContextScore,
      confidenceScore: confidence,
      finalSelection: finalNormalized,
      reason: decisionReason
    };

    const result: ProcessedWord = {
      original: raw,
      cleaned,
      normalized: finalNormalized,
      confidence,
      type: selectedType,
      isAbbreviation: isAbbreviation || isGreeting,
      isNoisyCleaned,
      classification,
      pipelineSteps,
      contextInfo
    };

    if (isAbbreviation || isGreeting) {
      const slangKey = result.cleaned.toLowerCase().trim();
      const slangMeaning = SLANG_DEFINITIONS[slangKey] || SLANG_DEFINITIONS[result.normalized.toLowerCase().trim()];
      if (slangMeaning) {
        result.meaning = slangMeaning;
      } else {
        result.meaning = result.normalized;
      }
    }

    return result;
  }

  public processText(text: string): ProcessedWord[] {
    const words = text.split(/\s+/).filter(Boolean);
    const cleanedContext = words.map(w => w.toLowerCase().replace(/[^\w]/g, ''));
    
    return words.map((w, idx) => {
      const surrounding = cleanedContext.filter((_, cIdx) => cIdx !== idx);
      return this.processWord(w, surrounding, idx, words);
    }).filter(pw => pw.original !== '');
  }

  public getDictionary(): Record<string, string> {
    const dict: Record<string, string> = {};
    this.dictionary.forEach((v, k) => dict[k] = v);
    return dict;
  }
}
