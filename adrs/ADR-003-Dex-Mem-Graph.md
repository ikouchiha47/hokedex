
# ADR-003: Dex Memory Graph Architecture

## Status

Proposed

---

# Context

ADR-001 established local-first recognition and collection management.

ADR-002 generalized collections into category-specific entries and introduced:

* category-scoped embeddings
* local-first storage
* public publishing
* device identity
* restore workflows

During further product exploration, a more fundamental observation emerged:

Users do not actually care about collections.

Users care about memories.

Collections are merely one way of organizing memories.

Research into travel journaling products suggests that users derive value primarily from:

* preserving experiences
* revisiting meaningful moments
* sharing stories
* creating life archives

rather than from tracking itself.

Dex therefore evolves from:

"Collection-first"

to

"Memory-first"

while retaining recognition and collection capabilities.

---

# Decision

The primary domain entity becomes:

Moment

instead of:

Entry

Entries become derived entities that organize and connect Moments.

---

# New Domain Model

## Moment

A Moment represents a captured experience.

Examples:

* meeting a person
* discovering a restaurant
* seeing a bird
* reading a book
* attending an event
* taking a trip

A Moment may contain:

* photos
* audio
* transcript
* location
* timestamp
* AI-generated metadata

Moments are immutable records of experience.

---

## Entry

Entries become reusable knowledge objects.

Examples:

Person:
John

Place:
Kyoto

Animal:
Golden Retriever

Book:
The Pragmatic Programmer

Food:
Ramen

Entries are referenced by Moments.

Multiple Moments may link to the same Entry.

---

## Relationship

Moment
↓
MomentEntry
↓
Entry

Examples:

Moment #551
"Found hidden ramen shop"

Links:

* Kyoto
* Ramen
* John

Moment #721
"Returned to same ramen shop"

Links:

* Kyoto
* Ramen
* Sarah

The Ramen Entry accumulates history across Moments.

---

# Core Principle

Capture Once

Organize Forever

Users should never manually organize content beyond capture.

All structure emerges later.

---

# Capture Flow

Photo

↓

Optional Voice

↓

Save

Target capture time:

Less than 10 seconds.

---

# Voice Strategy

Voice becomes the preferred annotation mechanism.

Reasoning:

* lower friction than typing
* captures emotion
* preserves context
* naturally creates searchable transcripts

Voice is optional.

Text remains supported.

---

# AI Responsibilities

AI is organizational.

AI is not creative.

AI must not fabricate memories.

Allowed:

* transcription
* summarization
* tagging
* linking
* clustering
* semantic search

Not allowed:

* invented stories
* invented emotions
* invented participants

---

# Memory Graph

Moments and Entries form a graph.

Example:

John
↓
Trip To Kyoto
↓
Ramen Shop
↓
Food Collection

The graph is continuously enriched.

---

# Collections Become Views

Collections are no longer primary storage constructs.

Collections become queries over the memory graph.

Examples:

TravelDex

SELECT Moments
WHERE linked_entry.type = PLACE

FoodDex

SELECT Moments
WHERE linked_entry.type = FOOD

PeopleDex

SELECT Moments
WHERE linked_entry.type = PERSON

BookDex

SELECT Moments
WHERE linked_entry.type = BOOK

The same memory can appear in multiple collections simultaneously.

---

# Recognition Layer

ADR-002 recognition architecture remains unchanged.

Category-specific ML pipelines continue to operate.

Recognition creates or links Entries.

Recognition never creates Moments.

Moment creation remains user-driven.

---

# Search

Hybrid Search

Keyword Search
+
Semantic Search
+
Graph Traversal

Examples:

"Show me moments with John"

"Show me Japanese food discoveries"

"Show me places I visited twice"

"Show me conversations about startups"

---

# Relive System

The platform periodically resurfaces memories.

Examples:

One year ago today

Similar moment

Most revisited memories

Favorite discoveries

Relive becomes a primary retention mechanism.

---

# Publishing

Public profiles evolve from:

Collection Pages

to:

Memory Albums

Users choose:

* entries
* moments
* collections

for publication.

Public pages remain static and generated on-device.

ADR-002 identity architecture remains unchanged.

---

# Storage Model

## Moment

id
timestamp
location
summary

## Photo

id
moment_id

## Audio

id
moment_id

## Transcript

id
moment_id

## Entry

id
type
name

## MomentEntry

moment_id
entry_id

## Embedding

entry_id
vector

---

# Consequences

Positive

* Supports every future Dex category
* Enables memory-centric experiences
* Preserves existing recognition architecture
* Allows AI-assisted organization
* Creates long-term retention loops

Negative

* Graph complexity increases
* Search becomes more sophisticated
* More metadata processing required

Accepted.
