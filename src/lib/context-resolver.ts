export interface CandidateExpansion {
  expansion: string;
  description: string;
  keywords: string[];
  baseScore: number;
}

export interface AmbiguityDefinition {
  abbreviation: string;
  defaultExpansion: string;
  candidates: CandidateExpansion[];
}

export interface ContextMatchDetail {
  candidate: string;
  score: number;
  confidence: number;
  matchedKeywords: string[];
  isWinner: boolean;
}

export interface DisambiguationResult {
  abbreviation: string;
  originalWord: string;
  wordIndex: number;
  candidates: ContextMatchDetail[];
  selectedExpansion: string;
  explanation: string;
  contextWordsUsed: string[];
}

export const AMBIGUITY_RECOGNITION: Record<string, AmbiguityDefinition> = {
  pm: {
    abbreviation: "PM",
    defaultExpansion: "Private Message",
    candidates: [
      {
        expansion: "Private Message",
        description: "Direct communication on a messaging platform",
        keywords: ["me", "text", "send", "chat", "msg", "dm", "write", "talk", "reply", "social", "inbox", "sent", "ping", "message", "contact"],
        baseScore: 0.5,
      },
      {
        expansion: "Project Manager",
        description: "An organizational leader in charge of a project",
        keywords: ["approved", "budget", "meeting", "boss", "deadline", "hired", "project", "report", "scrum", "agile", "office", "work", "client", "job", "status", "tasks", "assigned", "hiring", "lead"],
        baseScore: 0.5,
      },
    ],
  },
  hr: {
    abbreviation: "HR",
    defaultExpansion: "Human Resources",
    candidates: [
      {
        expansion: "Human Resources",
        description: "The department managing employee relations and staffing",
        keywords: ["employee", "hired", "department", "salary", "complaint", "benefits", "interview", "recruiting", "workplace", "payroll", "fired", "contract", "staff", "onboarding", "policy"],
        baseScore: 0.5,
      },
      {
        expansion: "Hour",
        description: "A unit of time equal to 60 minutes",
        keywords: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "half", "late", "duration", "wait", "mins", "hours", "hrs", "time", "clock", "minutes", "day", "long", "every", "per"],
        baseScore: 0.5,
      },
    ],
  },
  ml: {
    abbreviation: "ML",
    defaultExpansion: "Machine Learning",
    candidates: [
      {
        expansion: "Machine Learning",
        description: "A branch of artificial intelligence focused on training algorithms",
        keywords: ["ai", "model", "python", "data", "training", "neural", "network", "deep", "supervised", "predict", "dataset", "algorithm", "code", "computer", "llm", "weights", "inference"],
        baseScore: 0.5,
      },
      {
        expansion: "Milliliter",
        description: "A metric unit of volume equal to one-thousandth of a liter",
        keywords: ["water", "drink", "flask", "bottle", "dose", "volume", "add", "liquid", "pour", "milk", "solution", "beaker", "cup", "recipe", "oil", "glass", "beverage", "quantity", "mix"],
        baseScore: 0.5,
      },
    ],
  },
  md: {
    abbreviation: "MD",
    defaultExpansion: "Medical Doctor",
    candidates: [
      {
        expansion: "Medical Doctor",
        description: "A qualified healthcare professional licensed to practice medicine",
        keywords: ["hospital", "sick", "clinic", "patient", "medicine", "nurse", "health", "physician", "prescription", "doctor", "treatment", "pain", "illness", "surgeon", "checkup", "flu"],
        baseScore: 0.5,
      },
      {
        expansion: "Managing Director",
        description: "A senior executive responsible for managing a company's operations",
        keywords: ["board", "company", "executive", "corporate", "shareholder", "meeting", "report", "business", "annual", "firm", "president", "management", "corporate", "revenue", "strategy"],
        baseScore: 0.5,
      },
    ],
  },
  atm: {
    abbreviation: "ATM",
    defaultExpansion: "At the moment",
    candidates: [
      {
        expansion: "At the moment",
        description: "A temporal phrase meaning right now or currently",
        keywords: ["rn", "right", "now", "busy", "cannot", "later", "working", "sleeping", "doing", "currently", "today", "unavailable", "talking", "eating", "watching"],
        baseScore: 0.5,
      },
      {
        expansion: "Automated Teller Machine",
        description: "An electronic banking outlet for cash withdrawals",
        keywords: ["money", "cash", "bank", "withdraw", "card", "debit", "credit", "teller", "pin", "dollar", "rupees", "finance", "fee", "machine", "location", "find", "fees"],
        baseScore: 0.5,
      },
    ],
  },
  yolo: {
    abbreviation: "YOLO",
    defaultExpansion: "You only live once",
    candidates: [
      {
        expansion: "You only live once",
        description: "An acronym expressing that one should make the most of the present moment and take risks",
        keywords: ["live", "once", "life", "risk", "try", "dare", "moment", "chance", "die", "living", "fear", "regret", "yolo"],
        baseScore: 0.8,
      },
      {
        expansion: "You",
        description: "Slang variation or mistype of you",
        keywords: ["are", "hru", "doing", "cool", "there", "awesome", "good", "fine", "ok", "hey", "bro", "sis"],
        baseScore: 0.2,
      },
    ],
  },
  yoo: {
    abbreviation: "YOO",
    defaultExpansion: "You",
    candidates: [
      {
        expansion: "You",
        description: "An informal pronoun referring to the person addressed",
        keywords: ["are", "hru", "doing", "cool", "there", "awesome", "good", "fine", "ok", "hey", "bro", "sis", "u", "r"],
        baseScore: 0.9,
      },
      {
        expansion: "You only live once",
        description: "The acronym YOLO (highly unlikely for 'yoo' unless explicitly contextual)",
        keywords: ["live", "once", "life", "risk", "try", "dare", "moment", "chance", "die", "living", "fear", "regret", "yolo"],
        baseScore: 0.1,
      },
    ],
  },
  yo: {
    abbreviation: "YO",
    defaultExpansion: "Hey",
    candidates: [
      {
        expansion: "Hey",
        description: "An informal greeting to get someone's attention",
        keywords: ["whats", "up", "bro", "sis", "hey", "hru", "there", "friend", "guy", "dude", "greeting", "yo"],
        baseScore: 0.9,
      },
      {
        expansion: "You only live once",
        description: "The acronym YOLO (highly unlikely for 'yo' unless explicitly contextual)",
        keywords: ["live", "once", "life", "risk", "try", "dare", "moment", "chance", "die", "living", "fear", "regret", "yolo"],
        baseScore: 0.1,
      },
    ],
  },
};

