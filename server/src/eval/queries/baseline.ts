export interface EvalQuery {
  query: string;
  category: string;
  expected: string[];
}

export interface RawEvalQuery {
  query: string;
  category: string;
  expected: [title: string, artist: string][];
}

export const baselineQueriesRaw: RawEvalQuery[] = [
  // --- Specific title lookups ---
  {
    query: "songs with love in the title",
    category: "specific_lookup",
    expected: [
      ["Love Me Tender", "Elvis"],
      ["Baby Love", "Supremes"],
      ["All You Need Is Love", "Beatles"],
      ["Everlasting Love", ""],
      ["Where Did Our Love Go", "Supremes"],
    ],
  },
  {
    query: "songs with heart in the title",
    category: "specific_lookup",
    expected: [
      ["Cold, Cold Heart", "Tony Bennett"],
      ["Heartbreak Hotel", "Elvis"],
      ["Broken Hearted Melody", ""],
      ["Heart of Gold", "Neil Young"],
    ],
  },
  {
    query: "songs with moon in the title",
    category: "specific_lookup",
    expected: [
      ["Blue Moon", "Elvis"],
      ["Walking On The Moon", "The Police"],
      ["Fly Me to the Moon", ""],
    ],
  },
  {
    query: "songs with night in the title",
    category: "specific_lookup",
    expected: [
      ["Let's Spend The Night Together", "Rolling Stones"],
      ["All Night Long", ""],
      ["Goodnight", ""],
    ],
  },
  // --- Artist lookups ---
  {
    query: "songs by Elvis Presley",
    category: "artist_lookup",
    expected: [
      ["Heartbreak Hotel", "Elvis"],
      ["Jailhouse Rock", "Elvis"],
      ["Blue Suede Shoes", "Elvis"],
      ["Love Me Tender", "Elvis"],
      ["Suspicious Minds", "Elvis"],
    ],
  },
  {
    query: "songs by Michael Jackson",
    category: "artist_lookup",
    expected: [
      ["Black Or White", "Michael Jackson"],
      ["Heal The World", "Michael Jackson"],
      ["Off The Wall", "Michael Jackson"],
      ["Dirty Diana", "Michael Jackson"],
    ],
  },
  {
    query: "songs by ABBA",
    category: "artist_lookup",
    expected: [
      ["Waterloo", "ABBA"],
      ["The Winner Takes It All", "ABBA"],
      ["Chiquitita", "ABBA"],
      ["Money, Money, Money", "ABBA"],
    ],
  },
  {
    query: "songs by Queen",
    category: "artist_lookup",
    expected: [
      ["Somebody To Love", "Queen"],
      ["We Are The Champions", "Queen"],
      ["Radio Ga Ga", "Queen"],
      ["You're My Best Friend", "Queen"],
    ],
  },
  {
    query: "songs by The Rolling Stones",
    category: "artist_lookup",
    expected: [
      ["Start Me Up", "Rolling Stones"],
      ["Let's Spend The Night Together", "Rolling Stones"],
      ["The Last Time", "Rolling Stones"],
    ],
  },
  // --- Conceptual / thematic ---
  {
    query: "songs about heartbreak",
    category: "conceptual",
    expected: [
      ["Heartbreak Hotel", "Elvis"],
      ["Broken Hearted Melody", ""],
      ["How Can You Mend A Broken Heart", "Bee Gees"],
      ["It's A Heartache", "Bonnie Tyler"],
      ["Cold, Cold Heart", "Tony Bennett"],
    ],
  },
  {
    query: "sad songs",
    category: "conceptual",
    expected: [
      ["Hello", "Lionel Richie"],
      ["Skyfall", "Adele"],
      ["Jar Of Hearts", "Christina Perri"],
      ["Three Times A Lady", "Commodores"],
      ["The Reason", "Hoobastank"],
    ],
  },
  {
    query: "songs about loneliness and missing someone",
    category: "conceptual",
    expected: [
      ["Only The Lonely", "Roy Orbison"],
      ["So Lonely", "The Police"],
      ["Hello", "Lionel Richie"],
      ["Missing You", ""],
    ],
  },
  {
    query: "songs about freedom and rebellion",
    category: "conceptual",
    expected: [
      ["American Idiot", "Green Day"],
      ["Born To Run", ""],
      ["Jailhouse Rock", "Elvis"],
      ["Roll With It", "Oasis"],
    ],
  },
  {
    query: "songs about faith and hope",
    category: "conceptual",
    expected: [
      ["Heal The World", "Michael Jackson"],
      ["Spirit In The Sky", "Norman Greenbaum"],
      ["I Have A Dream", "ABBA"],
      ["Let It Be", "Beatles"],
    ],
  },
  {
    query: "songs about war and conflict",
    category: "conceptual",
    expected: [
      ["Buffalo Soldier", "Bob Marley"],
      ["Two Minutes To Midnight", "Iron Maiden"],
      ["Invisible Sun", "The Police"],
      ["American Idiot", "Green Day"],
    ],
  },
  // --- Decade-specific ---
  {
    query: "rock from the 80s",
    category: "decade_specific",
    expected: [
      ["Don't Stand So Close To Me", "The Police"],
      ["Start Me Up", "Rolling Stones"],
      ["Radio Ga Ga", "Queen"],
      ["Goody Two Shoes", "Adam Ant"],
      ["You Better You Bet", "The Who"],
    ],
  },
  {
    query: "jazz from the 50s",
    category: "decade_specific",
    expected: [
      ["Cold, Cold Heart", "Tony Bennett"],
      ["Pretend", "Nat King Cole"],
      ["Kiss", "Dean Martin"],
      ["Memories Are Made Of This", "Dean Martin"],
    ],
  },
  {
    query: "pop from the 90s",
    category: "decade_specific",
    expected: [
      ["Fantasy", "Mariah Carey"],
      ["Black Or White", "Michael Jackson"],
      ["Blue Savannah", "Erasure"],
      ["The Shoop Shoop Song", "Cher"],
    ],
  },
  {
    query: "rock from the 70s",
    category: "decade_specific",
    expected: [
      ["Let It Be", "Beatles"],
      ["Spirit In The Sky", "Norman Greenbaum"],
      ["Heart Of Gold", "Neil Young"],
      ["25 Or 6 To 4", "Chicago"],
    ],
  },
  {
    query: "pop songs from the 60s",
    category: "decade_specific",
    expected: [
      ["All You Need Is Love", "Beatles"],
      ["Baby Love", "Supremes"],
      ["Stop! In The Name Of Love", "Supremes"],
      ["Mr Tambourine Man", "The Byrds"],
    ],
  },
  {
    query: "music from the 2000s",
    category: "decade_specific",
    expected: [
      ["American Idiot", "Green Day"],
      ["Hollaback Girl", "Gwen Stefani"],
      ["The Reason", "Hoobastank"],
      ["Milkshake", "Kelis"],
    ],
  },
  // --- Mood-based ---
  {
    query: "upbeat dance music",
    category: "mood_based",
    expected: [
      ["Buffalo Soldier", "Bob Marley"],
      ["Hollaback Girl", "Gwen Stefani"],
      ["Milkshake", "Kelis"],
      ["Disco Inferno", "50 Cent"],
    ],
  },
  {
    query: "romantic songs",
    category: "mood_based",
    expected: [
      ["Have You Ever Really Loved A Woman?", "Bryan Adams"],
      ["When A Man Loves A Woman", ""],
      ["Fantasy", "Mariah Carey"],
      ["I'll Be Loving You (Forever)", "New Kids"],
    ],
  },
  {
    query: "energetic rock songs",
    category: "mood_based",
    expected: [
      ["American Idiot", "Green Day"],
      ["You Could Be Mine", "Guns N' Roses"],
      ["Holy Smoke", "Iron Maiden"],
      ["Roll With It", "Oasis"],
    ],
  },
  {
    query: "slow acoustic songs",
    category: "mood_based",
    expected: [
      ["Hello", "Lionel Richie"],
      ["Three Times A Lady", "Commodores"],
      ["Jar Of Hearts", "Christina Perri"],
      ["Bedshaped", "Keane"],
    ],
  },
  // --- Atmosphere ---
  {
    query: "driving at night music",
    category: "atmosphere",
    expected: [
      ["All Night Long", ""],
      ["Let's Spend The Night Together", "Rolling Stones"],
      ["Suspicious Minds", "Elvis"],
      ["Running Up That Hill", ""],
    ],
  },
  {
    query: "summer party music",
    category: "atmosphere",
    expected: [
      ["Hollaback Girl", "Gwen Stefani"],
      ["Waterloo", "ABBA"],
      ["Buffalo Soldier", "Bob Marley"],
      ["Disco Inferno", "50 Cent"],
    ],
  },
  // --- Genre-specific ---
  {
    query: "reggae songs",
    category: "genre_specific",
    expected: [
      ["Buffalo Soldier", "Bob Marley"],
      ["Everything I Own", "Ken Boothe"],
      ["Don't Break My Heart", "UB40"],
      ["Please Don't Make Me Cry", "UB40"],
    ],
  },
  {
    query: "blues songs",
    category: "genre_specific",
    expected: [
      ["Heartbreak Hotel", "Elvis"],
      ["Blue Suede Shoes", "Elvis"],
      ["Blue Moon", "Elvis"],
    ],
  },
  // --- Mixed / compound ---
  {
    query: "romantic pop from the 90s",
    category: "mixed",
    expected: [
      ["Have You Ever Really Loved A Woman?", "Bryan Adams"],
      ["Fantasy", "Mariah Carey"],
      ["The Shoop Shoop Song", "Cher"],
      ["When A Man Loves A Woman", "Michael Bolton"],
    ],
  },
  {
    query: "sad rock songs",
    category: "mixed",
    expected: [
      ["Stop Crying Your Heart Out", "Oasis"],
      ["Bedshaped", "Keane"],
      ["The Reason", "Hoobastank"],
      ["It's A Heartache", "Bonnie Tyler"],
    ],
  },
  {
    query: "upbeat pop from the 80s",
    category: "mixed",
    expected: [
      ["You Came", "Kim Wilde"],
      ["Suedehead", "Morrissey"],
      ["Goody Two Shoes", "Adam Ant"],
      ["The Winner Takes It All", "ABBA"],
    ],
  },
];
