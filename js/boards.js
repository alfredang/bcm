// Board catalogue: the course activities (generated in js/templates.js; do not edit that file).
// The classic Business Model Canvas and retired activities are kept only so older boards still open.
import { TEMPLATES, EXAMPLE_COMPANY, EXAMPLE_BLURB } from "./templates.js";

export const COURSE = {
  code: "TGS-2023037472",
  title: "Business Innovation with Agentic AI and AI Agents",
  provider: "Tertiary Infotech Academy Pte Ltd",
  providerUrl: "https://www.tertiarycourses.com.sg/"
};

export { EXAMPLE_COMPANY, EXAMPLE_BLURB };

export const BMC_TEMPLATE = {
  key: "bmc",
  num: null,
  topic: null,
  lo: "",
  codes: "",
  layout: "bmc",
  title: "Classic Business Model Canvas",
  short: "Map any business model",
  pitch: "The original nine-block canvas by Osterwalder and Pigneur: who you serve, what you offer, and how the money works.",
  evidence: "Classic canvas · not a PP task",
  discuss: [
    "Which block would change first if an AI agent took over one key activity?",
    "Which customer segment pays for the value proposition, and which only uses it?",
    "Which cost would you cut first if revenue fell by a third?"
  ],
  minutes: 30,
  blocks: [
    { id: "keyPartners", num: 1, title: "Key Partners", prompt: "Strategic alliances that power your model.",
      questions: ["Who are our key partners and suppliers?", "Which resources do we acquire from partners?", "Which activities do partners perform?"],
      example: [
        { title: "ServiceNow (ticketing)", description: "Hosts every service request; renewal due in March." },
        { title: "Spare-parts distributors", description: "Two approved suppliers with 48-hour delivery." }
      ] },
    { id: "keyActivities", num: 2, title: "Key Activities", prompt: "What you must do well to deliver value.",
      questions: ["Which activities does the value proposition require?", "What do channels and customer relationships need?"],
      example: [
        { title: "Request triage and dispatch", description: "28,800 requests a year routed to 30 sites." },
        { title: "Preventive maintenance", description: "Quarterly checks on lifts, pumps and air-con." }
      ] },
    { id: "keyResources", num: 3, title: "Key Resources", prompt: "The assets your model can't run without.",
      questions: ["Which physical, intellectual, human or financial resources are needed?", "Which are most critical?"],
      example: [
        { title: "Licensed technicians", description: "96 of the 140 staff; hard to hire." },
        { title: "Five years of ticket history", description: "Root causes and repeat faults per site." }
      ] },
    { id: "valueProps", num: 4, title: "Value Propositions", prompt: "Why customers choose you.",
      questions: ["What value do we deliver?", "Which customer problems do we solve?", "What makes the offer unique?"],
      example: [
        { title: "One number for every fault", description: "Building managers call once; Meridian handles the rest." },
        { title: "2-hour urgent response", description: "Lift entrapments and leaks get a technician fast." }
      ] },
    { id: "customerRel", num: 5, title: "Customer Relationships", prompt: "How you engage and retain each segment.",
      questions: ["What relationship does each segment expect?", "How do we acquire, keep and grow customers?"],
      example: [
        { title: "Named account manager", description: "One per contract; monthly service review." },
        { title: "Client portal", description: "Self-service job status, 24/7." }
      ] },
    { id: "channels", num: 6, title: "Channels", prompt: "How you reach customers and deliver value.",
      questions: ["Through which channels do customers want to be reached?", "Which channels work best and cost least?"],
      example: [
        { title: "Email and WhatsApp Business", description: "80 inbound requests a day." },
        { title: "Public tenders (GeBIZ)", description: "Where most new contracts are won." }
      ] },
    { id: "customerSeg", num: 7, title: "Customer Segments", prompt: "The people you create value for.",
      questions: ["Who are our most important customers?", "What are their needs and pain points?"],
      example: [
        { title: "Commercial building owners", description: "30 managed sites, 1-12 sites per client." },
        { title: "Town councils", description: "Price-sensitive, strict SLA reporting." }
      ] },
    { id: "costStructure", num: 8, title: "Cost Structure", prompt: "What it costs to operate the model.",
      questions: ["What are the most important costs?", "Which resources and activities are most expensive?"],
      example: [
        { title: "Technician payroll", description: "Largest cost; overtime spikes after storms." },
        { title: "Second visits", description: "14% rework means 1 in 7 jobs costs twice." }
      ] },
    { id: "revenueStreams", num: 9, title: "Revenue Streams", prompt: "How the business earns money.",
      questions: ["What are customers willing to pay for?", "Which pricing model fits?"],
      example: [
        { title: "Annual maintenance contracts", description: "Fixed monthly fee per site." },
        { title: "Ad-hoc call-outs", description: "Charged per job, with after-hours premium." }
      ] }
  ]
};

