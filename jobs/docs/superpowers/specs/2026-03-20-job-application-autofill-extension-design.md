# Job Application Autofill Assistant Design

## What It Is

A local-first system that helps fill job application forms in Chrome. It consists of:

- A Chrome extension that detects application forms, extracts field and job context, requests suggested answers, fills the form, and presents a review UI.
- A local service running on the user's Mac that stores profile data, resumes, approved answers, and learning history, and generates field answers using local memory plus an LLM.

The system fills fields only. It never submits an application automatically.

## Why It Exists

Manual job applications are repetitive and error-prone. The user wants the speed of tools like Jobright Autofill but with stronger control:

- Data stays local on the Mac.
- Suggestions can use both saved profile facts and the current job description.
- The system learns from user-approved edits so repeated questions improve over time.
- The user reviews every filled answer before deciding to submit.

## Goals

- Work in Chrome on a best-effort basis across many job application sites, not just a fixed list of supported boards.
- Autofill standard fields such as name, email, phone, location, links, work authorization, and resume uploads.
- Draft answers for custom questions using profile data, resume content, job description content, and similar approved past answers.
- Store all profile data, resumes, memories, and learning history locally.
- Show which answers are high confidence versus which need review.
- Learn only from approved or edited user answers.

## Non-Goals

- Automatic form submission.
- Cloud sync or shared accounts.
- A fully autonomous browser agent that navigates entire application flows without review.
- Hidden background learning from unreviewed browsing behavior.
- Training a custom model. Learning is memory retrieval plus reuse of approved answers.

## Users

- Primary user: a single job seeker using Chrome on macOS.
- Secondary future user: none for the first version. The product is intentionally single-user and local-only.

## Product Scope

The first version covers one complete workflow:

1. User configures a local profile and stores one or more resume files.
2. User opens a job application page in Chrome.
3. Extension detects the form and extracts page context.
4. User clicks `Autofill`.
5. Local service returns suggestions and confidence metadata.
6. Extension fills the form and highlights uncertain fields.
7. User reviews and edits values.
8. User can accept edits as learning data.
9. User manually submits the application outside the system.

## Recommended Architecture

### Overview

Use a split architecture:

- Chrome extension for page detection, extraction, form filling, and review UI.
- Local service for data storage, answer generation, learning, and profile management.

This separation keeps browser code small and stateless while centralizing complex AI and memory logic in one local process with access to files and a local database.

### Major Components

#### 1. Chrome Extension

Responsibilities:

- Detect candidate application forms on the current page.
- Read fields, labels, placeholder text, nearby help text, validation errors, and available options.
- Extract job context from the page, including company, title, location, and job description when present.
- Present a side panel or popup showing fill status and confidence.
- Send structured fill requests to the local service.
- Fill values into the page and trigger the events required by modern frontend frameworks.
- Surface review state to the user.

Units:

- `content-script`: scans DOM, classifies fields, extracts job text, fills fields, and reads post-fill validation state.
- `background`: owns communication with the local service and tab-level coordination.
- `ui`: side panel or popup for profile status, fill summary, field review, and learning actions.

Interface boundary:

- The extension sends a structured `FillRequest` to the local service and receives a structured `FillResponse`.
- The extension does not decide final answer content beyond direct profile mapping for trivial local display needs.

#### 2. Local Service

Responsibilities:

- Store profile facts, resume metadata, approved answers, and job-specific history.
- Parse resumes and maintain reusable structured profile data.
- Build answer prompts using profile facts, job context, and prior approved answers.
- Call the configured LLM.
- Return suggested values with provenance and confidence.
- Save approved learning records.
- Expose a small local UI for editing profile data and reviewing saved memories.

Units:

- `profile-store`: canonical facts such as personal details, links, education, authorization, salary preferences, and default answers.
- `resume-manager`: indexes local resume files, tracks variants, and returns the most appropriate file when a resume upload field is found.
- `memory-store`: keeps approved Q/A history and supports similarity retrieval.
- `answer-engine`: orchestrates profile lookup, memory retrieval, prompt construction, and answer generation.
- `job-context-normalizer`: cleans page-extracted job text into structured context.
- `local-ui`: lets the user edit profile facts, resumes, and saved answers.

Interface boundary:

