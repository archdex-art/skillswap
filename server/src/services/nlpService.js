const nlp = require('compromise');
const natural = require('natural');
const { skillsDictionary, skillGraph } = require('../data/skillsDictionary');

// Levenshtein distance based similarity (returns 0 to 1)
function getLevenshteinSimilarity(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    const distance = natural.LevenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 1.0;
    return (maxLength - distance) / maxLength;
}

// 1. Extract skills from free text
const extractSkills = (text) => {
    if (!text) return [];

    const normalizedText = text.toLowerCase();
    let extracted = [];

    // ── Filler phrases (longest-first after sort) ─────────────────────────────
    const FILLER_PHRASES = [
        // proficiency / also phrases
        'i am also proficient in', 'i am proficient in',
        'i am also good at', 'i am good at',
        'i am experienced in', 'i am experienced with',
        'i have experience in', 'i have experience with',
        'i have knowledge of', 'i have knowledge in',
        // "i would like" variants
        'i would like to learn about', 'i would like to learn',
        'i would like to know', 'i would like to', 'i would like',
        // "i want" variants
        'i want to learn about', 'i want to learn', 'i want to know', 'i want',
        // "i can / teach" variants
        'i can also teach', 'i can teach', 'i can help with', 'i can',
        'i also teach', 'i teach',
        // "i know / do / use"
        'i am also learning', 'i am learning', 'i am studying',
        'i also know', 'i know', 'i do', 'i use',
        // need / help
        'i urgently need help with', 'i urgently need',
        'i need help with', 'i need help in', 'i need help on', 'i need help',
        'urgently need', 'need help with', 'need help in', 'need to learn',
        'help with', 'help in',
        // want / look (no subject)
        'want to learn about', 'want to learn',
        'looking to learn about', 'looking to learn', 'looking for',
        // gerund prefixes: "playing guitar" → "guitar"
        'playing', 'learning', 'teaching', 'studying', 'practicing',
        // standalone "also"
        'also',
        // proficiency nouns
        'proficient in', 'expertise in', 'expert in',
        'experience in', 'experience with',
        'working with', 'skilled in', 'skilled at',
        'good at', 'familiar with',
        // level descriptors
        'basic', 'advanced', 'intermediate', 'beginner',
        'some', 'a bit of', 'little bit of',
    ];

    // Whole-word prepositions / articles stripped AFTER phrase pass
    const FILLER_WORDS = ['in', 'on', 'of', 'a', 'an', 'the', 'with', 'about', 'for'];

    // Sort longest-first to prevent partial clobbers (e.g. strip "i want to learn" before "i want")
    const sortedPhrases = [...FILLER_PHRASES].sort((a, b) => b.length - a.length);

    // Split on commas, semicolons, "and", "or", "&", slash, newline
    const parts = normalizedText.split(/[,;]|\band\b|\bor\b|&|\/|\n/);

    // Build a set of all known multi-word skills/synonyms (protected from filler stripping)
    const PROTECTED = [
        ...Object.keys(skillsDictionary),
        ...Object.values(skillsDictionary).flat(),
    ].filter(s => s.includes(' ')).map(s => s.toLowerCase());

    parts.forEach(part => {
        let clean = part.trim();

        // 0. Temporarily protect known multi-word skills with placeholders
        //    e.g. "machine learning" → "__ML_PLACEHOLDER_0__"
        const placeholders = [];
        PROTECTED.forEach((phrase, idx) => {
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(`\\b${escaped}\\b`, 'gi');
            if (re.test(clean)) {
                const token = `__SKILL_${idx}__`;
                placeholders.push({ token, phrase });
                clean = clean.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), ` ${token} `);
            }
        });

        // 1. Strip filler phrases
        for (const phrase of sortedPhrases) {
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(`\\b${escaped}\\b`, 'gi');
            clean = clean.replace(re, ' ');
        }

        // 2. Strip standalone filler articles/prepositions (word-boundary safe)
        for (const word of FILLER_WORDS) {
            const re = new RegExp(`(?:^|\\s)${word}(?:\\s|$)`, 'gi');
            clean = clean.replace(re, ' ');
        }

        // 3. Restore protected multi-word skills from placeholders
        placeholders.forEach(({ token, phrase }) => {
            clean = clean.replace(new RegExp(token, 'g'), phrase);
        });

        // 4. Clean up punctuation and collapse whitespace
        clean = clean.replace(/[^\w\s\.+#-]/g, ' ').replace(/\s+/g, ' ').trim();

        if (clean.length > 1) extracted.push(clean);
    });

    // Secondary: compromise.js noun extraction (dictionary-known skills only)
    const doc = nlp(normalizedText);
    const nouns = doc.nouns().out('array');
    nouns.forEach(noun => {
        const clean = noun.trim().toLowerCase();
        if (clean.length > 2 && !extracted.includes(clean)) {
            for (const [canonical, synonyms] of Object.entries(skillsDictionary)) {
                if (canonical.toLowerCase() === clean || synonyms.includes(clean)) {
                    extracted.push(clean);
                    break;
                }
            }
        }
    });

    return [...new Set(extracted.map(s => s.trim()).filter(s => s.length > 1))];
};


