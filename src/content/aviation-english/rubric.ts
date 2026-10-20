import type { Criterion } from "./types";

/** The six ICAO language proficiency criteria, with Level 3/4/5 descriptors (summarised). */
export const RUBRIC: Criterion[] = [
  {
    id: "comprehension",
    name: "Comprehension",
    summary: "Understanding speech, accents and unexpected messages.",
    descriptors: {
      3: "Understands common, concrete topics when speech is clear; often needs repetition on unusual or complex messages.",
      4: "Understands common, concrete and work-related topics accurately; usually copes with a complication or unexpected turn of events.",
      5: "Understands accurately on a wide range of topics, including nuances, accents and dialects; rarely needs repetition.",
    },
  },
  {
    id: "fluency",
    name: "Fluency",
    summary: "Speaking at an appropriate tempo without distracting hesitation.",
    descriptors: {
      3: "Produces stretches of language, but hesitation or searching for words can disrupt the message.",
      4: "Produces stretches of language at an appropriate tempo; occasional loss of fluency does not prevent effective communication.",
      5: "Speaks at length with a natural, effortless flow; uses discourse markers and connectors appropriately.",
    },
  },
  {
    id: "interactions",
    name: "Interactions",
    summary: "Responding, checking, confirming and clarifying in real time.",
    descriptors: {
      3: "Responses are sometimes immediate and appropriate; checking and clarifying is attempted but not always successful.",
      4: "Responses are usually immediate, appropriate and informative; manages the speaker/listener relationship effectively.",
      5: "Responses are immediate, appropriate and informative; handles misunderstandings by checking, confirming or clarifying.",
    },
  },
  {
    id: "vocabulary",
    name: "Vocabulary",
    summary: "Range and accuracy of words for work-related and unexpected topics.",
    descriptors: {
      3: "Range and accuracy are often sufficient for common topics, but limited when facing unusual situations.",
      4: "Range and accuracy are usually sufficient for common and work-related topics; can often paraphrase when vocabulary is lacking.",
      5: "Range and accuracy are sufficient for common, concrete and work-related topics; paraphrases consistently and successfully.",
    },
  },
  {
    id: "pronunciation",
    name: "Pronunciation",
    summary: "Stress, rhythm and intonation that do not impede understanding.",
    descriptors: {
      3: "Influenced by first language or regional variation and frequently interferes with ease of understanding.",
      4: "Influenced by first language or regional variation but only sometimes interferes with ease of understanding.",
      5: "Influenced by first language or regional variation but rarely interferes with ease of understanding.",
    },
  },
  {
    id: "structure",
    name: "Structure",
    summary: "Grammar and sentence patterns, both basic and complex.",
    descriptors: {
      3: "Basic grammatical structures are not always well controlled; errors frequently interfere with meaning.",
      4: "Basic structures are used creatively and usually well controlled; errors may occur but rarely interfere with meaning.",
      5: "Basic structures are consistently well controlled; complex structures are attempted with some errors that sometimes interfere with meaning.",
    },
  },
];

export const OPERATIONAL_LEVEL = 4;