/**
 * Clean a word for context comparison (lowercase, alphanumeric only)
 */
function cleanWord(word: string): string {
  return word.toLowerCase().replace(/[^\w]/g, "");
}

/**
 * Checks if a context word matches a keyword using stem-based logic and variations.
 */
function isKeywordMatch(contextWord: string, keyword: string): boolean {
  if (contextWord === keyword) return true;

  // Plurals, gerunds, past tense stem approximations
  if (contextWord.length > 3 && keyword.length > 3) {
    if (contextWord.startsWith(keyword) && (contextWord.length - keyword.length <= 4)) return true;
    if (keyword.startsWith(contextWord) && (keyword.length - contextWord.length <= 2)) return true;
  }

  // Handlers for specific common variations
  const stems: Record<string, string[]> = {
    work: ["working", "worked", "works", "worker", "workers"],
    project: ["projects", "projecting", "projected", "manager"],
    manage: ["manager", "managing", "management", "managers"],
    meet: ["meeting", "meetings", "meets", "met"],
    approve: ["approved", "approves", "approving", "approval"],
    hire: ["hired", "hiring", "hires"],
    fire: ["fired", "firing", "fires"],
    report: ["reports", "reporting", "reported"],
    message: ["messages", "messaging", "messaged", "msg", "ping", "pings"],
    text: ["texts", "texting", "texted"],
    send: ["sending", "sender", "sends", "sent"],
    chat: ["chats", "chatting"],
    employee: ["employees"],
    benefit: ["benefits"],
    complain: ["complaint", "complaints", "complaining"],
    interview: ["interviews", "interviewing"],
    recruit: ["recruiting", "recruited", "recruitment", "recruits"],
    hour: ["hours", "hrs", "hr"],
    minute: ["minutes", "mins", "min"],
    second: ["seconds", "secs"],
    train: ["training", "trained", "trains"],
    predict: ["predicting", "predicted", "prediction", "predictions", "predicts"],
    model: ["models", "modelling"],
    liquid: ["liquids"],
    bottle: ["bottles"],
    glass: ["glasses"],
    patient: ["patients"],
    sick: ["sickness", "sicker"],
    doctor: ["doctors"],
    prescribe: ["prescription", "prescriptions", "prescribed"],
    treat: ["treatment", "treatments", "treating"],
    withdraw: ["withdrawal", "withdrawals", "withdrawing", "withdrew"],
    bank: ["banking", "banks"],
    card: ["cards"],
    dollar: ["dollars"],
    rupee: ["rupees"],
    fee: ["fees"],
    machine: ["machines", "machinery"],
  };

  for (const [stem, variations] of Object.entries(stems)) {
    if (
      (contextWord === stem || variations.includes(contextWord)) &&
      (keyword === stem || variations.includes(keyword))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Resolves context for a given sentence and returns word-by-word info
 * with detailed disambiguation steps for ambiguous abbreviations.
 */
export function resolveSentenceContext(text: string): {
  tokens: string[];
  disambiguations: DisambiguationResult[];
  normalizations: string[];
} {
  if (!text) {
    return { tokens: [], disambiguations: [], normalizations: [] };
  }

  const tokens = text.split(/\s+/).filter(Boolean);
  const disambiguations: DisambiguationResult[] = [];
  const normalizations: string[] = [];

  // Analyze the entire context of cleaned words
  const cleanedContextWords = tokens.map(t => cleanWord(t));

  tokens.forEach((token, index) => {
    let rawCleaned = cleanWord(token);
    
    // Normalize plural/genitive forms of target abbreviations (e.g. "pms" -> "pm", "hrs" -> "hr")
    if (!AMBIGUITY_RECOGNITION[rawCleaned] && rawCleaned.endsWith("s") && rawCleaned.length > 2) {
      const singular = rawCleaned.slice(0, -1);
      if (AMBIGUITY_RECOGNITION[singular]) {
        rawCleaned = singular;
      }
    }

    const abbrevDef = AMBIGUITY_RECOGNITION[rawCleaned];

    if (abbrevDef) {
      // It's an ambiguous word! Let's scan surrounding context words
      // Excluding the abbreviation itself from context scanning
      const candidatesMatchDetail: ContextMatchDetail[] = [];
      const contextWordsUsed: string[] = [];

      abbrevDef.candidates.forEach(cand => {
        const matchedKeywords: string[] = [];

        cleanedContextWords.forEach((contextWord, cIdx) => {
          if (cIdx === index) return; // Skip the word itself
          
          // Check if the context word matches any candidate keywords using intelligent matching
          const hasMatch = cand.keywords.some(keyword => isKeywordMatch(contextWord, keyword));
          
          if (hasMatch) {
            matchedKeywords.push(tokens[cIdx]); // store original casing for UI
            if (!contextWordsUsed.includes(tokens[cIdx])) {
              contextWordsUsed.push(tokens[cIdx]);
            }
          }
        });

        // score calculation (each robust match yields +0.35 weight)
        const score = cand.baseScore + matchedKeywords.length * 0.35;
        candidatesMatchDetail.push({
          candidate: cand.expansion,
          score: score,
          confidence: 0, // calculated below
          matchedKeywords,
          isWinner: false,
        });
      });

      // Normalize scores into percentage confidences
      const sumScores = candidatesMatchDetail.reduce((sum, item) => sum + item.score, 0);
      candidatesMatchDetail.forEach(item => {
        item.confidence = sumScores > 0 ? item.score / sumScores : 0.5;
      });

      // Find winner
      candidatesMatchDetail.sort((a, b) => b.confidence - a.confidence);
      
      // Mark winner
      const winningExpansion = candidatesMatchDetail[0].candidate;
      candidatesMatchDetail.forEach(item => {
        if (item.candidate === winningExpansion) {
          item.isWinner = true;
        }
      });

      // Explanation generation
      const winnerDetail = candidatesMatchDetail.find(c => c.isWinner)!;
      
      let explanation = "";
      if (winnerDetail.matchedKeywords.length > 0) {
        const keywordsList = winnerDetail.matchedKeywords.map(k => `"${k}"`).join(", ");
        explanation = `Surrounding context words like ${keywordsList} strongly align with the theme of "${winnerDetail.candidate}" (${winnerDetail.candidate === "Private Message" ? "Communication" : winnerDetail.candidate === "Project Manager" ? "Business/Project Management" : winnerDetail.candidate === "Human Resources" ? "Corporate Relations" : winnerDetail.candidate === "Hour" ? "Time Measurement" : winnerDetail.candidate === "Machine Learning" ? "Artificial Intelligence" : winnerDetail.candidate === "Milliliter" ? "Volume Measurement" : winnerDetail.candidate === "Medical Doctor" ? "Healthcare" : winnerDetail.candidate === "Managing Director" ? "Company Executive" : winnerDetail.candidate === "At the moment" ? "Temporal expression" : "Banking/Finance"}).`;
      } else {
        explanation = `No specific trigger keywords were found in the surrounding text. The system fell back to the default baseline expansion of "${winnerDetail.candidate}" with equal confidence split.`;
      }

      disambiguations.push({
        abbreviation: abbrevDef.abbreviation,
        originalWord: token,
        wordIndex: index,
        candidates: candidatesMatchDetail,
        selectedExpansion: winningExpansion,
        explanation,
        contextWordsUsed,
      });

      normalizations.push(winningExpansion);
    } else {
      // Normal non-ambiguous word
      normalizations.push(token);
    }
  });

  return { tokens, disambiguations, normalizations };
}