// 2. Normalize an array of skills to standard dictionary terms.
// Handles both clean tokens ("js") and dirty sentence-like chips ("i can teach js")
const normalizeSkills = (skills) => {
    if (!Array.isArray(skills)) return [];

    // If a chip contains spaces and looks like a phrase (not a known multi-word skill),
    // run it through extractSkills first to pull out the actual keywords.
    const KNOWN_MULTIWORD = new Set(
        Object.keys(skillsDictionary)
            .concat(Object.values(skillsDictionary).flat())
            .filter(k => k.includes(' '))
            .map(k => k.toLowerCase())
    );

    const flattened = skills.flatMap(skill => {
        if (!skill) return [];
        const lower = skill.toLowerCase().trim();
        // If it's a known multi-word skill/synonym, keep it as-is
        if (KNOWN_MULTIWORD.has(lower)) return [skill];
        // If it looks like a sentence (has spaces), extract tokens from it
        if (skill.includes(' ')) return extractSkills(skill);
        return [skill];
    });

    return flattened.map(skill => {
        const lower = skill.toLowerCase().trim();

        // Search in dictionary
        for (const [canonical, synonyms] of Object.entries(skillsDictionary)) {
            if (canonical.toLowerCase() === lower || synonyms.includes(lower)) {
                return canonical; // matched synonym mapping
            }
        }

        // Fallback: capitalize first letter of each word
        return skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }).filter(Boolean);
};

// 3. Smart match skills using fuzzy matching (Levenshtein distance)
const matchSkills = (wantedSkills, offeredSkills) => {
    let totalScore = 0;
    let matchedPairs = [];
    
    if (!wantedSkills || !offeredSkills || wantedSkills.length === 0 || offeredSkills.length === 0) {
        return { score: 0, matched: [] };
    }
    
    wantedSkills.forEach(wanted => {
        let bestScore = 0;
        let bestMatch = null;
        
        offeredSkills.forEach(offered => {
            // Apply Levenshtein fuzzy matching
            const score = getLevenshteinSimilarity(wanted, offered);
            
            // Or apply synonym graph based matching (if they strictly match known pairs)
            const isRelated = skillGraph[wanted] && skillGraph[wanted].includes(offered);
            const finalScore = isRelated ? Math.max(score, 0.85) : score; // Boost if they are related
            
            if (finalScore > bestScore) {
                bestScore = finalScore;
                bestMatch = offered;
            }
        });
        
        // Similarity threshold
        if (bestScore >= 0.75) {
            totalScore += bestScore;
            matchedPairs.push(bestMatch);
        }
    });

    return { 
        score: matchedPairs.length / wantedSkills.length, // percentage of wanted skills satisfied
        matched: [...new Set(matchedPairs)] 
    };
};

// 4. Analyze message intent (negation-aware)
const analyzeIntent = (message) => {
    if (!message) return { urgency: 'low', intentType: 'general' };

    const lower = message.toLowerCase();

    // ── Helpers ─────────────────────────────────────────────────────────────
    // Returns true only if the word is present AND NOT preceded by a negation
    const NEGATIONS = ['not', 'no', "don't", 'dont', 'nothing', 'never', "isn't", 'isnt', 'non'];

    function matchesWithoutNegation(text, keyword) {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`\\b${escaped}\\b`, 'gi');
        let m;
        while ((m = re.exec(text)) !== null) {
            // Check the 1-3 words immediately before this match for a negation word
            const before = text.slice(Math.max(0, m.index - 20), m.index).trim().split(/\s+/);
            const lastFew = before.slice(-3).join(' ');
            const negated = NEGATIONS.some(neg => new RegExp(`\\b${neg}\\b`).test(lastFew));
            if (!negated) return true; // found a non-negated occurrence
        }
        return false;
    }

    // ── Urgency ──────────────────────────────────────────────────────────────
    let urgency = 'low';
    const highUrgencyWords   = ['urgent', 'urgently', 'asap', 'emergency', 'immediately', 'help!'];
    const mediumUrgencyWords = ['soon', 'this week', 'next few days', 'quickly', 'fast', 'tomorrow'];

    if (highUrgencyWords.some(w => matchesWithoutNegation(lower, w)))        urgency = 'high';
    else if (mediumUrgencyWords.some(w => matchesWithoutNegation(lower, w))) urgency = 'medium';

    // ── Intent ───────────────────────────────────────────────────────────────
    let intentType = 'general';
    const learningWords = ['need help', 'stuck', 'struggling', 'learn from', 'teach me', 'guide me', 'explain', 'student'];
    const teachingWords = ['want to learn', 'looking to learn', 'help with', 'teach you'];
    const collabWords   = ['collaborate', 'project', 'work together', 'team', 'startup', 'build together'];

    if (learningWords.some(w => matchesWithoutNegation(lower, w)))      intentType = 'learning';
    else if (teachingWords.some(w => matchesWithoutNegation(lower, w))) intentType = 'teaching';
    else if (collabWords.some(w => matchesWithoutNegation(lower, w)))   intentType = 'collaboration';

    return { urgency, intentType };
};

// 5. Suggest skills based on input
const suggestSkills = (inputText) => {
    if (!inputText) return [];
    
    const text = inputText.toLowerCase();
    let suggestions = new Set();
    
    // Try to normalize the input
    let normalized = text;
    for (const [canonical, synonyms] of Object.entries(skillsDictionary)) {
        if (canonical.toLowerCase().includes(text) || synonyms.some(s => s.includes(text))) {
            suggestions.add(canonical);
            normalized = canonical;
        }
    }
    
    // If we mapped to a known canonical term, suggest its graph neighbors
    if (skillGraph[normalized]) {
        skillGraph[normalized].forEach(s => suggestions.add(s));
    }
    
    // Remove exact match from suggestions to avoid suggesting what they just typed
    suggestions.delete(normalized);
    suggestions.delete(inputText);
    
    return [...suggestions].slice(0, 5);
};

module.exports = {
    extractSkills,
    normalizeSkills,
    matchSkills,
    analyzeIntent,
    suggestSkills
};
