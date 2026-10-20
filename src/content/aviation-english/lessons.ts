import type { Lesson } from "./types";

export const LESSONS: Lesson[] = [
  {
    id: "u1-l1",
    unitId: "unit-1",
    title: "Phonetic Alphabet and Numbers",
    objective: "Spell call signs and say numbers the standard way so they cannot be misheard.",
    durationMinutes: 15,
    content: [
      "Radio is noisy and letters such as B, D and P sound alike. The phonetic alphabet gives every letter a distinct word: Alpha, Bravo, Charlie.",
      "Numbers are said digit by digit, with some exceptions: 3 is 'tree', 5 is 'fife', 9 is 'niner'. Thousands are said as 'thousand', and decimals as 'decimal'.",
    ],
    vocabulary: [
      { term: "Niner", definition: "The standard way to say the digit 9.", example: "Squawk one niner zero zero." },
      { term: "Decimal", definition: "The word used for a decimal point in frequencies.", example: "Contact tower one one eight decimal one." },
      { term: "Say again", definition: "Repeat your last transmission.", example: "Say again your clearance." },
    ],
    audioUrl: "/audio/lesson-u1-l1.mp3",
    audioTranscript: "Golf Alpha Bravo Charlie Delta, squawk tree fife one niner.",
    exercises: [
      { type: "mcq", id: "u1-l1-e1", prompt: "How is the frequency 118.1 spoken?", options: ["One one eight decimal one", "One eighteen point one", "Eleven eight decimal one"], correctIndex: 0, explanation: "Digits are said one at a time and the decimal point is 'decimal'." },
      { type: "readback", id: "u1-l1-e2", clearance: "Squawk 3519.", expected: "Squawk three five one niner", hint: "Say each digit. 3 is 'tree' and 5 is 'fife' on the radio." },
    ],
  },
  {
    id: "u1-l2",
    unitId: "unit-1",
    title: "Standard Phraseology",
    objective: "Use standard words such as 'affirm', 'negative', 'roger' and 'wilco' correctly.",
    durationMinutes: 20,
    content: [
      "Standard phraseology is brief and unambiguous. 'Affirm' means yes, 'negative' means no, 'roger' means received, and 'wilco' means will comply.",
      "'Roger' is never a yes and never a readback. When a clearance contains instructions, the pilot reads them back.",
    ],
    vocabulary: [
      { term: "Wilco", definition: "Message received, understood and will be complied with.", example: "Report passing ROSTA, wilco." },
      { term: "Stand by", definition: "Wait; the call will be made later.", example: "Stand by for the revised clearance." },
      { term: "Unable", definition: "Cannot comply with the instruction.", example: "Unable, we are low on fuel." },
    ],
    exercises: [
      { type: "mcq", id: "u1-l2-e1", prompt: "ATC asks 'Are you able to accept runway 27?' You can. What do you say?", options: ["Roger", "Affirm", "Wilco"], correctIndex: 1, explanation: "'Affirm' answers a yes/no question. 'Roger' only acknowledges." },
      { type: "readback", id: "u1-l2-e2", clearance: "Skyways 8, report passing waypoint ROSTA.", expected: "Wilco, will report passing ROSTA, Skyways 8", hint: "Say wilco, then add your call sign." },
    ],
  },
  {
    id: "u1-l3",
    unitId: "unit-1",
    title: "Clearances and Readbacks",
    objective: "Read back clearances completely and correctly, including levels, headings and runways.",
    durationMinutes: 20,
    content: [
      "A readback proves that the pilot understood and lets the controller catch errors. Always read back runway, level, heading, speed, altimeter setting and squawk.",
      "Say your call sign last, so the controller knows who is reading back. If you are unsure, ask for the clearance again rather than guessing.",
    ],
    vocabulary: [
      { term: "Readback", definition: "Repeating the safety-critical parts of a clearance.", example: "Descend flight level 90, Speedbird 214." },
      { term: "QNH", definition: "Altimeter setting that makes the altimeter show altitude above sea level.", example: "QNH 1012." },
      { term: "Vacate", definition: "Leave the runway.", example: "Vacate left at Bravo." },
    ],
    exercises: [
      { type: "mcq", id: "u1-l3-e1", prompt: "Which of these must always be read back?", options: ["Greetings", "Runway in use and altimeter setting", "The controller's name"], correctIndex: 1, explanation: "Safety-critical items are always read back." },
      { type: "readback", id: "u1-l3-e2", clearance: "Delta 55, descend flight level 90, QNH 1012.", expected: "Descend flight level 90, QNH 1012, Delta 55" },
    ],
  },
  {
    id: "u2-l1",
    unitId: "unit-2",
    title: "Describing a Problem in Plain English",
    objective: "Explain a technical problem clearly when no standard phrase exists.",
    durationMinutes: 20,
    content: [
      "When phraseology does not cover a situation, use plain English: short, concrete sentences. State the problem first, then your intention, then your request.",
      "Avoid idioms and slang. Say 'we have a hydraulic leak' rather than 'we have lost some fluid'. Give numbers where possible.",
    ],
    vocabulary: [
      { term: "Malfunction", definition: "A system not working correctly.", example: "We have a flap malfunction." },
      { term: "Intend", definition: "State what you plan to do.", example: "We intend to return to the airport." },
      { term: "Request", definition: "Ask for something.", example: "Request priority landing." },
    ],
    exercises: [
      { type: "mcq", id: "u2-l1-e1", prompt: "Which message is clearest?", options: ["We've got a bit of an issue up here.", "Engine two oil pressure low, we intend to return.", "Something is not right."], correctIndex: 1, explanation: "It names the system, the fault and the intention." },
      { type: "readback", id: "u2-l1-e2", clearance: "Say intentions.", expected: "We intend to return to the airport, request vectors", hint: "Intention first, then the request." },
    ],
  },
  {
    id: "u2-l2",
    unitId: "unit-2",
    title: "Emergency and Urgency Calls",
    objective: "Distinguish Mayday from Pan-pan and structure each message.",
    durationMinutes: 20,
    content: [
      "Mayday is used for distress: grave and imminent danger. Pan-pan is for urgency: serious trouble that is not yet an immediate danger. Both are said three times.",
      "A good emergency message gives call sign, nature of the problem, intentions, position, level and persons on board. Say the most important information first.",
    ],
    vocabulary: [
      { term: "Mayday", definition: "Distress signal for grave and imminent danger.", example: "Mayday, mayday, mayday, engine fire." },
      { term: "Pan-pan", definition: "Urgency signal.", example: "Pan-pan, pan-pan, pan-pan, passenger unwell." },
      { term: "Souls on board", definition: "Total number of people on the aircraft.", example: "Eighty-four souls on board." },
    ],
    audioUrl: "/audio/lesson-u2-l2.mp3",
    audioTranscript: "Mayday, mayday, mayday, Cargo 12, engine fire, descending to land immediately, two souls on board.",
    exercises: [
      { type: "mcq", id: "u2-l2-e1", prompt: "A passenger feels ill but is stable. Which call is appropriate?", options: ["Mayday", "Pan-pan", "No call is needed"], correctIndex: 1, explanation: "Urgent but not an immediate danger: Pan-pan." },
      { type: "readback", id: "u2-l2-e2", clearance: "Cargo 12, say nature of your emergency.", expected: "Cargo 12, engine fire, two souls on board" },
    ],
  },
  {
    id: "u2-l3",
    unitId: "unit-2",
    title: "Weather and Delays",
    objective: "Understand and report weather conditions and explain delays.",
    durationMinutes: 15,
    content: [
      "Weather reports give wind, visibility, cloud and pressure. Learn the words for gusts, crosswinds, fog and windshear.",
      "When something unexpected happens, such as a delay, listen for the reason and the expected duration, then acknowledge it.",
    ],
    vocabulary: [
      { term: "Gusting", definition: "Sudden short increases in wind speed.", example: "Wind 270 at 25 gusting 38." },
      { term: "Windshear", definition: "A sudden change in wind speed or direction.", example: "Windshear reported on final." },
      { term: "Expect delay", definition: "Warning of waiting time ahead.", example: "Expect delay of ten minutes." },
    ],
    exercises: [
      { type: "mcq", id: "u2-l3-e1", prompt: "'Wind 180, 20 knots gusting 35' means the strongest wind is:", options: ["20 knots", "35 knots", "55 knots"], correctIndex: 1, explanation: "The gust value is the peak speed." },
      { type: "readback", id: "u2-l3-e2", clearance: "Expect holding at ROSTA, delay fifteen minutes.", expected: "Expect holding at ROSTA, delay fifteen minutes", hint: "Read back the fix and the delay." },
    ],
  },
  {
    id: "u3-l1",
    unitId: "unit-3",
    title: "Checking and Confirming",
    objective: "Use checking and confirming language to avoid misunderstandings.",
    durationMinutes: 15,
    content: [
      "If you did not understand, say so immediately: 'Say again'. If you understood but want to be certain, confirm: 'Confirm descend flight level 90?'.",
      "Never guess. A short question costs seconds; a wrong assumption can cost safety.",
    ],
    vocabulary: [
      { term: "Confirm", definition: "Ask for verification or state that something is checked.", example: "Confirm runway 27?" },
      { term: "Say again", definition: "Repeat your last message.", example: "Say again the frequency." },
      { term: "Correction", definition: "An error was made; the corrected version follows.", example: "Correction, flight level 80." },
    ],
    exercises: [
      { type: "mcq", id: "u3-l1-e1", prompt: "You missed the frequency. What do you say?", options: ["Pardon me?", "Say again the frequency", "Roger"], correctIndex: 1, explanation: "'Say again' is the standard request." },
      { type: "readback", id: "u3-l1-e2", clearance: "Contact tower one one eight decimal one.", expected: "Contact tower one one eight decimal one" },
    ],
  },
  {
    id: "u3-l2",
    unitId: "unit-3",
    title: "Negotiating with ATC",
    objective: "Request changes politely and explain constraints such as fuel or weather.",
    durationMinutes: 20,
    content: [
      "If you cannot comply, say 'unable', then give the reason and a request. For example: 'Unable runway 09, tailwind exceeds limit, request runway 27.'",
      "Stay calm and polite. A clear reason helps the controller to find another solution.",
    ],
    vocabulary: [
      { term: "Unable", definition: "Cannot comply.", example: "Unable, request alternative." },
      { term: "Request", definition: "Ask for a different clearance.", example: "Request direct to NAVAR." },
      { term: "Alternate", definition: "Another airport to land at.", example: "Request diversion to our alternate." },
    ],
    exercises: [
      { type: "mcq", id: "u3-l2-e1", prompt: "Which reply is best if you cannot accept runway 09?", options: ["No.", "Unable runway 09, request runway 27.", "That is a bad runway."], correctIndex: 1, explanation: "It states inability and gives a request." },
      { type: "readback", id: "u3-l2-e2", clearance: "Can you accept a left turn direct to NAVAR?", expected: "Affirm, direct NAVAR", hint: "Answer the yes/no question first." },
    ],
  },
  {
    id: "u3-l3",
    unitId: "unit-3",
    title: "Role-play: Approach and Landing",
    objective: "Take part in a full approach exchange with a controller.",
    durationMinutes: 25,
    content: [
      "A typical approach exchange: radar vectors, descent, approach clearance, handoff to tower, landing clearance. Each step has its own readback.",
      "Keep each transmission short. Listen before you talk, and do not block a frequency while another aircraft is speaking.",
    ],
    vocabulary: [
      { term: "Established", definition: "On the approach path (for example, on the localiser).", example: "Established ILS runway 25." },
      { term: "Go around", definition: "Abandon the landing and climb away.", example: "Going around." },
      { term: "Cleared to land", definition: "Permission to land on a named runway.", example: "Runway 27 cleared to land." },
    ],
    exercises: [
      { type: "mcq", id: "u3-l3-e1", prompt: "What must you report after an ILS clearance?", options: ["Established", "Wilco", "Airborne"], correctIndex: 0, explanation: "Report when established on the ILS if asked." },
      { type: "readback", id: "u3-l3-e2", clearance: "Lufthansa 9, runway 25, cleared to land, wind 270 at 12.", expected: "Runway 25, cleared to land, Lufthansa 9" },
    ],
  },
  {
    id: "u4-l1",
    unitId: "unit-4",
    title: "Simulation: Departure to Arrival",
    objective: "Handle a whole flight's communications, including one unexpected event.",
    durationMinutes: 30,
    content: [
      "You will move through clearance delivery, taxi, take-off, climb, cruise and approach. Somewhere along the way, something unexpected will happen.",
      "Treat the unexpected event in three steps: state the problem, state your intention, make your request.",
    ],
    vocabulary: [
      { term: "Clearance delivery", definition: "The unit that issues route clearances before start-up.", example: "Clearance delivery, request IFR clearance." },
      { term: "Holding point", definition: "A position where you stop and wait for permission.", example: "Holding point Alpha 3." },
      { term: "Diversion", definition: "Flying to a different destination than planned.", example: "Request diversion." },
    ],
    exercises: [
      { type: "mcq", id: "u4-l1-e1", prompt: "A bird strike happens on take-off. What is the best first message?", options: ["Bird strike on departure, request return", "We have a problem", "Roger"], correctIndex: 0, explanation: "It names the problem and gives a request." },
      { type: "readback", id: "u4-l1-e2", clearance: "Tango Echo, taxi to holding point Alpha 3 via Bravo.", expected: "Taxi to holding point Alpha 3 via Bravo, Tango Echo" },
    ],
  },
  {
    id: "u4-l2",
    unitId: "unit-4",
    title: "Exam Walkthrough and Strategy",
    objective: "Understand the listening and speaking exam formats and how each criterion is judged.",
    durationMinutes: 20,
    content: [
      "The mock exam has 20 listening questions and four speaking tasks. Listening feeds your Comprehension score; the other five criteria are judged on speaking.",
      "The overall ICAO level is the lowest of the six criteria. A single weak criterion limits your level, so balance your practice.",
    ],
    vocabulary: [
      { term: "Operational Level", definition: "ICAO Level 4, the minimum for international operations.", example: "She holds Operational Level 4." },
      { term: "Rubric", definition: "The scoring guide for each criterion.", example: "Check the rubric before you practise." },
      { term: "Paraphrase", definition: "Say the same thing in different words.", example: "I paraphrase when I forget a word." },
    ],
    exercises: [
      { type: "mcq", id: "u4-l2-e1", prompt: "How is the overall ICAO level determined?", options: ["The average of the criteria", "The lowest criterion", "The highest criterion"], correctIndex: 1, explanation: "The overall level is the lowest of the six criteria." },
      { type: "readback", id: "u4-l2-e2", clearance: "Say again your last message, unreadable.", expected: "Say again, Skyways 8, request descent", hint: "Repeat clearly and shortly." },
    ],
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function lessonsForUnit(unitId: string): Lesson[] {
  return LESSONS.filter((l) => l.unitId === unitId);
}
