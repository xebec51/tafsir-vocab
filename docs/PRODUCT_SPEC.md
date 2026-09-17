# TafsirVocab — Product Specification

## Target learner
A Qur'an memorizer preparing for English Tafsir competition who needs fast, direct lexical access from Qur'anic Arabic to English.

## Course hierarchy

Juz → Page Unit → Lesson → Exercise → Review

For Juz 14:
- 20 page units
- each page split into micro-lessons of approximately 5–7 target words
- page test unlocks page mastery

## Mastery states
- NEW
- LEARNING
- FAMILIAR
- STRONG
- MASTERED

## Recommended promotion logic
- NEW → LEARNING after first exposure
- LEARNING → FAMILIAR after multiple correct answers across at least 2 exercise types
- FAMILIAR → STRONG after successful delayed review
- STRONG → MASTERED after successful recall/context review at a longer interval

A wrong delayed recall should reduce scheduling confidence without necessarily resetting all progress.

## Exercise difficulty ladder
1. reveal card
2. 4-option MCQ
3. 3-option MCQ
4. English → Arabic recognition
5. matching
6. contextual MCQ
7. open typing recall
8. short phrase translation
9. oral explanation

## Tafsir-specific feature
The course should distinguish:
- lexical gloss
- contextual meaning
- explanatory English

Example:

`الذِّكْر`

Lexical gloss:
`remembrance / reminder`

Contextual label in 15:9:
`the Reminder`, referring to the Qur'an.

Tafsir explanation:
A learner should eventually be able to explain why the term is translated contextually rather than merely reciting a dictionary gloss.

## Avoid
- memorizing Indonesian first
- marking alternate valid English translations as automatically wrong
- treating every surface word-form as an entirely new vocabulary item
- overloading the first lesson with morphology
- rewarding only recognition; productive recall matters most for competition


## Lexeme vs occurrence

Progress is tracked at the **Lexeme** level, while context questions can reference the exact **WordOccurrence**. This avoids treating every conjugated/prefixed form as an unrelated memorization item.