/**
 * Activities removed from the course. Boards created with them must still open with their
 * notes, so their block ids are kept here. They are not offered for new boards.
 */
export const RETIRED_TEMPLATES = [
  {
    key: "companymap",
    retired: true,
    num: null,
    lo: "",
    codes: "",
    layout: "grid",
    title: "Company Map & Decision Layer",
    short: "Retired activity",
    pitch: "Write the map that turns a bright new AI hire into a colleague who knows how your company works.",
    evidence: "Retired activity · not a PP task",
    minutes: 45,
    discuss: [
      "Which business term means something different in your company than in the dictionary?",
      "Which approval would an agent most likely skip if nobody wrote it down?",
      "Which live event should update the map within minutes?"
    ],
    blocks: [
      { id: "entities", num: 1, title: "Entities", prompt: "What are the key things in your business?",
        questions: ["People, customers, products, orders, contracts, approvals.", "Which of these does the agent need to read?"] },
      { id: "terms", num: 2, title: "Our Language", prompt: "Which terms have a company-specific meaning?",
        questions: ["Define 'active customer', 'closed', 'urgent' the way your company uses them.", "Where do teams disagree on a definition?"] },
      { id: "relationships", num: 3, title: "Relationships", prompt: "How do the entities connect?",
        questions: ["Who owns what? What belongs to what?", "Which direction does each relationship flow?"] },
      { id: "rules", num: 4, title: "Business Rules & Approvals", prompt: "Which rules and sign-offs must every action respect?",
        questions: ["Which approvals are needed after a contract is signed?", "What thresholds trigger escalation?"] },
      { id: "events", num: 5, title: "Live Navigation (Events)", prompt: "Which real-time events must update the map?",
        questions: ["What changes every minute or hour?", "Which event should trigger an alert?"] },
      { id: "operating", num: 6, title: "Operating System & Guardrails", prompt: "What may the agent schedule, test, connect to and do?",
        questions: ["Scheduling, execution sandbox, access (MCP connectors), control.", "Least privilege: read, draft or act?"] }
    ]
  }
];

/** Boards offered for new work: only the course activities. */
export const CREATABLE_TEMPLATES = TEMPLATES;
const BY_KEY = Object.fromEntries(TEMPLATES.map(t => [t.key, t]));
// A key that is current in templates.js always wins over a retired copy.
const RETIRED_BY_KEY = Object.fromEntries(RETIRED_TEMPLATES.filter(t => !BY_KEY[t.key]).map(t => [t.key, t]));

/**
 * Template for a canvas `type`. Old canvases have no type (or type "bmc") and open with the
 * classic BMC blocks; canvases of a retired activity open with that activity's blocks and a
 * "retired" note. Neither is offered for new boards.
 */
export function getTemplate(key) {
  return BY_KEY[key] || RETIRED_BY_KEY[key] || BMC_TEMPLATE;
}
/** Every template a board can open with (for tools that need all block ids). */
export const ALL_KNOWN_TEMPLATES = [...TEMPLATES, BMC_TEMPLATE, ...RETIRED_TEMPLATES];
/** True only for boards that can be created now. */
export function hasTemplate(key) { return Boolean(BY_KEY[key]); }

/** "Activity 1" for course boards, "Practice board" for the classic BMC. */
export function activityLabel(t) {
  if (t.retired) return "Retired activity";
  return t.num ? `Activity ${t.num}` : "Classic canvas";
}

/** The PP task a board's screenshot goes into, or "" when it feeds another activity. */
export function ppTask(t) {
  const m = /PP Task (\d)/.exec(t.evidence || "");
  return m && !/^Feeds/.test(t.evidence) ? `PP Task ${m[1]}` : "";
}

/** Block colour slots, cycled per block (see --c1..--c9 in styles.css). */
export function blockColor(index) {
  return `var(--c${(index % 9) + 1})`;
}

/** Colour for an activity (cards, nav, chips). */
export function templateColor(t) {
  if (t.key === "bmc") return "var(--slate)";
  if (t.retired) return "var(--muted)";
  const cycle = ["var(--accent)", "var(--teal)", "var(--rust)", "var(--gold)", "var(--c7)"];
  return cycle[((t.num || 1) - 1) % cycle.length];
}

/**
 * The Meta Muse prompt for a board: the course's own `musePrompt` from templates.js, or the
 * same pattern built from the blocks for boards that have none (classic BMC, retired activities).
 */
export function musePromptFor(t) {
  if (t.musePrompt) return t.musePrompt;
  return [
    `Act as my innovation consultant. My organisation: [two sentences: industry, size, customers, this year's objective]. Draft our ${t.title}. For each block below give two specific notes of at most 15 words, with names, numbers and owners. Use my email and calendar only where relevant and quote the source. Mark guesses as (assumption).`,
    ...t.blocks.map(b => `${b.num}. ${b.title}: ${b.prompt}`),
    "Finish with the three notes I should verify first."
  ].join("\n");
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}
