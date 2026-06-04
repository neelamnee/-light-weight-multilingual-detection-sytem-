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
  // Gen-Z & Slang definitions
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

  private isAbbreviationHeuristic(word: string): boolean {
    const clean = word.toLowerCase().trim();
    if (clean.length < 2 || clean.length > 8) return false;
    if (!isNaN(Number(clean))) return false;

    // Common standard words set to exclude typical language grammar
    const standardWords = new Set([
      // English
      'the', 'and', 'for', 'you', 'are', 'was', 'with', 'they', 'this', 'have', 'from', 'one', 'had', 'word', 'but', 'not', 'what', 'all', 'were', 'when', 'your', 'can', 'said', 'there', 'use', 'an', 'each', 'which', 'she', 'how', 'their', 'will', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'some', 'her', 'would', 'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more', 'write', 'go', 'see', 'no', 'way', 'could', 'people', 'my', 'than', 'first', 'water', 'been', 'call', 'who', 'oil', 'its', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part', 'new', 'take', 'only', 'me', 'our', 'under', 'very', 'after', 'back', 'good', 'well', 'your', 'with', 'made', 'said', 'here',
      // Hinglish
      'hai', 'haan', 'kya', 'bhi', 'se', 'ko', 'mein', 'par', 'aur', 'toh', 'bhai', 'yaar', 'meri', 'mera', 'apna', 'apni', 'raha', 'rahe', 'rahi', 'kar', 'karo', 'gaya', 'gayi', 'gaye', 'bina', 'kuch', 'sab', 'koi', 'ek', 'hi', 'billi', 'kutta', 'gadi', 'ghar', 'pani', 'khana'
    ]);

    if (standardWords.has(clean)) return false;

    // If its length is 2-4 and not a common word, it is highly likely to be an abbreviation or slang
    if (clean.length <= 4) return true;

    // For slightly longer words (5-8), check if it has a high consonant ratio (>= 0.6)
    const vowels = (clean.match(/[aeiouy]/g) || []).length;
    const consonantRatio = (clean.length - vowels) / clean.length;
    if (vowels === 0 || consonantRatio >= 0.6) return true;

    return false;
  }

  /**
   * Sequence-based acronym / subsequence alignment predictor (Browser ML approximation)
   */
  public sequencePredictor(word: string): { phrase: string; key: string; score: number } | null {
    const target = word.toLowerCase().trim();
    if (target.length < 2) return null;

    let bestMatch: { phrase: string; key: string; score: number } | null = null;

    this.dictionary.forEach((phrase, key) => {
      const lowerPhrase = phrase.toLowerCase().trim();
      const phraseWords = lowerPhrase.split(/\s+/).filter(Boolean);

      // Rule 1: Guard check: First character of target MUST match first character of phrase / key
      if (target[0] !== lowerPhrase[0]) {
        return;
      }

      // 1. Multi-word acronym matching / first-letter subsequence matching
      if (phraseWords.length > 1) {
        const initials = phraseWords.map(w => w[0]).join('');
        
        // Exact initials match (e.g. "nlp" vs "natural language processing")
        if (initials === target) {
          if (!bestMatch || bestMatch.score < 0.99) {
            bestMatch = { phrase, key, score: 0.99 };
          }
          return;
        }

        // Subsequence of initials (allowing dropping characters in initials)
        let initIdx = 0;
        let matchedInitials = 0;
        for (let i = 0; i < target.length; i++) {
          const ch = target[i];
          const foundIdx = initials.indexOf(ch, initIdx);
          if (foundIdx !== -1) {
            matchedInitials++;
            initIdx = foundIdx + 1;
          } else {
            break;
          }
        }

        if (matchedInitials === target.length) {
          const ratio = target.length / initials.length;
          const score = 0.82 + (ratio * 0.15); // max 0.97
          if (!bestMatch || bestMatch.score < score) {
            bestMatch = { phrase, key, score };
          }
          return;
        }

        // Subsequence matching of first-letters of words (allowing some skipped minor words)
        let wordIdx = 0;
        let matchedFirstLetters = 0;
        for (let i = 0; i < target.length; i++) {
          const ch = target[i];
          let found = false;
          for (let w = wordIdx; w < phraseWords.length; w++) {
            if (phraseWords[w][0] === ch) {
              found = true;
              wordIdx = w + 1;
              matchedFirstLetters++;
              break;
            }
          }
          if (!found) break;
        }

        if (matchedFirstLetters === target.length) {
          const ratio = target.length / phraseWords.length;
          const score = 0.80 + (ratio * 0.15); // max 0.95
          if (!bestMatch || bestMatch.score < score) {
            bestMatch = { phrase, key, score };
          }
          return;
        }
      }

      // 2. Single-word matching (contraction / prefixes)
      if (phraseWords.length === 1) {
        const singleWord = phraseWords[0];

        // 2a. Prefix match (e.g. "vid" -> "video", "pic" -> "picture")
        if (singleWord.startsWith(target)) {
          const ratio = target.length / singleWord.length;
          const score = 0.85 + (ratio * 0.13); // max 0.98
          if (!bestMatch || bestMatch.score < score) {
            bestMatch = { phrase, key, score };
          }
          return;
        }

        // 2b. Consonant contraction (e.g. "mrng" -> "morning", "pls" -> "please")
        // Get consonants of singleWord (keeping first letter intact)
        const vowels = new Set(['a', 'e', 'i', 'o', 'u', 'y']);
        let consonants = singleWord[0];
        for (let i = 1; i < singleWord.length; i++) {
          if (!vowels.has(singleWord[i])) {
            consonants += singleWord[i];
          }
        }

        // Target must consist of characters present in order within consonants of singleWord (first letter must match)
        let consIdx = 0;
        let matchedCons = 0;
        for (let i = 0; i < target.length; i++) {
          const ch = target[i];
          const foundIdx = consonants.indexOf(ch, consIdx);
          if (foundIdx !== -1) {
            matchedCons++;
            consIdx = foundIdx + 1;
          } else {
            break;
          }
        }

        if (matchedCons === target.length) {
          const ratio = target.length / singleWord.length;
          const score = 0.78 + (ratio * 0.20); // max 0.98
          if (!bestMatch || bestMatch.score < score) {
            bestMatch = { phrase, key, score };
          }
        }
      }
    });

    if (bestMatch && bestMatch.score > 0.60) {
      return bestMatch;
    }

    return null;
  }

  public processWord(word: string): ProcessedWord {
    const raw = word.trim();
    if (!raw) return { original: '', cleaned: '', normalized: '', confidence: 0, type: 'none', isAbbreviation: false, isNoisyCleaned: false };

    let cleaned = raw.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '');
    
    // Check if word has noise like trailing punctuation or repetitive character patterns
    const hasPunctuationOrCaseNoise = (raw !== cleaned && raw.toLowerCase() !== cleaned);
    const afterReduction = this.reduceRepeatedChars(cleaned);
    const hasRepeatedLetters = (cleaned !== afterReduction);
    const isNoisyCleaned = hasPunctuationOrCaseNoise || hasRepeatedLetters;

    let result: ProcessedWord;

    // 1. Exact direct match
    if (this.dictionary.has(cleaned)) {
      result = { 
        original: raw, 
        cleaned: cleaned, 
        normalized: this.dictionary.get(cleaned)!, 
        confidence: 1.0, 
        type: 'exact',
        isAbbreviation: true,
        isNoisyCleaned: isNoisyCleaned
      };
    }
    // 2. Reduction match
    else if (this.dictionary.has(afterReduction)) {
      result = { 
        original: raw, 
        cleaned: afterReduction, 
        normalized: this.dictionary.get(afterReduction)!, 
        confidence: 0.95, 
        type: 'reduced',
        isAbbreviation: true,
        isNoisyCleaned: true
      };
    }
    // 3. High-confidence Character sequence algorithm match (ML Predictor)
    else {
      const prediction = this.sequencePredictor(afterReduction);
      if (prediction && prediction.score > 0.85) {
        result = {
          original: raw,
          cleaned: afterReduction,
          normalized: prediction.phrase,
          confidence: prediction.score,
          type: 'fuzzy',
          isAbbreviation: true,
          isNoisyCleaned: isNoisyCleaned
        };
      } else {
        // 4. Ensemble Fuzzy Match (Fuse.js + String metrics distance)
        const fuseMatches = this.fuse.search(afterReduction);
        if (fuseMatches.length > 0) {
          const candidates = fuseMatches.slice(0, 3).map(match => {
            const key = match.item;
            const jw = StringMetrics.jaroWinkler(afterReduction, key);
            const lev = StringMetrics.levenshtein(afterReduction, key);
            const dice = StringMetrics.dice(afterReduction, key);
            const score = (jw * 0.5) + (lev * 0.3) + (dice * 0.2);
            return { key, score };
          });

          candidates.sort((a, b) => b.score - a.score);
          const bestCandidate = candidates[0];

          // Competition-grade thresholding
          const dynamicThreshold = afterReduction.length <= 3 ? 0.88 : 0.75;

          if (bestCandidate.score > dynamicThreshold) {
            result = {
              original: raw,
              cleaned: afterReduction,
              normalized: this.dictionary.get(bestCandidate.key)!,
              confidence: bestCandidate.score,
              type: 'fuzzy',
              isAbbreviation: true,
              isNoisyCleaned: isNoisyCleaned
            };
          } else {
            // Fallback candidate available but score below threshold (unseen abbreviation)
            const looksLikeAbbrev = this.isAbbreviationHeuristic(afterReduction);
            if (looksLikeAbbrev) {
              if (prediction) {
                result = {
                  original: raw,
                  cleaned: afterReduction,
                  normalized: raw,
                  confidence: prediction.score,
                  type: 'unseen',
                  isAbbreviation: true,
                  isNoisyCleaned: isNoisyCleaned,
                  fallbackCandidate: `${prediction.key} ("${prediction.phrase}")`
                };
              } else {
                const fallbackVal = this.dictionary.get(bestCandidate.key)!;
                result = {
                  original: raw,
                  cleaned: afterReduction,
                  normalized: raw, // keep original raw word for safety in unseen normalizations
                  confidence: bestCandidate.score, // show fallback prediction confidence
                  type: 'unseen',
                  isAbbreviation: true,
                  isNoisyCleaned: isNoisyCleaned,
                  fallbackCandidate: `${bestCandidate.key} ("${fallbackVal}")`
                };
              }
            } else {
              result = { 
                original: raw, 
                cleaned: afterReduction, 
                normalized: raw, 
                confidence: 1.0, 
                type: afterReduction !== cleaned ? 'reduced' : 'none',
                isAbbreviation: false,
                isNoisyCleaned: isNoisyCleaned
              };
            }
          }
        } else {
          // No fuzzy registry match found at all
          const looksLikeAbbrev = this.isAbbreviationHeuristic(afterReduction);
          if (looksLikeAbbrev) {
            if (prediction) {
              result = {
                original: raw,
                cleaned: afterReduction,
                normalized: raw,
                confidence: prediction.score,
                type: 'unseen',
                isAbbreviation: true,
                isNoisyCleaned: isNoisyCleaned,
                fallbackCandidate: `${prediction.key} ("${prediction.phrase}")`
              };
            } else {
              result = {
                original: raw,
                cleaned: afterReduction,
                normalized: raw,
                confidence: 0.5, // 50% baseline confidence score for completely unrecognized abbreviations
                type: 'unseen',
                isAbbreviation: true,
                isNoisyCleaned: isNoisyCleaned,
                fallbackCandidate: 'Unknown abbreviation'
              };
            }
          } else {
            result = { 
              original: raw, 
              cleaned: afterReduction, 
              normalized: raw, 
              confidence: 1.0, 
              type: afterReduction !== cleaned ? 'reduced' : 'none',
              isAbbreviation: false,
              isNoisyCleaned: isNoisyCleaned
            };
          }
        }
      }
    }

    // Attach definition if abbreviation or slang
    if (result.isAbbreviation) {
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
    const words = text.split(/\s+/);
    return words.map(w => this.processWord(w)).filter(pw => pw.original !== '');
  }

  public getDictionary(): Record<string, string> {
    const dict: Record<string, string> = {};
    this.dictionary.forEach((v, k) => dict[k] = v);
    return dict;
  }
}