- The local service accepts JSON over a loopback HTTP API.
- The local service owns all persistence and all AI logic.

#### 3. Local Database

Responsibilities:

- Persist profile data, resume references, fill history, question-answer memories, and user preferences.
- Keep the system restart-safe and fully local.

Recommended storage:

- SQLite for structured storage.
- Filesystem storage for resume files and optional cached parsed text.

## Core Data Contracts

## Loopback API Surface

The local service should expose a minimal loopback-only API.

Required endpoints:

- `GET /health`
  - Returns service availability and profile readiness.
- `POST /fill`
  - Accepts `FillRequest` and returns `FillResponse`.
- `POST /learning-records`
  - Saves approved user-edited answers as `LearningRecord` entries.
- `GET /profile`
  - Returns current profile completeness and key facts needed by the extension UI.
- `PUT /profile`
  - Updates stored profile facts and defaults.
- `GET /resumes`
  - Returns available resume variants and the default selection.

Extension behavior:

- The extension should call `GET /health` before offering advanced autofill actions.
- The extension should call `POST /fill` only after the user explicitly starts autofill.
- The extension should call `POST /learning-records` only after the user confirms learning from reviewed answers.

### FillRequest

Sent by the extension to the local service.

Fields:

- `pageUrl`
- `siteHostname`
- `jobContext`
- `fields[]`

`jobContext` should include:

- `company`
- `jobTitle`
- `location`
- `jobDescriptionText`
- `applicationPageText`

Each `field` should include:

- `fieldId`
- `fieldType`
- `label`
- `name`
- `placeholder`
- `required`
- `options[]` for select/radio/checkbox groups
- `nearbyText`
- `currentValue`

### FillResponse

Returned by the local service to the extension.

Fields:

- `answers[]`
- `resumeRecommendation`
- `warnings[]`

Each `answer` should include:

- `fieldId`
- `value`
- `confidence`
- `sourceType`
- `sourceSummary`
- `reviewRequired`

`sourceType` values:

- `profile`
- `memory`
- `job_draft`
- `mixed`
- `unknown`

### LearningRecord

Saved only after user approval.

Fields:

- `normalizedQuestion`
- `rawQuestion`
- `approvedAnswer`
- `jobTitle`
- `company`
- `pageUrl`
- `sourceType`
- `editedByUser`
- `createdAt`

## Functional Design

### 1. Form Detection

The extension should detect forms generically rather than rely only on site adapters.

Detection inputs:

- `input`, `textarea`, `select`, and accessible custom controls
- text from labels and `aria-*` attributes
- nearby question text
- required markers
- validation messages

Detection strategy:

- Build a normalized field model from DOM elements and surrounding text.
- Use heuristic matching for common fields such as first name, email, LinkedIn, visa status, salary expectation, and work experience questions.
- Preserve original DOM references so each suggested answer can be applied back to the right field.

Site-specific helpers may be added later for platforms like Workday, Greenhouse, and Lever, but the first version is generic by default.

### 2. Job Context Extraction

The extension should collect job context from the current page.

Required extraction:

- Job title
- Company
- Location if present
- Main job description text
- Visible application questions

Fallback behavior:

- If a page lacks a clean job description, send the page text and let the local service trim it.
- If job context is weak, the answer engine should reduce confidence and rely more heavily on profile and memory.

### 3. Answer Generation

Answer generation must happen in ordered passes:

1. **Direct profile pass**
   - Fill deterministic fields from stored facts when the mapping is clear.
2. **Memory pass**
   - Retrieve similar approved answers for open-ended or repetitive questions.
3. **Job-aware draft pass**
   - Use profile facts, resume content, memory hits, and current job description to draft missing answers.
4. **Confidence scoring pass**
   - Mark whether the answer is safe to fill automatically or should be reviewed carefully.

Rules:

- Direct personal facts should be preferred over generated text.
- Generated answers must not invent hard facts such as degrees, visa status, years of experience, or employer history.
- If a question cannot be answered safely from profile facts, memory, or clear job context, the system should leave it blank and mark it as unresolved.

### 4. Resume Recommendation and Upload

The local service should recommend the best resume variant for the detected job.

Behavior:

- Match resume variants using tags such as backend, frontend, full-stack, data, internship, or seniority.
- Return the preferred resume path for the extension to upload.
- If no resume is a strong match, use the default resume.

