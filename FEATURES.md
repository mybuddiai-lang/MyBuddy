# Buddi — Top 1% Feature Roadmap

Ten high-impact features that separate Buddi from every other study app and make it the definitive academic resilience platform.

---

## 1. AI Voice Companion Mode

**Talk to Buddi, hands-free.**

Students integrate voice into every part of their day — walking to campus, commuting, cooking. Voice companion mode lets users have full AI conversations out loud: Buddi listens, responds with a natural voice, and keeps the conversation in the same memory context as the text chat.

**Why it matters:** It shifts Buddi from a chat app to a genuine companion. The emotional intimacy of voice builds stronger user attachment than text alone. No competitor in the academic space has this.

**Implementation path:**
- Speech-to-text: OpenAI Whisper (already in backend for voice notes)
- Text-to-speech: OpenAI TTS or ElevenLabs for a warm, humanised voice
- Mobile: Web Speech API + AudioContext for the PWA
- Session continuity: voice messages append to the same conversation history

---

## 2. Adaptive Spaced Repetition Engine

**Flashcards that get smarter with every answer.**

Most recall systems use generic intervals (Anki, SM-2). Buddi should build a per-user, per-card model that learns your personal forgetting curve — adjusting review timing, difficulty weights, and session length dynamically based on real response patterns.

**Why it matters:** This is the single most evidence-backed intervention for long-term retention. Done well, it turns Buddi's recall module into a category-defining study tool that no generic app can match.

**Implementation path:**
- Track response confidence (Easy / Hard / Blank) per attempt per card
- Store `masteryLevel`, `lastReviewedAt`, `nextReviewAt`, `failCount` per `NoteChunk`
- Interval calculation: modified SM-2 or FSRS algorithm on the backend
- Surface due cards by priority: cards closest to forgetting curve threshold first
- Dashboard showing per-topic mastery curves over time

---

## 3. Burnout Early Warning System

**Detect and intercept burnout before it happens.**

Using sentiment analysis across every message, study streak data, sleep pattern hints, and inactivity gaps, Buddi builds a personal resilience profile. When the trend turns dangerous, it intervenes — gently, intelligently, and at the right moment.

**Why it matters:** This is Buddi's core thesis made tangible. It is the feature that turns a study tool into a student welfare platform. It unlocks institutional sales ("we protect your students").

**Implementation path:**
- Sentiment scoring already exists (`sentimentScore` on messages)
- Build a rolling `resilienceIndex` from: message sentiment trend (7-day), streak consistency, session frequency, study hours, self-reported mood
- Trigger levels: `GREEN` → `AMBER` (gentle check-in) → `RED` (crisis resources + optional guardian alert)
- Buddi proactively opens a check-in conversation: *"Hey, I've noticed you've been quiet — how are you actually doing?"*
- Optional: Allow students to nominate a trusted contact (guardian mode) who receives a non-intrusive email alert at RED level

---

## 4. AI Exam Simulator

**Full mock exams generated from your own notes.**

Before every exam, students need to practice under realistic conditions. Buddi generates a complete timed exam paper — MCQs, short answers, case studies — drawn entirely from the student's uploaded materials, structured to match their exam format.

**Why it matters:** It closes the loop between uploading notes and actually being ready. No other platform can generate a personalised mock exam from a student's own content. This is the killer feature for medical and law students.

**Implementation path:**
- Input: student's notes + exam type (MCQ, essay, OSCE, viva) + difficulty level + duration
- AI generates a full paper with mark scheme
- Student submits answers; AI scores each response and gives per-question feedback
- Weak areas flagged → auto-generate additional recall cards for those gaps
- Exam history stored with scores and improvement trend

---

## 5. Smart Study Timetable Generator

**An AI study planner that actually knows your life.**

The student inputs their exam date, available daily study hours, topics to cover, and current mastery levels. Buddi generates a day-by-day study schedule, balances topic distribution using spaced repetition logic, and pushes daily reminders to keep them on track.

**Why it matters:** Students consistently fail not because they lack knowledge but because they plan poorly and run out of time. A personalised timetable removes this. It also increases daily active use — users return every day because Buddi tells them what to study next.

**Implementation path:**
- Input form: exam date, hours/day available, topic list (populated from uploaded notes), energy preference (morning/evening)
- Algorithm: divide total study hours across topics weighted by mastery level and importance tags
- Output: calendar view (weekly) + daily push notification with "Today's plan"
- Sync to Google Calendar / Apple Calendar via CalDAV or iCal export
- Timetable auto-adjusts when a student misses a day (no shame, just reschedules)

---

## 6. Multi-Source Knowledge Ingestion

**Turn anything into flashcards — YouTube, URLs, photos, audio.**

Today Buddi accepts PDF, PowerPoint, images, and voice. The top-1% platform accepts everything: YouTube lecture links, website article URLs, handwritten note photos (OCR), and long-form audio recordings. One unified knowledge base built from wherever the student learns.

