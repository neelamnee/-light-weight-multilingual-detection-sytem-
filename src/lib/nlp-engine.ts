import Fuse from 'fuse.js';

/**
 * Advanced String Metrics for Ensemble Scoring
 */
const StringMetrics = {
  // Levenshtein Distance (for character edits)
  levenshtein: (s1: string, s2: string): number => {
    const len1 = s1.length, len2 = s2.length;
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
    while (s1[l] === s2[l] && l < 4) l++;
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
  "bro": "brother",
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
  // Corporate/Academic
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
};

export interface ProcessedWord {
  original: string;
  cleaned: string;
  normalized: string;
  confidence: number;
  type: 'exact' | 'fuzzy' | 'none' | 'reduced';
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

  private reduceRepeatedChars(word: string): string {
    return word.replace(/(.)\1{2,}/g, '$1');
  }

  public processWord(word: string): ProcessedWord {
    const raw = word.trim();
    if (!raw) return { original: '', cleaned: '', normalized: '', confidence: 0, type: 'none' };

    let cleaned = raw.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '');
    
    // 1. Exact direct match
    if (this.dictionary.has(cleaned)) {
      return { original: raw, cleaned: cleaned, normalized: this.dictionary.get(cleaned)!, confidence: 1.0, type: 'exact' };
    }

    // 2. Reduction match
    const afterReduction = this.reduceRepeatedChars(cleaned);
    if (this.dictionary.has(afterReduction)) {
      return { original: raw, cleaned: afterReduction, normalized: this.dictionary.get(afterReduction)!, confidence: 0.95, type: 'reduced' };
    }

    // 3. Ensemble Fuzzy Match
    const fuseMatches = this.fuse.search(afterReduction);
    if (fuseMatches.length > 0) {
      const candidates = fuseMatches.slice(0, 3).map(match => {
        const key = match.item;
        const jw = StringMetrics.jaroWinkler(afterReduction, key);
        const lev = StringMetrics.levenshtein(afterReduction, key);
        const dice = StringMetrics.dice(afterReduction, key);
        // Weighted Ensemble: favor JaroWinkler for short abbreviations
        const score = (jw * 0.5) + (lev * 0.3) + (dice * 0.2);
        return { key, score };
      });

      candidates.sort((a, b) => b.score - a.score);
      const bestCandidate = candidates[0];

      // Competition-grade thresholding
      const dynamicThreshold = afterReduction.length <= 3 ? 0.88 : 0.75;

      if (bestCandidate.score > dynamicThreshold) {
        return {
          original: raw,
          cleaned: afterReduction,
          normalized: this.dictionary.get(bestCandidate.key)!,
          confidence: bestCandidate.score,
          type: 'fuzzy'
        };
      }
    }

    return { original: raw, cleaned: afterReduction, normalized: afterReduction, confidence: 1.0, type: afterReduction !== cleaned ? 'reduced' : 'none' };
  }

  public processText(text: string): ProcessedWord[] {
    const words = text.split(/\s+/);
    return words.map(w => this.processWord(w)).filter(pw => pw.original !== '');
  }

  public getDictionary(): Record<string, string> {
    const dict: Record<string, string> = {};
    this.dictionary.forEach((v, k) => dict[k] = v);
    return dict;
  }
}
