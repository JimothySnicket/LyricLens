# Song Summary Schema

What goes into the summary that gets embedded for conceptual search.

## Purpose

The summary describes what a song IS — not what it says. It lives in the same semantic space as user queries like "sad rock from the 90s" or "upbeat party music."

## Available Fields

We already have these per song:

| Field | Example | Source |
|-------|---------|--------|
| title | "Everybody Hurts" | Kaggle dataset |
| artist | "R.E.M." | Kaggle dataset |
| genre | "Alternative Rock" | Jamie's classification |
| year | 1993 | Kaggle dataset |
| decade | 1990 | Derived |
| chart_position | 12 | Kaggle dataset |
| emotions.sadness | 0.95 | DistilRoBERTa classifier |
| emotions.joy | 0.01 | DistilRoBERTa classifier |
| emotions.anger | 0.02 | DistilRoBERTa classifier |
| emotions.fear | 0.01 | DistilRoBERTa classifier |
| emotions.surprise | 0.00 | DistilRoBERTa classifier |
| emotions.neutral | 0.01 | DistilRoBERTa classifier |
| emotions.disgust | 0.00 | DistilRoBERTa classifier |
| lyrics | full text | Genius via Kaggle |
| album | "Automatic for the People" | Kaggle dataset |

## What we DON'T have (and might want)

- Themes (love, loss, freedom, rebellion, party, heartbreak...)
- Vibe/energy description (slow ballad, driving anthem, groovy funk...)
- What the song is "about" in plain language
- Cultural context (protest song, wedding song, road trip anthem...)

## Open Questions

1. What should the summary text look like?
2. Which fields go in vs. get left out?
3. Should themes be a separate classification pass, or generated inline?
4. How long should the summary be? (MiniLM has 512 token limit)
5. Should it be structured/templated or natural language?

## What the summary should capture

Things the lyrics DON'T tell you about a song:

- **Genre/style** — "funk-infused disco", "jangly indie rock"
- **Mood/emotion** — "melancholy, bittersweet", "euphoric, triumphant"
- **Vibe/energy** — "slow ballad", "driving anthem", "groovy dancefloor"
- **Cultural context** — "protest song", "wedding classic", "road trip anthem"
- **Era feel** — "70s soul warmth", "80s synth-pop sheen", "gritty 90s grunge"

Things the summary should NOT include (already covered by other search paths):
- Title or artist name (keyword search handles this)
- Lyric quotes or specific words from the song (lyric embedding handles this)

## Prompt

```
Describe this song's genre, mood, vibe, and cultural context in 2-3 sentences.
Do NOT mention the title, artist name, or quote any lyrics.
Focus on how the song FEELS — its energy, emotional tone, musical style, and the kind of moment or setting it fits.
Write as if describing it to someone picking music for a playlist.

Context:
- Genre: {genre}
- Year: {year}
- Top emotions detected: {top 3 emotions with scores}
- Lyrics excerpt: {first 300 chars of lyrics}
```

## Example outputs

**Input:** "Everybody Hurts" by R.E.M., Alternative Rock, 1993, sadness: 0.95
**Output:** A slow, stripped-back 90s alternative ballad drenched in melancholy. Gentle and compassionate in tone, built for quiet moments of emotional weight. The kind of song that fits a rainy drive home or a late-night reflection.

**Input:** "Jump" by Van Halen, Rock/Pop, 1984, joy: 0.82
**Output:** High-energy 80s arena rock with bright synth hooks and an infectious, triumphant feel. Unapologetically upbeat and anthemic — pure confidence and fun. A stadium singalong, gym playlist staple, or montage soundtrack.

**Input:** "Gangsta's Paradise" by Coolio, Hip-Hop, 1995, fear: 0.71
**Output:** Dark, brooding 90s hip-hop with an ominous orchestral sample. Heavy and reflective, dealing with street life and existential dread. Cinematic and intense — fits a late-night mood or a film soundtrack.
