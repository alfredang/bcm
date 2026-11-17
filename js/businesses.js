// Five FICTIONAL Singapore businesses for the AI business simulator.
// Meridian Services matches EXAMPLE_BLURB in js/templates.js (the course's worked example).
// Any resemblance to a real company is unintended.

export const BUSINESSES = [
  {
    id: "meridian",
    name: "Meridian Services Pte Ltd",
    sector: "Facilities maintenance",
    staff: 140,
    profile: "Meridian Services maintains lifts, pumps, air-conditioning and electrical systems for 30 commercial buildings across Singapore. Its 140 staff handle 28,800 service requests a year, with an 18-minute average handling time, 14% rework (second visits) and a 1.4% complaint rate. Coordinators still re-key emails and WhatsApp messages into tickets by hand.",
    objectives: [
      "Same-day response for every client",
      "Cut rework from 14% to under 8%",
      "Win two more building contracts this year without adding coordinators"
    ],
    painPoints: [
      "Coordinators re-key 80 emails and WhatsApps a day into tickets",
      "1 in 7 jobs needs a second visit because job details are missing",
      "Monthly client reports take two days of copy-paste"
    ],
    systems: ["ServiceNow ticketing", "Google Workspace (Gmail, Calendar)", "WhatsApp Business", "Xero accounting", "Building management system feeds"]
  },
  {
    id: "kopi",
    name: "Lantern Lane Kopi Pte Ltd",
    sector: "Food & beverage (kopi chain)",
    staff: 310,
    profile: "Lantern Lane Kopi runs 22 kopitiam-style outlets in HDB estates and two central kitchens, selling about 9,000 cups of kopi and 3,500 kaya toast sets a day. Outlet managers order stock by WhatsApp each night, and food waste runs at 9% of ingredient cost. A new loyalty app has 48,000 members but nobody reads its feedback.",
    objectives: [
      "Cut food waste from 9% to 5% of ingredient cost",
      "Raise loyalty-app repeat visits by 15%",
      "Open 4 new outlets without adding head-office staff"
    ],
    painPoints: [
      "Night-time stock orders by WhatsApp are often late or wrong",
      "Staff rosters are rebuilt by hand every week across 22 outlets",
      "4,000 app reviews and comments sit unread"
    ],
    systems: ["Point-of-sale (cloud POS)", "Loyalty app", "WhatsApp groups per outlet", "Excel rosters", "Supplier email ordering"]
  },
  {
    id: "clinic",
    name: "Harbourview Family Clinics",
    sector: "Healthcare (GP clinic group)",
    staff: 85,
    profile: "Harbourview runs 9 GP clinics in the west of Singapore with 26 doctors and 85 staff in total, seeing about 190,000 consultations a year. Patients book by phone or walk in; front-desk staff spend much of the morning on calls about queue times and MC copies. Chronic-care patients (diabetes, hypertension) often miss follow-up reviews.",
    objectives: [
      "Bring average waiting time under 25 minutes",
      "Lift chronic-care follow-up attendance from 61% to 80%",
      "Free front-desk staff from routine phone queries"
    ],
    painPoints: [
      "Phones ring non-stop 8-11 am with queue and appointment questions",
      "Follow-up reminders are sent by hand, if at all",
      "Doctors type the same referral letters again and again"
    ],
    systems: ["Clinic management system", "SMS reminder gateway", "Phone lines (no IVR)", "National health record upload", "Google Sheets for chronic-care tracking"]
  },
  {
    id: "freight",
    name: "Straits Linkage Logistics Pte Ltd",
    sector: "Logistics (SME freight forwarder)",
    staff: 60,
    profile: "Straits Linkage is a 60-person freight forwarder moving about 9,500 sea and air shipments a year for SME importers and exporters. Customer-service officers answer 'where is my shipment?' emails all day by checking carrier websites one by one. Customs and shipping documents are prepared in Word and Excel, and errors cause demurrage charges.",
    objectives: [
      "Answer every shipment-status query within 1 hour",
      "Halve document errors that cause demurrage",
      "Grow shipments 20% with the same customer-service team"
    ],
    painPoints: [
      "Status queries are answered by checking 12 carrier portals by hand",
      "Commercial invoices and packing lists are re-typed into permit forms",
      "Quotes take a day because rates live in many spreadsheets"
    ],
    systems: ["Freight management system", "Outlook email", "Carrier tracking portals", "Customs permit software", "Excel rate sheets"]
  },
  {
    id: "accounting",
    name: "Keystone & Lim Chartered Accountants",
    sector: "Professional services (accounting firm)",
    staff: 40,
    profile: "Keystone & Lim is a 40-person accounting firm serving about 650 SME clients with bookkeeping, GST filing, annual accounts and corporate secretarial work. Staff chase clients by email for bank statements and receipts, and the March to November filing season brings heavy overtime. Partners want to offer advisory services but have no time to build them.",
    objectives: [
      "Cut month-end bookkeeping time per client by 40%",
      "Zero late GST filings",
      "Launch a paid advisory package for the top 100 clients"
    ],
    painPoints: [
      "Chasing missing documents takes 6 hours per staff member a week",
      "Receipts arrive as phone photos in WhatsApp",
      "Junior staff repeat the same checks the reviewer does again"
    ],
    systems: ["Cloud accounting (Xero, QuickBooks)", "Document management system", "Outlook email", "WhatsApp", "Practice management software"]
  }
];

