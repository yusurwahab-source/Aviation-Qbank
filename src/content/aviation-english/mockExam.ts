import type { ListeningQuestion, SpeakingTask } from "./types";

/**
 * NOTE: the audio files below are PLACEHOLDERS (`/audio/listening-NN.mp3`).
 * No recordings ship with this repository; until real files are added to
 * `public/audio/`, the player shows the transcript instead.
 * TODO(backend): serve real recordings from storage/CDN.
 */
export const LISTENING_AUDIO_NOTE =
  "Placeholder audio: recordings are not yet installed, so a transcript is offered in place of sound.";

type Row = [transcript: string, prompt: string, options: [string, string, string], correct: 0 | 1 | 2];

const ROWS: Row[] = [
  ["Speedbird 214, descend flight level 90, QNH 1012.", "What level is the aircraft cleared to?", ["FL 190", "FL 90", "9,000 feet on 1012 only"], 1],
  ["Cessna G-ABCD, hold position, landing traffic on final.", "Why must the Cessna hold?", ["Runway is closed", "Traffic is landing", "Fuel truck crossing"], 1],
  ["Delta 55, runway 27 left, line up and wait.", "What is Delta 55 told to do?", ["Take off", "Line up and wait", "Vacate the runway"], 1],
  ["Alpha Bravo, say again your last message, you were unreadable.", "What is the problem?", ["The controller wants a new frequency", "The message was not understood", "The aircraft is off route"], 1],
  ["Skyways 8, expect a delay of about ten minutes due to weather at destination.", "Why is there a delay?", ["Runway work", "Weather", "Traffic flow"], 1],
  ["Tower, Lima Mike, we have a bird strike on departure, request return.", "What does the pilot request?", ["Holding", "Return to the airport", "A higher level"], 1],
  ["Contact Ground 121.9, good day.", "Which frequency is to be used?", ["119.1", "121.9", "121.5"], 1],
  ["Cleared to Rome via flight planned route, climb flight level 240, squawk 4521.", "What is the squawk code?", ["4512", "4521", "2451"], 1],
  ["Report passing waypoint ROSTA.", "What must the pilot do?", ["Hold at ROSTA", "Report when passing ROSTA", "Avoid ROSTA"], 1],
  ["Wind 270 degrees, 25 knots, gusting 38, runway 27 cleared to land.", "What is the maximum wind speed?", ["25 knots", "27 knots", "38 knots"], 2],
  ["Mayday, mayday, mayday, Cargo 12, engine fire, descending to land immediately.", "What is the situation?", ["Medical emergency", "Engine fire", "Navigation failure"], 1],
  ["Lufthansa 9, cleared for the ILS approach runway 25, report established.", "What must be reported?", ["Runway in sight", "Established on the ILS", "Field in sight"], 1],
  ["Negative, I cannot accept runway 09, request runway 27.", "What does the pilot want?", ["Runway 09", "Runway 27", "A holding pattern"], 1],
  ["Ground, Tango Echo, taxiing to holding point Alpha 3 via Bravo.", "Via which taxiway?", ["Alpha", "Bravo", "Echo"], 1],
  ["Stand by, I will call you back with the revised clearance.", "What should the pilot do?", ["Wait for a further call", "Change frequency", "Read back the clearance"], 0],
  ["Pan-pan, pan-pan, pan-pan, passenger unwell, request priority landing.", "What kind of message is this?", ["Urgency", "Distress", "Routine"], 0],
  ["Go around, vehicle on the runway. Climb straight ahead to 3,000 feet.", "Why is the pilot told to go around?", ["Windshear", "Vehicle on the runway", "Wake turbulence"], 1],
  ["Visibility is 800 metres in fog, runway visual range 600 metres.", "What is the RVR?", ["800 metres", "600 metres", "1,800 metres"], 1],
  ["Confirm you are able to accept a direct routing to waypoint NAVAR?", "What is the controller asking?", ["The pilot's fuel state", "Whether direct routing is acceptable", "Weather at NAVAR"], 1],
  ["Affirm, we have the traffic in sight, we will maintain own separation.", "What is the pilot doing?", ["Asking for vectors", "Maintaining own separation", "Declaring an emergency"], 1],
];

export const LISTENING_QUESTIONS: ListeningQuestion[] = ROWS.map(([transcript, prompt, options, correctIndex], i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    id: `L${n}`,
    audioUrl: `/audio/listening-${n}.mp3`,
    transcript,
    prompt,
    options: [...options],
    correctIndex,
  };
});

export const SPEAKING_TASKS: SpeakingTask[] = [
  {
    id: "S1",
    type: "interview",
    title: "Interview",
    prompt: "Answer the examiner's questions about your flying and your work.",
    details: [
      "Tell me about your flying experience.",
      "Describe a typical flight you make.",
      "What is the most difficult part of communicating with air traffic control?",
    ],
    timeLimitSeconds: 120,
  },
  {
    id: "S2",
    type: "picture",
    title: "Picture description",
    prompt: "Describe the scene: an apron at dusk, a fuel truck beside an airliner, a ground crew member waving wands, rain beginning.",
    details: ["Say what is happening.", "Say what could go wrong.", "Say what you would do if you were the pilot."],
    timeLimitSeconds: 90,
  },
  {
    id: "S3",
    type: "roleplay",
    title: "ATC role-play",
    prompt: "You are the pilot of Skyways 8 on approach. Respond to each controller line aloud, using phraseology.",
    details: [
      "ATC: Skyways 8, descend to 4,000 feet, QNH 1009.",
      "ATC: Skyways 8, expect a holding pattern at ROSTA, delay 15 minutes.",
      "ATC: Skyways 8, say reason for the delay request.",
    ],
    timeLimitSeconds: 120,
  },
  {
    id: "S4",
    type: "scenario",
    title: "Scenario analysis",
    prompt: "On climb, a warning light shows an unexpected hydraulic fault. Explain the situation, your options and your decision.",
    details: ["Describe the problem.", "Explain two options.", "Say what you would tell ATC."],
    timeLimitSeconds: 150,
  },
];