**Why it matters:** Students don't only learn from PDFs. Lectures are on YouTube. Textbook summaries are on blogs. Notes are handwritten. Meeting students where their content already exists removes all friction from the upload habit.

**Implementation path:**
- YouTube: `yt-dlp` to extract transcript or download audio → Whisper transcription → existing AI pipeline
- URL scraping: `playwright` or `cheerio` headless fetch → strip to article text → AI pipeline
- Handwritten notes: photo upload → AWS Textract (OCR) → AI pipeline (already scaffolded in `files.service.ts`)
- Long audio: Whisper chunked transcription (already functional for voice notes, extend to longer files)

---

## 7. Peer Accountability & Study Streaks in Pods

**Study harder because your pod is watching.**

Community pods become accountability circles. Members can see each other's study streaks, opt into public daily goals, and receive a gentle nudge when a pod member has gone quiet. Pods collectively build a group resilience score — if the group thrives, everyone benefits.

**Why it matters:** Social accountability is one of the most powerful behaviour-change mechanisms in existence. Adding public streak visibility and gentle social nudges to pods turns passive group chats into genuine study accountability networks.

**Implementation path:**
- Opt-in: each user can choose to make their streak and study hours visible to pod members
- Pod leaderboard (already exists globally — extend it to the pod level)
- Nudge system: if a pod member misses 2+ days, Buddi sends a friendly pod message: *"@name hasn't checked in — someone give them a shoutout 👀"*
- Collective pod streak: if the majority of the pod studies daily, the pod earns a shared streak badge
- Pod resilience score: average of all member resilience indices, displayed on the pod page

---

## 8. AI Oral Examination Simulator (Viva / OSCE / Bar)

**Practice the hardest exam format with an AI examiner.**

Oral exams, clinical OSCEs, viva voce, and bar mock trials are uniquely stressful — there is almost no way to practice them without a human. Buddi simulates the experience: the AI plays the examiner, asks unpredictable follow-up questions, evaluates the quality and depth of responses, and gives a scored debrief.

**Why it matters:** This is a premium, defensible feature that no general study app can replicate. For medical students facing OSCEs or law students facing oral advocacy, this is the most valuable thing Buddi could offer. It directly justifies the premium subscription.

**Implementation path:**
- Session type selection: Viva, OSCE station, mock oral, case presentation
- System prompt primes the AI as a strict examiner in the selected domain
- Student answers via text (or voice in Voice Mode)
- AI asks follow-up questions dynamically based on the answer — not a fixed script
- At session end: scoring rubric (Knowledge / Communication / Structure) + written feedback
- Sessions saved so students can review their answers and the examiner's critique

---

## 9. Institutional Analytics Dashboard

**What schools need to keep their students from failing — and falling apart.**

A white-label analytics dashboard for universities and professional schools. Anonymised, aggregate-level only. Shows: cohort stress heatmaps by week, topic difficulty clusters (which topics are most students struggling with), engagement vs outcome correlations, and at-risk cohort flags.

**Why it matters:** This is the entire B2B revenue model. Schools pay for cohort licenses because Buddi gives them something they cannot get elsewhere: real-time, anonymous data on how their students are doing emotionally and academically. One institutional contract is worth hundreds of individual subscriptions.

**Implementation path:**
- Completely anonymous at the student level — aggregate only (minimum cohort size for any data point: 10)
- Metrics: weekly active users, average resilience score, topic mastery distribution, burnout risk distribution, top stressed weeks (mapped to exam calendar)
- School admin login with role-based access (Dean, Course Director, Counselling Services each see different views)
- Weekly email digest to course directors: "3 students in your cohort are showing elevated burnout signals this week"
- GDPR + NDPR compliant — full opt-in, data processing agreement, right to deletion

---

## 10. Resilience Score as a Portfolio Credential

**Turn study discipline into something you can show the world.**

Every student who uses Buddi consistently builds a Resilience Score — a verifiable, shareable metric that captures consistency, recovery from setbacks, burnout navigation, and study discipline over time. Students can share a verified Buddi Resilience Certificate on their CV or LinkedIn, endorsed by their institution.

**Why it matters:** This gamifies the right behaviours (consistency, not cramming), creates deep long-term engagement (users stay because their score compounds over time), and gives Buddi a network effect (the more prestigious schools endorse it, the more valuable the credential becomes).

**Implementation path:**
- Resilience Score already exists in the data model — make it visible, explainable, and beautiful
- Score components (transparent to the user): Study Consistency (streak), Burnout Recovery (dips and rebounds), Recall Performance (mastery gains), Community Engagement (pod activity)
- Verifiable certificate: issued as a signed PDF with a QR code linking to a public verification page
- Institutional endorsement tier: schools that partner with Buddi can add their logo to certificates
- LinkedIn share button on the certificate — organic social distribution that markets Buddi for free

---

*These features are ordered by implementation complexity (low → high) within their strategic tiers. Features 1–3 deepen the core product. Features 4–6 expand the content surface. Features 7–8 build community and premium hooks. Features 9–10 unlock the institutional and credential business models.*