export const BUSINESS_BY_ID = Object.fromEntries(BUSINESSES.map(b => [b.id, b]));

/**
 * Canned outputs for Meridian Services when no API key is set, one per simulator action.
 * Markdown: rendered by the simulator's safe renderer. "suggest" is not here: it reuses the
 * template's own worked-example notes for the chosen block.
 */
export const OFFLINE_OUTPUTS = {
  dormant: `### Dormant data samples: Meridian Services Pte Ltd

All samples below are simulated. Names are roles, not people.

**1. Email (Monday 08:47)**
> From: Building manager, Orchard Plaza
> Subject: Toilet leak level 3 AGAIN
> The leak on level 3 is back. Your technician fixed it on 2 Oct. Tenants are complaining. Please send someone today.

*What it reveals:* a repeat fault within 30 days, with no link to the earlier ticket.

**2. WhatsApp (technician group, 14:12)**
> Tech 07: pump room B2 Jurong site, bearing noise. No spare on van. Need to come back tmr.
> [photo: pump nameplate]

*What it reveals:* a second visit caused by a missing part; the nameplate photo holds the model number nobody records.

**3. Ticket note (closed)**
> SR-48213 · Air-con not cold · Status: Closed · Note: "reset done, ok"

*What it reveals:* "closed" without client confirmation; no root cause.

**4. Call-log extract**

| Time | Caller | Topic | Duration |
|---|---|---|---|
| 09:02 | Client | "Where is my technician?" | 6 min |
| 09:15 | Client | Same job, second call | 4 min |
| 09:31 | Supervisor | Re-assign job | 3 min |

*What it reveals:* status chasing eats coordinator time; a live job-status update would remove most of these calls.

**Which capability gap blocks an agent here?** Private data (tickets and WhatsApp are not connected) and internal language ("closed" means different things to technicians and clients).`,

  simulate: `### 90-day simulation: triage agent at Meridian Services

*Simulated outcome, not a forecast.*

**Days 1-30.** The agent drafts tickets for 2 sites. Coordinators approve every draft. Handling time drops from 18 to 14 minutes. Coordinators like losing the re-keying but distrust the urgency flags.

**Days 31-60.** Scope grows to 10 sites. **What goes wrong:** in week 7 the agent marks a lift entrapment email as "normal" because the client wrote "lift stuck, nobody inside now". The supervisor catches it 40 minutes late. The DRI adds a rule: any message mentioning "lift" goes to a human first, and the agent re-reads last month's tickets to test the rule.

**Days 61-90.** All approvals for urgent and VIP clients stay human. Rework falls as drafted tickets now include site, asset and photos.

| KPI | Baseline | Day 30 | Day 60 | Day 90 |
|---|---|---|---|---|
| Average handling time (min) | 18.0 | 14.2 | 12.1 | 10.7 |
| First-pass ticket quality | 86% | 90.4% | 93.0% | 95.1% |
| Complaint rate | 1.4% | 1.5% | 1.9% | 1.7% |
| Coordinator adoption | 0% | 41% | 63% | 77.5% |
| Rework (second visits) | 14% | 13% | 11% | 9% |

**Day-90 call:** scale to all 30 sites with the same approval rules, and keep the weekly sample audit so approval does not become a click.`,

  stakeholders: `### Stakeholder reactions: Meridian Services change plan

*Simulated reactions to the change board.*

**1. Senior coordinator (12 years at Meridian)**
"I've seen three systems come and go. If the agent drafts the ticket, who gets blamed when it's wrong? Show me that I can still override it, and let me train it on the clients I know need a phone call."
*Worry:* losing status and judgement. *What would win them over:* a named role as agent coach and a say in the routing rules.

**2. Building manager at a client site**
"I don't care who types the ticket. I care that someone tells me when the technician arrives. If I get a chatbot instead of my account manager, I'll go to tender next year."
*Worry:* a chatbot wall. *What would win them over:* faster status updates from the same people, stated in the account manager's email.

**3. Finance manager**
"Fewer disputed invoices would be great. But SGD 39,000 is real money. What's the stop rule if it doesn't work by day 90?"
*Worry:* sunk cost. *What would win them over:* the kill criterion (stop if rework rises above 20% for 2 weeks) written into the plan.

**Gap in the board:** nobody owns telling the technicians. They feed the agent with photos and notes but hear about the change last.`
};