The first version should support selecting from existing local resume files. It does not need to generate a new PDF before every fill.

### 5. Learning

Learning is explicit and memory-based.

Rules:

- Save only answers the user reviewed or explicitly accepted.
- Save the normalized question plus context so similar future questions can be matched.
- Never update canonical profile facts based on page content alone.
- Allow the user to inspect, edit, and delete learned answers in the local UI.

Similarity behavior:

- Prefer exact or near-exact matches on normalized question text.
- Use role and company context as ranking hints, not hard filters.
- Avoid reusing a past answer when job context or answer constraints clearly differ.

### 6. Review Experience

The extension UI should show:

- Total required fields found
- Number filled
- Fields needing review
- Source and confidence per answer
- Resume file chosen

The user should be able to:

- Trigger autofill
- Review changed fields
- Approve learning from final edited answers
- Re-run autofill after changing profile or resumes

## Safety and Trust Boundaries

- Never auto-submit a form.
- Never silently overwrite user-entered values unless the user requested autofill for that page.
- Never store or transmit data outside the local machine in the first version, except the configured LLM call if the user chooses a remote model provider.
- Treat the local service as the only trusted owner of profile facts and learning history.
- Treat page content as untrusted input.

## Error Handling

### Extension Errors

- If the local service is offline, show a clear reconnect state and do not attempt partial AI filling.
- If a field cannot be filled because the site uses a custom widget, mark the field as manual review required.
- If DOM changes invalidate a field reference during fill, rescan the form and retry once.

### Service Errors

- If the LLM request fails, return direct profile answers plus unresolved markers for generated answers.
- If memory retrieval fails, continue with profile data and job-aware drafting.
- If the job description is missing or noisy, return lower confidence rather than fabricated specificity.

### User Data Errors

- If a required profile fact is missing, highlight the missing fact in the extension UI and local UI.
- If the preferred resume file is missing, fall back to the default resume or leave upload manual.

## Privacy and Security

- Store all structured data locally.
- Bind the local service to loopback only.
- Require the extension to talk only to the loopback API.
- Keep API keys in the local service configuration, not in the extension.
- Sanitize page text before storing long-term so tracking tokens and irrelevant noise are minimized.

## Technology Direction

The design does not lock the implementation, but it assumes:

- Chrome extension using Manifest V3
- Local service implemented with a lightweight web server
- SQLite for persistence
- A pluggable LLM provider interface so the user can configure one provider later

## Testing Strategy

### Extension Tests

- Field extraction unit tests using saved HTML fixtures from common job form patterns.
- Fill behavior tests for text inputs, selects, radios, checkboxes, textareas, and common custom widgets.
- End-to-end browser tests against fixture pages that simulate application forms.

### Local Service Tests

- Unit tests for field classification, question normalization, memory retrieval, and confidence scoring.
- Integration tests for `FillRequest` to `FillResponse` flows using mocked LLM outputs.
- Persistence tests covering profile updates, memory saves, and resume recommendations.

### Acceptance Tests

- A fixture application with deterministic fields is filled correctly from profile facts.
- An open-ended question is drafted using job description context and flagged for review.
- A user-edited answer is saved and reused on a later similar application.
- The system never submits a form.

## MVP Boundaries

To keep planning focused, the MVP should include:

- One Chrome extension
- One local service
- Local profile management
- Resume file selection
- Generic form detection
- Confidence-based autofill
- Manual review workflow
- Explicit local learning from approved answers

The MVP should exclude:

- Cloud accounts
- Multi-user support
- Resume generation pipelines
- Automatic site login
- Automatic submission
- Agentic navigation across multi-page applications

## Open Design Decisions Resolved

- Chrome only for the first version.
- Local-only data storage.
- Best-effort support across arbitrary job forms rather than a single-site-only strategy.
- Fill and review only, never auto-submit.
- Learning through approved answer memory, not model retraining.
- Local service preferred over extension-only AI architecture.

## Planning Readiness

This spec is ready for implementation planning as a single product with two bounded subsystems:

- Browser-side extraction and fill orchestration
- Local-side profile, memory, and answer generation

These subsystems communicate through a narrow API and can be planned independently while still shipping as one local-first workflow.
