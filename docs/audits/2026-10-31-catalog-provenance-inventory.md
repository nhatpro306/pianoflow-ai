# PianoFlow Catalog Provenance & Harmonic Integrity Audit

**Audit Date:** 2026-10-31  
**Catalog Size:** 1033 pieces  
**Auditor:** CODER Sub-Agent / Automated Verification Kernel  
**Status:** ALL CHECKS PASSED — HARMONIC PARSER REMEDIATED  

---

## 1. Executive Summary

| Metric | Count | % of Catalog | Status |
| :--- | :--- | :--- | :--- |
| **Total Catalog Repertoire** | **1033** | 100.0% | Active |
| **Bespoke Landmark Pieces** (`FULL_SONG_GENERATOR_REGISTRY`) | **64** | 6.2% | Verified Diatonic |
| **Procedural Motif Repertoire** (`createMotifSong`) | **969** | 93.8% | Remediated Diatonic |
| **Pieces Affected by Major/Minor Bug** | **534** | 51.7% | **100% Corrected** |

> [!IMPORTANT]
> **Root Cause of Major/Minor Bug:**
> In `apps/web/lib/songs/motifGenerator.ts`, `getKeyRootPitch` previously checked `typePart.startsWith("m") || typePart.includes("min")`.
> Because `"maj"` and `"major"` also begin with `"m"`, every major key specifying `"maj"` or `"major"` (e.g., `"C maj"`, `"D Major"`, `"Eb major"`) was mistakenly assigned `isMinor = true`.
>
> **The Fix:**
> `getKeyRootPitch` now explicitly checks:
> 1. `if (typePart.startsWith("maj")) isMinor = false;`
> 2. `else if (typePart.startsWith("min") || typePart === "m") isMinor = true;`
> 3. Handles standalone compact notation like `"Am"` where `"m"` is part of the note token.
>
> All **534** affected pieces have been re-verified to generate correct major tonality with pristine harmonic intervals.

---

## 2. Provenance & Impact by Genre

| Genre | Total Pieces | Bespoke Landmark | Procedural Motif | Affected by Major/Minor Bug |
| :--- | :---: | :---: | :---: | :---: |
| **Classical** | 185 | 16 | 169 | 94 |
| **Anime & Ghibli** | 190 | 14 | 176 | 87 |
| **K-Pop** | 167 | 9 | 158 | 64 |
| **Modern & Pop** | 163 | 12 | 151 | 101 |
| **Cinematic & Game** | 166 | 10 | 156 | 74 |
| **Jazz & Lo-Fi** | 162 | 3 | 159 | 114 |

---

## 3. Provenance & Impact by Difficulty

| Difficulty Level | Total Pieces | Bespoke Landmark | Procedural Motif | Affected by Major/Minor Bug |
| :--- | :---: | :---: | :---: | :---: |
| **Intermediate** | 478 | 23 | 455 | 251 |
| **Master** | 236 | 13 | 223 | 74 |
| **Beginner** | 319 | 28 | 291 | 209 |

---

## 4. Detailed Inventory of Remediated Pieces (534 Songs)

The following procedural songs had explicit major key strings (e.g., `"C maj"`, `"D Major"`, `"Eb major"`) and were previously forced into minor chords. They are now restored to authentic major harmony:

| Song ID | Title | Artist / Composer | Genre | Key | Notes | Duration |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| `pathetique-2nd` | Pathétique Sonata (2nd Mvt - Adagio Cantabile) | Ludwig van Beethoven | Classical | **Ab maj** | 1008 | 6:07 |
| `minute-waltz` | Minute Waltz, Op. 64 No. 1 | Frédéric Chopin | Classical | **Db maj** | 1028 | 2:32 |
| `raindrop-prelude` | Raindrop Prelude, Op. 28 No. 15 | Frédéric Chopin | Classical | **Db maj** | 1096 | 6:03 |
| `etude-tristesse` | Étude Op. 10 No. 3 (Tristesse) | Frédéric Chopin | Classical | **E maj** | 984 | 5:17 |
| `air-on-g-string` | Air on the G String | Johann Sebastian Bach | Classical | **D maj** | 1140 | 7:25 |
| `jesu-joy-of-mans-desiring` | Jesu, Joy of Man's Desiring | Johann Sebastian Bach | Classical | **G maj** | 1140 | 5:46 |
| `bach-invention-1` | Invention No. 1 in C Major, BWV 772 | Johann Sebastian Bach | Classical | **C maj** | 1116 | 4:14 |
| `eine-kleine-nachtmusik` | Eine kleine Nachtmusik, K. 525 | Wolfgang Amadeus Mozart | Classical | **G maj** | 776 | 2:05 |
| `sonata-facile-k545` | Piano Sonata No. 16 in C Major (K. 545) | Wolfgang Amadeus Mozart | Classical | **C maj** | 1096 | 3:19 |
| `twinkle-variations-k265` | Twinkle, Twinkle Variations (K. 265) | Wolfgang Amadeus Mozart | Classical | **C maj** | 876 | 3:04 |
| `deuxieme-arabesque` | Deuxième Arabesque | Claude Debussy | Classical | **G maj** | 1380 | 4:29 |
| `debussy-reverie` | Rêverie | Claude Debussy | Classical | **F maj** | 1072 | 5:56 |
| `girl-with-flaxen-hair` | The Girl with the Flaxen Hair | Claude Debussy | Classical | **Gb maj** | 767 | 5:17 |
| `gymnopedie-2` | Gymnopédie No. 2 | Erik Satie | Classical | **C maj** | 564 | 3:35 |
| `liebestraum-no-3` | Liebestraum No. 3 in A-flat Major | Franz Liszt | Classical | **Ab maj** | 1424 | 7:13 |
| `rachmaninoff-paganini-var18` | Rhapsody on a Theme of Paganini (18th Var.) | Sergei Rachmaninoff | Classical | **Db maj** | 796 | 5:29 |
| `schubert-ave-maria` | Ave Maria, D. 839 | Franz Schubert | Classical | **Bb maj** | 896 | 5:51 |
| `vivaldi-spring` | Spring (The Four Seasons, Op. 8 No. 1) | Antonio Vivaldi | Classical | **E maj** | 896 | 2:58 |
| `brahms-lullaby` | Lullaby (Wiegenlied, Op. 49 No. 4) | Johannes Brahms | Classical | **Eb maj** | 638 | 3:23 |
| `bach-invention-8` | Two-Part Invention No. 8 in F Major, BWV 779 | Johann Sebastian Bach | Classical | **F maj** | 812 | 2:47 |
| `bach-minuet-g-major` | Minuet in G Major, BWV Anh. 114 | Christian Petzold / J.S. Bach (Notebook for Anna Magdalena) | Classical | **G maj** | 622 | 2:13 |
| `bach-goldberg-aria` | Goldberg Variations: Aria, BWV 988 | Johann Sebastian Bach | Classical | **G maj** | 767 | 5:53 |
| `mozart-sonata-facile-andante` | Sonata No. 16 in C Major: II. Andante, K. 545 | Wolfgang Amadeus Mozart | Classical | **G maj** | 593 | 3:36 |
| `mozart-sonata-facile-rondo` | Sonata No. 16 in C Major: III. Rondo, K. 545 | Wolfgang Amadeus Mozart | Classical | **C maj** | 1140 | 3:09 |
| `mozart-concerto-21-andante` | Piano Concerto No. 21: II. Andante ('Elvira Madigan'), K. 467 | Wolfgang Amadeus Mozart | Classical | **F maj** | 1096 | 6:14 |
| `mozart-twinkle-variations` | 12 Variations on 'Ah vous dirai-je, Maman' (Twinkle), K. 265 | Wolfgang Amadeus Mozart | Classical | **C maj** | 1072 | 3:33 |
| `beethoven-moonlight-allegretto` | Moonlight Sonata: II. Allegretto, Op. 27 No. 2 | Ludwig van Beethoven | Classical | **Db maj** | 758 | 2:27 |
| `beethoven-waldstein-allegro` | Sonata No. 21 in C Major 'Waldstein': I. Allegro con brio, Op. 53 | Ludwig van Beethoven | Classical | **C maj** | 1360 | 3:26 |
| `beethoven-ecossaises` | Six Écossaises in E-flat Major, WoO 83 | Ludwig van Beethoven | Classical | **Eb maj** | 744 | 2:05 |
| `chopin-nocturne-b-major` | Nocturne in B Major, Op. 9 No. 3 | Frédéric Chopin | Classical | **B maj** | 1052 | 4:21 |
| `chopin-grande-valse-brillante` | Grande Valse Brillante in E-flat Major, Op. 18 | Frédéric Chopin | Classical | **Eb maj** | 970 | 2:13 |
| `chopin-etude-tristesse` | Étude in E Major 'Tristesse', Op. 10 No. 3 | Frédéric Chopin | Classical | **E maj** | 1008 | 5:34 |
| `chopin-aeolian-harp` | Étude in A-flat Major 'Aeolian Harp', Op. 25 No. 1 | Frédéric Chopin | Classical | **Ab maj** | 1380 | 5:14 |
| `chopin-heroic-polonaise` | Polonaise in A-flat Major 'Heroic', Op. 53 | Frédéric Chopin | Classical | **Ab maj** | 986 | 3:55 |
| `chopin-berceuse` | Berceuse in D-flat Major, Op. 57 | Frédéric Chopin | Classical | **Db maj** | 1008 | 5:06 |
| `debussy-arabesque-2` | Deuxième Arabesque (Second Arabesque in G Major) | Claude Debussy | Classical | **G maj** | 984 | 2:59 |
| `debussy-golliwoggs-cakewalk` | Golliwogg's Cakewalk (from Children's Corner) | Claude Debussy | Classical | **Eb maj** | 964 | 3:02 |
| `debussy-pagodes` | Pagodes (from Estampes) | Claude Debussy | Classical | **B maj** | 1316 | 5:59 |
| `debussy-reflets-dans-leau` | Reflets dans l'eau (from Images Book I) | Claude Debussy | Classical | **Db maj** | 957 | 2:44 |
| `satie-gymnopedie-2` | Gymnopédie No. 2 | Erik Satie | Classical | **C maj** | 580 | 3:44 |
| `satie-je-te-veux` | Je te veux (Valse pour piano) | Erik Satie | Classical | **C maj** | 738 | 2:14 |
| `liszt-hungarian-rhapsody-2` | Hungarian Rhapsody No. 2 (Friska Theme) | Franz Liszt | Classical | **F# maj** | 1292 | 3:11 |
| `liszt-un-sospiro` | Un Sospiro (Concert Étude No. 3 in D-flat Major) | Franz Liszt | Classical | **Db maj** | 1380 | 6:37 |
| `liszt-consolation-3` | Consolation No. 3 in D-flat Major | Franz Liszt | Classical | **Db maj** | 1008 | 5:56 |
| `tchaikovsky-pas-de-deux` | Nutcracker: Pas de Deux (Piano Transcription) | Pyotr Ilyich Tchaikovsky | Classical | **G maj** | 1380 | 6:59 |
| `schubert-impromptu-g-flat` | Impromptu in G-flat Major, Op. 90 No. 3 (D. 899) | Franz Schubert | Classical | **Gb maj** | 1116 | 5:59 |
| `bach-goldberg-var-1` | Goldberg Variations: Variation 1 (BWV 988) | Johann Sebastian Bach | Classical | **G maj** | 941 | 3:44 |
| `bach-cello-suite-1-prelude` | Cello Suite No. 1: Prelude (BWV 1007, Piano Arr.) | Johann Sebastian Bach | Classical | **G maj** | 1096 | 5:15 |
| `bach-italian-concerto-1st` | Italian Concerto in F Major: 1st Mvt (BWV 971) | Johann Sebastian Bach | Classical | **F maj** | 1404 | 4:44 |
| `bach-wtc-prelude-d-major` | Well-Tempered Clavier: Prelude No. 5 in D Major (BWV 850) | Johann Sebastian Bach | Classical | **D maj** | 1072 | 3:29 |
| `bach-french-suite-5-gigue` | French Suite No. 5 in G Major: Gigue (BWV 816) | Johann Sebastian Bach | Classical | **G maj** | 1072 | 3:09 |
| `bach-wachet-auf-ruft-uns` | Sleepers, Wake! / Wachet auf, ruft uns die Stimme (BWV 645) | Johann Sebastian Bach / Busoni | Classical | **Eb maj** | 1028 | 5:41 |
| `mozart-sonata-11-andante-grazioso` | Piano Sonata No. 11 in A Major: 1st Mvt (K. 331) | Wolfgang Amadeus Mozart | Classical | **A maj** | 1008 | 3:59 |
| `mozart-sonata-16-andante` | Piano Sonata No. 16 'Facile': 2nd Mvt (Andante, K. 545) | Wolfgang Amadeus Mozart | Classical | **G maj** | 651 | 4:29 |
| `mozart-concerto-20-romance-bb` | Piano Concerto No. 20 in D Minor: 2nd Mvt Romance (K. 466) | Wolfgang Amadeus Mozart | Classical | **Bb maj** | 1008 | 5:06 |
| `mozart-sonata-10-c-major` | Piano Sonata No. 10 in C Major: 1st Mvt (K. 330) | Wolfgang Amadeus Mozart | Classical | **C maj** | 1052 | 3:18 |
| `mozart-sonata-12-f-major` | Piano Sonata No. 12 in F Major: 1st Mvt (K. 332) | Wolfgang Amadeus Mozart | Classical | **F maj** | 767 | 2:31 |
| `mozart-rondo-d-major-k485` | Rondo in D Major (K. 485) | Wolfgang Amadeus Mozart | Classical | **D maj** | 764 | 2:41 |
| `beethoven-pastoral-sonata-1st` | Pastoral Sonata: 1st Mvt Allegro (Op. 28) | Ludwig van Beethoven | Classical | **D maj** | 754 | 2:35 |
| `beethoven-rage-over-lost-penny` | Rondo a Capriccio 'Rage Over a Lost Penny' (Op. 129) | Ludwig van Beethoven | Classical | **G maj** | 1316 | 3:04 |
| `beethoven-emperor-concerto-adagio` | Piano Concerto No. 5 'Emperor': 2nd Mvt Adagio (Op. 73) | Ludwig van Beethoven | Classical | **B maj** | 1008 | 7:21 |
| `beethoven-sonata-les-adieux` | Piano Sonata No. 26 'Les Adieux': 1st Mvt (Op. 81a) | Ludwig van Beethoven | Classical | **Eb maj** | 1404 | 4:24 |
| `chopin-nocturne-db-major-op27-no2` | Nocturne in D-flat Major, Op. 27 No. 2 | Frédéric Chopin | Classical | **Db maj** | 1316 | 9:35 |
| `chopin-waltz-brillante-op34-no1` | Valse Brillante in A-flat Major, Op. 34 No. 1 | Frédéric Chopin | Classical | **Ab maj** | 999 | 2:27 |
| `chopin-waltz-ab-major-op69-no1` | Waltz in A-flat Major 'Farewell', Op. 69 No. 1 | Frédéric Chopin | Classical | **Ab maj** | 593 | 2:21 |
| `chopin-prelude-d-major-op28-no5` | Prelude in D Major, Op. 28 No. 5 | Frédéric Chopin | Classical | **D maj** | 1334 | 2:05 |
| `chopin-prelude-f-sharp-op28-no13` | Prelude in F-sharp Major, Op. 28 No. 13 | Frédéric Chopin | Classical | **F# maj** | 1008 | 6:20 |
| `chopin-etude-black-keys-op10` | Etude in G-flat Major 'Black Keys', Op. 10 No. 5 | Frédéric Chopin | Classical | **Gb maj** | 1292 | 3:16 |
| `chopin-etude-butterfly-op25-no9` | Etude in G-flat Major 'Butterfly', Op. 25 No. 9 | Frédéric Chopin | Classical | **Gb maj** | 840 | 3:28 |
| `chopin-etude-harp-op10-no1` | Etude in C Major 'Waterfall', Op. 10 No. 1 | Frédéric Chopin | Classical | **C maj** | 1316 | 2:59 |
| `chopin-polonaise-military-op40` | Polonaise in A Major 'Military', Op. 40 No. 1 | Frédéric Chopin | Classical | **A maj** | 738 | 3:11 |
| `chopin-barcarolle-f-sharp-major` | Barcarolle in F-sharp Major, Op. 60 | Frédéric Chopin | Classical | **F# maj** | 1292 | 7:51 |
| `liszt-mephisto-waltz-no1` | Mephisto Waltz No. 1 (Der Tanz in der Dorfschenke) | Franz Liszt | Classical | **A maj** | 1514 | 1:57 |
| `liszt-transcendental-etude-harmonies` | Transcendental Etude No. 11 'Harmonies du Soir' | Franz Liszt | Classical | **Db maj** | 1424 | 7:38 |
| `liszt-sonata-b-minor-theme` | Piano Sonata in B Minor: Grandioso Theme | Franz Liszt | Classical | **D maj** | 1380 | 5:14 |
| `liszt-valse-oubliée-no1` | Valse Oubliée No. 1 (Forgotten Waltz) | Franz Liszt | Classical | **F# maj** | 796 | 2:17 |
| `schubert-impromptu-e-flat-op90` | Impromptu in E-flat Major, Op. 90 No. 2 (D. 899) | Franz Schubert | Classical | **Eb maj** | 754 | 2:09 |
| `schubert-impromptu-a-flat-op90` | Impromptu in A-flat Major, Op. 90 No. 4 (D. 899) | Franz Schubert | Classical | **Ab maj** | 783 | 2:27 |
| `schubert-die-forelle-trout` | Die Forelle / The Trout (Piano Transcription) | Franz Schubert / Liszt | Classical | **Db maj** | 1072 | 3:46 |
| `schumann-widmung-dedication-liszt` | Widmung / Dedication (Schumann / Liszt) | Robert Schumann / Franz Liszt | Classical | **Ab maj** | 1336 | 6:05 |
| `schumann-fantasie-c-major-1st` | Fantasie in C Major: 1st Mvt (Op. 17) | Robert Schumann | Classical | **C maj** | 1336 | 5:32 |
| `schumann-carnaval-chopin` | Carnaval: Chopin (Op. 9 No. 12) | Robert Schumann | Classical | **Ab maj** | 832 | 4:36 |
| `brahms-intermezzo-a-major-op118-no2` | Intermezzo in A Major, Op. 118 No. 2 | Johannes Brahms | Classical | **A maj** | 709 | 5:04 |
| `brahms-intermezzo-eb-major-op117` | Intermezzo in E-flat Major, Op. 117 No. 1 | Johannes Brahms | Classical | **Eb maj** | 1028 | 7:13 |
| `brahms-waltz-ab-major-op39-no15` | Waltz in A-flat Major, Op. 39 No. 15 | Johannes Brahms | Classical | **Ab maj** | 564 | 2:20 |
| `tchaikovsky-waltz-of-the-flowers` | The Nutcracker: Waltz of the Flowers | Pyotr Ilyich Tchaikovsky | Classical | **D maj** | 812 | 2:23 |
| `tchaikovsky-sleeping-beauty-waltz` | The Sleeping Beauty: Garland Waltz (Act I) | Pyotr Ilyich Tchaikovsky / Rachmaninoff | Classical | **Bb maj** | 796 | 2:13 |
| `rachmaninoff-concerto-2-adagio-theme` | Piano Concerto No. 2: 2nd Mvt Adagio Theme | Sergei Rachmaninoff | Classical | **E maj** | 984 | 6:55 |
| `debussy-la-cathedrale-engloutie` | The Sunken Cathedral / La Cathédrale Engloutie | Claude Debussy | Classical | **C maj** | 964 | 7:38 |
| `ravel-pavane-pour-infante-defunte` | Pavane pour une infante défunte | Maurice Ravel | Classical | **G maj** | 1116 | 7:33 |
| `ravel-jeux-deau-fountains` | Jeux d'eau (The River God / Water Games) | Maurice Ravel | Classical | **E maj** | 1424 | 5:54 |
| `grieg-morning-mood-peer-gynt` | Morning Mood (Peer Gynt Suite No. 1, Op. 46) | Edvard Grieg | Classical | **E maj** | 788 | 4:47 |
| `silhouette-naruto` | Silhouette | KANA-BOON (Naruto Shippuden OP 16) | Anime & Ghibli | **Ab maj** | 1008 | 2:06 |
| `wind-naruto` | Wind | Akeboshi (Naruto ED 1) | Anime & Ghibli | **F maj** | 852 | 3:59 |
| `akuma-no-ko` | Akuma no Ko (A Child of Evil) | Ai Higuchi (Attack on Titan Final Season) | Anime & Ghibli | **Eb maj** | 1008 | 4:43 |
| `always-with-me` | Always With Me (Itsumo Nando Demo) | Youmi Kimura (Spirited Away) | Anime & Ghibli | **F maj** | 580 | 2:13 |
| `legend-of-ashitaka` | The Legend of Ashitaka | Joe Hisaishi (Princess Mononoke) | Anime & Ghibli | **Eb maj** | 1140 | 5:46 |
| `we-are-one-piece` | We Are! | Hiroshi Kitadani (One Piece OP 1) | Anime & Ghibli | **G maj** | 1116 | 2:25 |
| `binks-sake` | Binks' Sake | Kohei Tanaka (One Piece) | Anime & Ghibli | **A maj** | 896 | 3:09 |
| `memories-one-piece` | Memories | Maki Otsuki (One Piece ED 1) | Anime & Ghibli | **D maj** | 764 | 3:10 |
| `ao-no-sumika` | Ao no Sumika (Where Our Blue Is) | Tatsuya Kitani (Jujutsu Kaisen: Hidden Inventory) | Anime & Ghibli | **E maj** | 1116 | 2:47 |
| `mixed-nuts` | Mixed Nuts | Official HIGE DANdism (Spy x Family OP 1) | Anime & Ghibli | **Eb maj** | 1424 | 3:27 |
| `comedy-spy-family` | Comedy | Gen Hoshino (Spy x Family ED 1) | Anime & Ghibli | **Ab maj** | 788 | 2:49 |
| `dango-daikazoku` | Dango Daikazoku | Jun Maeda (Clannad) | Anime & Ghibli | **C maj** | 580 | 3:09 |
| `secret-base-anohana` | Secret Base (Kimi ga Kureta Mono) | ZONE / Anohana Ending | Anime & Ghibli | **Gb maj** | 744 | 3:05 |
| `watashi-no-uso` | Watashi no Uso (My Lie) | Masaru Yokoyama (Your Lie in April) | Anime & Ghibli | **A maj** | 1140 | 5:46 |
| `violet-evergarden-theme` | Theme of Violet Evergarden | Evan Call (Violet Evergarden) | Anime & Ghibli | **D maj** | 825 | 4:53 |
| `michishirube` | Michishirube (Signpost) | Minori Chihara (Violet Evergarden ED) | Anime & Ghibli | **F maj** | 744 | 3:40 |
| `grand-escape` | Grand Escape | Radwimps ft. Toko Miura (Weathering With You) | Anime & Ghibli | **C maj** | 1052 | 3:29 |
| `anytime-anywhere-frieren` | Anytime Anywhere | milet (Frieren: Beyond Journey's End) | Anime & Ghibli | **Ab maj** | 984 | 4:44 |
| `bliss-frieren` | Bliss | milet (Frieren: Beyond Journey's End) | Anime & Ghibli | **Eb maj** | 876 | 4:42 |
| `ao-no-sumika-jujutsu` | Ao no Sumika (Where Our Blue Is) | Tatsuya Kitani (Jujutsu Kaisen: Hidden Inventory) | Anime & Ghibli | **E maj** | 984 | 2:20 |
| `akari-jujutsu-kaisen` | Akari (Light) | Soushi Sakiyama (Jujutsu Kaisen) | Anime & Ghibli | **G maj** | 744 | 3:40 |
| `chu-tayousei-chainsaw` | Chu, Tayousei. | ano (Chainsaw Man ED 7) | Anime & Ghibli | **F maj** | 1008 | 2:47 |
| `sign-wa-b-oshi-no-ko` | Sign wa B | B-Komachi (Oshi no Ko) | Anime & Ghibli | **D maj** | 920 | 2:05 |
| `zankyosanka-demon-slayer` | Zankyosanka | Aimer (Demon Slayer: Entertainment District) | Anime & Ghibli | **Ab maj** | 1272 | 2:41 |
| `akuma-no-ko-aot` | Akuma no Ko (A Child of Evil) | Ai Higuchi (Attack on Titan: The Final Season) | Anime & Ghibli | **Ab maj** | 1116 | 5:13 |
| `call-of-silence-aot` | Call of Silence | Hiroyuki Sawano (Attack on Titan Season 2) | Anime & Ghibli | **Db maj** | 808 | 4:06 |
| `orange-shigatsu` | Orange | 7!! (Your Lie in April ED 2) | Anime & Ghibli | **Eb maj** | 1096 | 4:59 |
| `yuunagi-your-lie` | Yuunagi (Evening Calm) | Masaru Yokoyama (Your Lie in April) | Anime & Ghibli | **C maj** | 852 | 4:47 |
| `kirameki-shigatsu` | Kirameki (Sparkle) | wacci (Your Lie in April ED 1) | Anime & Ghibli | **F maj** | 896 | 3:48 |
| `again-shigatsu` | Again | Masaru Yokoyama (Your Lie in April) | Anime & Ghibli | **G maj** | 984 | 3:54 |
| `komm-susser-tod` | Komm, süsser Tod (Come, Sweet Death) | Shiro Sagisu (The End of Evangelion) | Anime & Ghibli | **C maj** | 1096 | 5:07 |
| `one-last-kiss-evangelion` | One Last Kiss | Hikaru Utada (Evangelion: 3.0+1.0 Thrice Upon a Time) | Anime & Ghibli | **E maj** | 1072 | 3:09 |
| `hotaru-no-hikari` | Hotaru no Hikari (Glow of a Firefly) | Ikimonogakari (Naruto Shippuden OP 5) | Anime & Ghibli | **Bb maj** | 808 | 2:06 |
| `unlasting-sao` | Unlasting | LiSA (Sword Art Online: Alicization) | Anime & Ghibli | **Bb maj** | 876 | 4:42 |
| `courage-sao` | Courage | Haruka Tomatsu (Sword Art Online II: Mother's Rosario) | Anime & Ghibli | **D maj** | 1052 | 2:17 |
| `uso-fma` | Uso (Lie) | SID (Fullmetal Alchemist: Brotherhood ED 1) | Anime & Ghibli | **D maj** | 788 | 2:18 |
| `departure-hunter` | Departure! | Masatoshi Ono (Hunter x Hunter 2011) | Anime & Ghibli | **E maj** | 984 | 2:07 |
| `michishirube-violet` | Michishirube (Guidepost) | Minori Chihara (Violet Evergarden) | Anime & Ghibli | **G maj** | 764 | 3:59 |
| `guitar-loneliness-bocchi` | Guitar, Loneliness and Blue Planet | Kessoku Band (Bocchi the Rock!) | Anime & Ghibli | **A maj** | 1336 | 2:34 |
| `mixed-nuts-spy-family` | Mixed Nuts | Official HIGE DANdism (Spy x Family OP 1) | Anime & Ghibli | **Eb maj** | 1448 | 3:31 |
| `ghibli-castle-in-the-sky-pigeons` | Pigeons and a Boy (Castle in the Sky) | Joe Hisaishi (Studio Ghibli) | Anime & Ghibli | **Bb maj** | 896 | 3:24 |
| `ghibli-totoro-my-neighbor` | My Neighbor Totoro (Main Theme Song) | Joe Hisaishi (Studio Ghibli) | Anime & Ghibli | **F maj** | 808 | 2:18 |
| `ghibli-totoro-hey-lets-go-sanpo` | Hey Let's Go / Sanpo (My Neighbor Totoro) | Joe Hisaishi (Studio Ghibli) | Anime & Ghibli | **C maj** | 852 | 2:35 |
| `ghibli-ponyo-on-the-cliff` | Ponyo on the Cliff by the Sea (Main Theme) | Joe Hisaishi (Studio Ghibli) | Anime & Ghibli | **F maj** | 920 | 2:32 |
| `ghibli-kiki-starting-the-job` | Starting the Job / Bread Factory (Kiki's Delivery) | Joe Hisaishi (Studio Ghibli) | Anime & Ghibli | **G maj** | 764 | 2:24 |
| `ghibli-kiki-on-a-clear-day` | On a Clear Day (Kiki's Delivery Service) | Joe Hisaishi (Studio Ghibli) | Anime & Ghibli | **C maj** | 984 | 3:19 |
| `ghibli-kiki-rouge-no-dengon` | Message of Rouge / Rouge no Dengon (Kiki's Delivery) | Yumi Arai / Joe Hisaishi | Anime & Ghibli | **Eb maj** | 1052 | 2:44 |
| `ghibli-sixth-station-train` | The Sixth Station / Train Ride (Spirited Away) | Joe Hisaishi (Studio Ghibli) | Anime & Ghibli | **C maj** | 920 | 5:05 |
| `ghibli-princess-kaguya-life` | When I Remember This Life (Princess Kaguya) | Kazumi Nikaido (Princess Kaguya) | Anime & Ghibli | **F maj** | 667 | 3:49 |
| `ghibli-whisper-heart-country-roads` | Country Roads (Take Me Home - Whisper of the Heart) | Yuji Nomi / Bill Danoff | Anime & Ghibli | **A maj** | 896 | 2:58 |
| `shinkai-kanata-haluka-suzume` | Kanata Haluka (Suzume feat. RADWIMPS) | Yojiro Noda / RADWIMPS (Suzume) | Anime & Ghibli | **C maj** | 1072 | 5:09 |
| `shinkai-tamaki-suzume-theme` | Tamaki's Theme (Suzume feat. RADWIMPS) | Kazuma Jinnouchi & RADWIMPS | Anime & Ghibli | **Eb maj** | 832 | 4:28 |
| `shinkai-is-there-still-anything-love` | Is There Still Anything That Love Can Do? (Tenki no Ko) | Yojiro Noda / RADWIMPS | Anime & Ghibli | **Db maj** | 1028 | 5:04 |
| `shinkai-we-will-be-alright-tenki` | We'll Be Alright / Daijoubu (Weathering with You) | Yojiro Noda / RADWIMPS | Anime & Ghibli | **F# maj** | 1140 | 5:19 |
| `shinkai-one-more-time-5cm` | One More Time, One More Chance (5cm per Second) | Masayoshi Yamazaki (5cm per Second) | Anime & Ghibli | **C maj** | 1052 | 5:03 |
| `shinkai-rain-garden-of-words` | Rain (Garden of Words / Motohiro Hata) | Senri Oe / Motohiro Hata | Anime & Ghibli | **Ab maj** | 1072 | 4:27 |
| `shinkai-yumetourou-your-name` | Dream Lantern / Yumetourou (Your Name) | Yojiro Noda / RADWIMPS | Anime & Ghibli | **B maj** | 984 | 2:05 |
| `shinkai-date-your-name` | Date (Your Name feat. RADWIMPS) | Yojiro Noda / RADWIMPS | Anime & Ghibli | **E maj** | 920 | 2:59 |
| `shinkai-first-view-tokyo-mitsuha` | First View of Tokyo (Your Name feat. RADWIMPS) | Yojiro Noda / RADWIMPS | Anime & Ghibli | **A maj** | 832 | 2:31 |
| `shinkai-mitsuhas-theme` | Mitsuha's Theme (Your Name feat. RADWIMPS) | Yojiro Noda / RADWIMPS | Anime & Ghibli | **Gb maj** | 1140 | 5:56 |
| `aot-red-swan-yoshiki-hyde` | Red Swan (Attack on Titan Season 3 / YOSHIKI feat. HYDE) | YOSHIKI (X Japan) feat. HYDE | Anime & Ghibli | **D maj** | 1140 | 5:19 |
| `jjk-more-than-words-hitsujibungaku` | more than words (JJK Shibuya Incident) | Moeka Shiotsuka (Hitsujibungaku) | Anime & Ghibli | **Ab maj** | 764 | 3:24 |
| `frieren-the-journey-continues-evans` | The Journey Continues (Frieren: Beyond Journey's End) | Evan Call (Frieren) | Anime & Ghibli | **D maj** | 622 | 3:34 |
| `frieren-time-flows-peacefully` | Time Flows Peacefully (Evan Call / Frieren) | Evan Call (Frieren) | Anime & Ghibli | **G maj** | 744 | 4:14 |
| `frieren-himmels-courage` | Himmel the Hero's Courage (Evan Call / Frieren) | Evan Call (Frieren) | Anime & Ghibli | **A maj** | 1028 | 4:41 |
| `oshi-no-ko-burning-b-komachi` | POP IN 2 / B-Komachi (Oshi no Ko) | Takuro Iga (Oshi no Ko) | Anime & Ghibli | **C maj** | 852 | 2:23 |
| `chainsaw-man-time-left-zutto-mayonaka` | Time Left (Chainsaw Man / ZUTOMAYO) | ACA-Ne (ZUTOMAYO) | Anime & Ghibli | **Ab maj** | 1404 | 3:42 |
| `spy-family-souvenir-bump-of-chicken` | SOUVENIR (Spy x Family / BUMP OF CHICKEN) | Motoo Fujiwara (BUMP OF CHICKEN) | Anime & Ghibli | **D maj** | 1096 | 3:13 |
| `spy-family-shikaku-unmei` | Shikaku Unmei / Square Destiny (Spy x Family) | Makoto Miyazaki (Spy x Family) | Anime & Ghibli | **G maj** | 788 | 2:39 |
| `bocchi-rock-seishun-complex` | Seishun Complex (Bocchi the Rock!) | Otoha / Kessoku Band | Anime & Ghibli | **E maj** | 1424 | 2:44 |
| `bocchi-rock-if-i-could-be-a-constellation` | If I Could Be a Constellation (Bocchi the Rock!) | Hidemasa Naito (Kessoku Band) | Anime & Ghibli | **A maj** | 1008 | 3:03 |
| `bocchi-rock-distorsion-kessoku` | Distortion!! (Bocchi the Rock! / Kessoku Band) | Maguro Taniguchi (KANA-BOON) | Anime & Ghibli | **D maj** | 1096 | 2:25 |
| `violet-evergarden-theme-of-sincerely` | Sincerely (Violet Evergarden / TRUE) | Shota Horie / TRUE | Anime & Ghibli | **Bb maj** | 1072 | 4:53 |
| `violet-evergarden-across-the-violet-sky` | Across the Violet Sky (Evan Call) | Evan Call (Violet Evergarden) | Anime & Ghibli | **F maj** | 551 | 3:27 |
| `your-lie-in-april-hikarunara-goose` | Hikaru Nara: Acoustic Grand Piano Solo | Goose house (Your Lie in April) | Anime & Ghibli | **Ab maj** | 824 | 2:56 |
| `your-lie-in-april-watashi-no-uso-full` | Watashi no Uso / My Lie (Masaru Yokoyama) | Masaru Yokoyama (Your Lie in April) | Anime & Ghibli | **C maj** | 560 | 4:55 |
| `your-lie-in-april-again-piano` | Again / Kaori & Kousei Piano Duet Theme | Masaru Yokoyama (Your Lie in April) | Anime & Ghibli | **Eb maj** | 728 | 5:37 |
| `evangelion-voyager-date-without-gravestones` | Voyager: Gravestone-less Date (Shin Evangelion) | Yumi Matsutoya (Evangelion 3.0+1.0) | Anime & Ghibli | **Eb maj** | 1116 | 5:39 |
| `bleach-here-to-stay-shirou-sagisu` | Here to Stay (Bleach OST / Shiro Sagisu) | Shiro Sagisu (Bleach) | Anime & Ghibli | **G maj** | 896 | 4:41 |
| `one-piece-brand-new-world` | Brand New World (One Piece OP 6 / D-51) | D-51 (One Piece Enies Lobby) | Anime & Ghibli | **E maj** | 984 | 2:18 |
| `one-piece-fight-together-amuro` | Fight Together (One Piece / Namie Amuro) | Nao'ymt / Namie Amuro | Anime & Ghibli | **Bb maj** | 984 | 2:59 |
| `hunter-x-hunter-nagareboshi-gin` | Nagareboshi Kirari (Hunter x Hunter / Yuzu) | Kenichi Maeyamada / Yuzu (Chimera Ant) | Anime & Ghibli | **G maj** | 896 | 4:18 |
| `hunter-x-hunter-reason-yuzu` | Reason (Hunter x Hunter Greed Island / Yuzu) | Kenichi Maeyamada / Yuzu (HxH) | Anime & Ghibli | **E maj** | 1096 | 3:01 |
| `code-geass-continued-story-hitomi` | Continued Story (Code Geass R2 Climax) | Hitomi Kuroishi (Code Geass) | Anime & Ghibli | **C maj** | 1140 | 5:46 |
| `boy-with-luv-bts` | Boy With Luv (작은 것들을 위한 시) | BTS ft. Halsey | K-Pop | **G maj** | 644 | 3:03 |
| `life-goes-on-bts` | Life Goes On | BTS | K-Pop | **C maj** | 476 | 3:18 |
| `sweet-night-v` | Sweet Night (Itaewon Class OST) | V (BTS) | K-Pop | **G maj** | 476 | 3:40 |
| `euphoria-jungkook` | Euphoria | BTS (Jung Kook) | K-Pop | **F maj** | 616 | 2:44 |
| `seven-jungkook` | Seven (feat. Latto) | Jung Kook | K-Pop | **B maj** | 728 | 3:19 |
| `stay-blackpink` | Stay | BLACKPINK | K-Pop | **A maj** | 488 | 2:41 |
| `lovesick-girls-blackpink` | Lovesick Girls | BLACKPINK | K-Pop | **Ab maj** | 684 | 3:03 |
| `as-if-its-your-last` | As If It's Your Last (마지막처럼) | BLACKPINK | K-Pop | **Ab maj** | 684 | 3:08 |
| `on-the-ground-rose` | On The Ground | Rosé (BLACKPINK) | K-Pop | **C maj** | 684 | 3:06 |
| `through-the-night-iu` | Through the Night (밤편지) | IU | K-Pop | **Eb maj** | 516 | 3:47 |
| `love-poem-iu` | Love Poem | IU | K-Pop | **D maj** | 644 | 5:39 |
| `blueming-iu` | Blueming | IU | K-Pop | **G maj** | 672 | 3:15 |
| `eight-iu-suga` | Eight (feat. SUGA of BTS) | IU ft. SUGA | K-Pop | **F# maj** | 656 | 3:07 |
| `celebrity-iu` | Celebrity | IU | K-Pop | **A maj** | 616 | 3:31 |
| `what-is-love-twice` | What is Love? | TWICE | K-Pop | **Ab maj** | 700 | 3:11 |
| `feel-special-ballad-twice` | Feel Special (Ballad Ver.) | TWICE | K-Pop | **Eb maj** | 504 | 3:59 |
| `tt-twice` | TT | TWICE | K-Pop | **F maj** | 672 | 2:57 |
| `miracles-in-december-exo` | Miracles in December (12월의 기적) | EXO | K-Pop | **Db maj** | 488 | 4:06 |
| `after-like-ive` | After LIKE | IVE | K-Pop | **A maj** | 644 | 2:56 |
| `perfect-night-le-sserafim` | Perfect Night | LE SSERAFIM | K-Pop | **Eb maj** | 504 | 2:42 |
| `psycho-red-velvet` | Psycho | Red Velvet | K-Pop | **Ab maj** | 616 | 2:30 |
| `if-you-bigbang` | If You | BIGBANG | K-Pop | **G maj** | 488 | 3:46 |
| `fine-taeyeon` | Fine | Taeyeon (Girls' Generation) | K-Pop | **C maj** | 684 | 5:01 |
| `love-wins-all-iu` | Love wins all | IU | K-Pop | **Ab maj** | 616 | 4:53 |
| `good-day-iu` | Good Day (좋은 날) | IU | K-Pop | **A maj** | 852 | 3:48 |
| `palette-iu-gdragon` | Palette (feat. G-DRAGON) | IU | K-Pop | **A maj** | 588 | 3:21 |
| `spicy-aespa` | Spicy | aespa | K-Pop | **E maj** | 532 | 2:25 |
| `off-the-record-ive` | Off The Record | IVE | K-Pop | **A maj** | 504 | 2:59 |
| `cool-with-you-newjeans` | Cool With You | NewJeans | K-Pop | **Bb maj** | 496 | 2:06 |
| `eta-newjeans` | ETA | NewJeans | K-Pop | **Db maj** | 672 | 2:50 |
| `how-sweet-newjeans` | How Sweet | NewJeans | K-Pop | **Ab maj** | 728 | 3:46 |
| `get-up-newjeans` | Get Up | NewJeans | K-Pop | **Eb maj** | 504 | 4:25 |
| `fate-gidle` | Fate (나는 아픈 건 딱 질색이니까) | (G)I-DLE | K-Pop | **C maj** | 712 | 2:54 |
| `very-nice-seventeen` | VERY NICE (아주 NICE) | SEVENTEEN (WOOZI) | K-Pop | **Bb maj** | 684 | 3:08 |
| `rock-with-you-seventeen` | Rock with you | SEVENTEEN (WOOZI) | K-Pop | **D maj** | 728 | 2:55 |
| `polaroid-love-enhypen` | Polaroid Love | ENHYPEN | K-Pop | **C maj** | 560 | 3:54 |
| `sugar-rush-ride-txt` | Sugar Rush Ride | TOMORROW X TOGETHER | K-Pop | **A maj** | 644 | 2:56 |
| `blue-hour-txt` | Blue Hour (5시 53분의 하늘에서 발견한 너와 나) | TOMORROW X TOGETHER | K-Pop | **C maj** | 560 | 2:32 |
| `love-119-riize` | Love 119 | RIIZE | K-Pop | **Eb maj** | 572 | 3:20 |
| `get-a-guitar-riize` | Get A Guitar | RIIZE | K-Pop | **F maj** | 684 | 3:33 |
| `bts-magic-shop` | Magic Shop (BTS) | Jungkook / Hiss noise / RM / SUGA / j-hope | K-Pop | **A maj** | 644 | 3:32 |
| `bts-stay-gold-journey` | Stay Gold (BTS - Map of the Soul: 7) | UTA / SUNNY BOY / Melanie Fontana | K-Pop | **D maj** | 544 | 2:56 |
| `bts-epiphany-jin-solo` | Epiphany (BTS Jin Solo) | Slow Rabbit / Bang Si-hyuk / Matt Thomson | K-Pop | **F maj** | 560 | 4:26 |
| `bts-serendipity-jimin` | Serendipity (BTS Jimin Solo) | Slow Rabbit / Ray Michael Djan Jr / RM | K-Pop | **Ab maj** | 728 | 4:57 |
| `bts-singularity-v` | Singularity (BTS V Solo) | Charlie J. Perry / RM | K-Pop | **Db maj** | 712 | 6:16 |
| `blackpink-dont-know-what-to-do` | Don't Know What To Do (BLACKPINK / TEDDY) | TEDDY / 24 / Brian Lee | K-Pop | **A maj** | 712 | 3:17 |
| `rose-apt-bruno-mars` | APT. (ROSÉ & Bruno Mars Global Hit) | ROSÉ / Bruno Mars / Omer Fedi | K-Pop | **E maj** | 544 | 2:06 |
| `newjeans-bubble-gum` | Bubble Gum (NewJeans) | 250 / Oscar Scheller (NewJeans) | K-Pop | **D maj** | 544 | 2:41 |
| `newjeans-cookie-debut` | Cookie (NewJeans Debut EP) | Jinsu Park / Ylva Dimberg | K-Pop | **C maj** | 488 | 2:19 |
| `ive-either-way-sunwoo-junga` | Either Way (IVE / Sunwoo Jung-a) | Sunwoo Jung-a / Ryan Jhun | K-Pop | **E maj** | 488 | 3:46 |
| `ive-lips-ive-ive` | Lips (IVE - I've IVE / Lauren Aquilina) | Lauren Aquilina / Ryan Jhun | K-Pop | **G maj** | 532 | 2:45 |
| `le-sserafim-sour-grapes` | Sour Grapes (LE SSERAFIM FEARLESS) | Score / Megatone / ABIR | K-Pop | **Bb maj** | 588 | 3:29 |
| `aespa-thirsty-my-world` | Thirsty (aespa MY WORLD EP) | Geek Boy Al Swettenham / Kyler Niko | K-Pop | **Db maj** | 504 | 3:03 |
| `aespa-dreams-come-true-ses` | Dreams Come True (aespa / BoA Remake) | Risto / Yoo Young-jin / BoA | K-Pop | **A maj** | 712 | 4:04 |
| `seventeen-darling-english-single` | Darl+ing (SEVENTEEN - Face the Sun) | Woozi / Bumzu / Shannon | K-Pop | **C maj** | 560 | 3:15 |
| `seventeen-circles-woozi-tribute` | Circles (SEVENTEEN - Sector 17) | Woozi / Bumzu (SEVENTEEN) | K-Pop | **Ab maj** | 572 | 4:18 |
| `txt-crown-debut-dream-chapter` | CROWN (TXT Debut Single) | Slow Rabbit / Melanie Fontana | K-Pop | **A maj** | 684 | 3:09 |
| `txt-0x1-lovesong-i-know-i-love-you` | 0X1=LOVESONG (I Know I Love You feat. Seori) | Slow Rabbit / RM / Derek 'Mod Sun' Smith | K-Pop | **Db maj** | 684 | 4:36 |
| `enhypen-shout-out-manifesto` | SHOUT OUT (ENHYPEN - MANIFESTO : DAY 1) | Jake / Waveshower / Justin Bieber collabs | K-Pop | **F# maj** | 628 | 2:25 |
| `itzy-sneakers-checkmate` | SNEAKERS (ITZY - CHECKMATE) | Didrik Thott / Jessica Pierpoint | K-Pop | **C maj** | 572 | 2:43 |
| `illit-magnetic-super-real-me` | Magnetic (ILLIT Debut Sensation 2024) | Slow Rabbit / Bang Si-hyuk / Salem Ilese | K-Pop | **Bb maj** | 488 | 2:08 |
| `illit-cherish-my-love` | Cherish (My Love) (ILLIT 2024) | Slow Rabbit / Bang Si-hyuk | K-Pop | **F maj** | 504 | 2:18 |
| `tws-plot-twist-first-meeting` | plot twist (TWS - Sparkling Blue Debut 2024) | Bumzu / Shannon / Jin Jeon | K-Pop | **D maj** | 476 | 2:05 |
| `may-be-yiruma` | May Be | Yiruma | Modern & Pop | **Bb maj** | 764 | 3:59 |
| `until-i-found-you` | Until I Found You | Stephen Sanchez | Modern & Pop | **Bb maj** | 516 | 2:57 |
| `perfect-ed-sheeran` | Perfect | Ed Sheeran | Modern & Pop | **Ab maj** | 504 | 3:01 |
| `photograph-ed-sheeran` | Photograph | Ed Sheeran | Modern & Pop | **E maj** | 572 | 3:02 |
| `easy-on-me-adele` | Easy On Me | Adele | Modern & Pop | **F maj** | 1028 | 5:22 |
| `fix-you-coldplay` | Fix You | Coldplay | Modern & Pop | **Eb maj** | 788 | 4:10 |
| `clocks-coldplay` | Clocks | Coldplay | Modern & Pop | **Eb maj** | 1008 | 2:48 |
| `viva-la-vida-coldplay` | Viva La Vida | Coldplay | Modern & Pop | **Ab maj** | 1028 | 2:43 |
| `ocean-eyes-billie` | Ocean Eyes | Billie Eilish (Finneas O'Connell) | Modern & Pop | **E maj** | 572 | 4:33 |
| `what-was-i-made-for` | What Was I Made For? | Billie Eilish (Barbie Movie) | Modern & Pop | **C maj** | 876 | 4:06 |
| `when-i-was-your-man` | When I Was Your Man | Bruno Mars | Modern & Pop | **C maj** | 728 | 5:41 |
| `just-the-way-you-are` | Just the Way You Are | Bruno Mars | Modern & Pop | **F maj** | 504 | 2:38 |
| `champagne-problems` | Champagne Problems | Taylor Swift | Modern & Pop | **C maj** | 476 | 3:09 |
| `exile-taylor-bon-iver` | Exile | Taylor Swift ft. Bon Iver | Modern & Pop | **F# maj** | 1028 | 4:56 |
| `drivers-license` | Drivers License | Olivia Rodrigo | Modern & Pop | **Bb maj** | 560 | 4:26 |
| `vampire-olivia-rodrigo` | Vampire | Olivia Rodrigo | Modern & Pop | **F maj** | 1292 | 3:25 |
| `someone-you-loved` | Someone You Loved | Lewis Capaldi | Modern & Pop | **Db maj** | 476 | 2:28 |
| `before-you-go` | Before You Go | Lewis Capaldi | Modern & Pop | **D maj** | 876 | 2:51 |
| `you-are-the-reason` | You Are The Reason | Calum Scott | Modern & Pop | **Bb maj** | 588 | 5:47 |
| `dont-stop-me-now` | Don't Stop Me Now | Queen | Modern & Pop | **F maj** | 1008 | 2:21 |
| `let-it-be-beatles` | Let It Be | The Beatles (Paul McCartney) | Modern & Pop | **C maj** | 832 | 4:16 |
| `hey-jude-beatles` | Hey Jude | The Beatles (Paul McCartney) | Modern & Pop | **F maj** | 896 | 4:25 |
| `rocket-man-elton-john` | Rocket Man | Elton John | Modern & Pop | **Bb maj** | 1028 | 5:31 |
| `your-song-elton-john` | Your Song | Elton John & Bernie Taupin | Modern & Pop | **Eb maj** | 1028 | 5:52 |
| `piano-man-billy-joel` | Piano Man | Billy Joel | Modern & Pop | **C maj** | 899 | 2:05 |
| `stay-with-me-sam-smith` | Stay With Me | Sam Smith | Modern & Pop | **C maj** | 744 | 3:14 |
| `a-thousand-years` | A Thousand Years | Christina Perri (Twilight) | Modern & Pop | **Bb maj** | 702 | 2:05 |
| `let-her-go-passenger` | Let Her Go | Passenger | Modern & Pop | **G maj** | 560 | 4:15 |
| `where-is-my-mind-piano` | Where Is My Mind? (Piano Cover) | Maxence Cyrin (Pixies Cover) | Modern & Pop | **E maj** | 1028 | 4:35 |
| `thousand-years-piano-guys` | A Thousand Years (Cello & Piano) | The Piano Guys | Modern & Pop | **C maj** | 767 | 2:17 |
| `birds-of-a-feather-billie` | Birds of a Feather | Billie Eilish & FINNEAS | Modern & Pop | **D maj** | 788 | 2:44 |
| `die-with-a-smile-bruno-gaga` | Die With A Smile | Lady Gaga & Bruno Mars | Modern & Pop | **Bb maj** | 1052 | 4:55 |
| `fortnight-taylor-post` | Fortnight | Taylor Swift feat. Post Malone | Modern & Pop | **B maj** | 788 | 2:59 |
| `cruel-summer-taylor` | Cruel Summer | Taylor Swift (Lover) | Modern & Pop | **A maj** | 644 | 2:09 |
| `champagne-problems-taylor` | Champagne Problems | Taylor Swift (Evermore) | Modern & Pop | **C maj** | 504 | 3:20 |
| `vampire-olivia` | Vampire | Olivia Rodrigo | Modern & Pop | **F maj** | 616 | 2:33 |
| `traitor-olivia` | Traitor | Olivia Rodrigo | Modern & Pop | **Eb maj** | 808 | 5:55 |
| `deja-vu-olivia` | Deja Vu | Olivia Rodrigo | Modern & Pop | **D maj** | 684 | 2:09 |
| `when-we-were-young-adele` | When We Were Young | Adele & Tobias Jesso Jr. | Modern & Pop | **Eb maj** | 984 | 4:59 |
| `make-you-feel-my-love-adele` | Make You Feel My Love | Bob Dylan / Adele | Modern & Pop | **Bb maj** | 896 | 4:25 |
| `castle-on-the-hill-sheeran` | Castle on the Hill | Ed Sheeran | Modern & Pop | **D maj** | 684 | 2:54 |
| `talking-to-the-moon-bruno` | Talking to the Moon | Bruno Mars | Modern & Pop | **E maj** | 476 | 3:43 |
| `leave-the-door-open-silk-sonic` | Leave the Door Open | Silk Sonic (Bruno Mars & Anderson .Paak) | Modern & Pop | **C maj** | 1292 | 6:22 |
| `yellow-coldplay` | Yellow | Coldplay (Parachutes) | Modern & Pop | **B maj** | 516 | 3:21 |
| `speed-of-sound-coldplay` | Speed of Sound | Coldplay (X&Y) | Modern & Pop | **A maj** | 1096 | 3:16 |
| `my-universe-coldplay-bts` | My Universe | Coldplay x BTS | Modern & Pop | **A maj** | 684 | 3:43 |
| `tiny-dancer-elton` | Tiny Dancer | Elton John & Bernie Taupin | Modern & Pop | **C maj** | 700 | 5:33 |
| `candle-in-the-wind-elton` | Candle in the Wind | Elton John & Bernie Taupin | Modern & Pop | **E maj** | 476 | 3:59 |
| `rocket-man-elton` | Rocket Man (I Think It's Going to Be a Long, Long Time) | Elton John & Bernie Taupin | Modern & Pop | **Bb maj** | 1140 | 6:06 |
| `vienna-billy-joel` | Vienna | Billy Joel (The Stranger) | Modern & Pop | **Bb maj** | 672 | 6:11 |
| `new-york-state-of-mind-joel` | New York State of Mind | Billy Joel | Modern & Pop | **C maj** | 1424 | 8:39 |
| `shes-always-a-woman-joel` | She's Always a Woman | Billy Joel | Modern & Pop | **Eb maj** | 890 | 2:05 |
| `just-the-way-you-are-joel` | Just the Way You Are | Billy Joel | Modern & Pop | **D maj** | 1140 | 5:37 |
| `dont-stop-me-now-queen` | Don't Stop Me Now | Freddie Mercury (Queen) | Modern & Pop | **F maj** | 1448 | 3:23 |
| `somebody-to-love-queen` | Somebody to Love | Freddie Mercury (Queen) | Modern & Pop | **Ab maj** | 984 | 3:16 |
| `blackbird-beatles` | Blackbird | Paul McCartney (The Beatles) | Modern & Pop | **G maj** | 622 | 2:44 |
| `here-comes-the-sun-beatles` | Here Comes the Sun | George Harrison (The Beatles) | Modern & Pop | **A maj** | 764 | 2:10 |
| `yesterday-beatles` | Yesterday | Paul McCartney (The Beatles) | Modern & Pop | **F maj** | 516 | 3:04 |
| `imagine-john-lennon` | Imagine | John Lennon | Modern & Pop | **C maj** | 544 | 4:06 |
| `as-it-was-harry-styles` | As It Was | Harry Styles | Modern & Pop | **A maj** | 996 | 2:05 |
| `sign-of-the-times-harry` | Sign of the Times | Harry Styles | Modern & Pop | **F maj** | 644 | 6:07 |
| `save-your-tears-weeknd` | Save Your Tears | The Weeknd & Max Martin | Modern & Pop | **C maj** | 744 | 2:18 |
| `im-not-the-only-one-sam` | I'm Not The Only One | Sam Smith | Modern & Pop | **F maj** | 1028 | 4:35 |
| `someone-you-loved-lewis` | Someone You Loved | Lewis Capaldi | Modern & Pop | **Db maj** | 876 | 2:54 |
| `before-you-go-lewis` | Before You Go | Lewis Capaldi | Modern & Pop | **D maj** | 672 | 3:25 |
| `if-i-aint-got-you-alicia` | If I Ain't Got You | Alicia Keys | Modern & Pop | **G maj** | 941 | 3:18 |
| `dancing-queen-abba` | Dancing Queen | ABBA (Benny Andersson & Björn Ulvaeus) | Modern & Pop | **A maj** | 1096 | 3:57 |
| `the-winner-takes-it-all-abba` | The Winner Takes It All | ABBA | Modern & Pop | **F# maj** | 656 | 2:59 |
| `memories-maroon-5` | Memories | Maroon 5 (Adam Levine) | Modern & Pop | **B maj** | 876 | 3:30 |
| `taylor-swift-anti-hero-midnights` | Anti-Hero (Taylor Swift - Midnights) | Taylor Swift & Jack Antonoff | Modern & Pop | **E maj** | 544 | 3:12 |
| `taylor-swift-blank-space-1989` | Blank Space (Taylor Swift - 1989) | Taylor Swift / Max Martin / Shellback | Modern & Pop | **F maj** | 544 | 3:14 |
| `taylor-swift-shake-it-off-1989` | Shake It Off (Taylor Swift - 1989) | Taylor Swift / Max Martin / Shellback | Modern & Pop | **G maj** | 984 | 2:14 |
| `taylor-swift-all-too-well-10-min` | All Too Well (Taylor Swift - Red) | Taylor Swift & Liz Rose | Modern & Pop | **C maj** | 1096 | 4:18 |
| `taylor-swift-lover-wedding-ballad` | Lover (Taylor Swift) | Taylor Swift / Jack Antonoff | Modern & Pop | **G maj** | 852 | 4:35 |
| `taylor-swift-august-folklore` | august (Taylor Swift - folklore) | Taylor Swift & Jack Antonoff | Modern & Pop | **D maj** | 1072 | 3:00 |
| `billie-eilish-happier-than-ever-rock` | Happier Than Ever: Rock Outro (Billie Eilish) | Billie Eilish & FINNEAS | Modern & Pop | **C maj** | 908 | 3:59 |
| `olivia-rodrigo-get-him-back-guts` | get him back! (Olivia Rodrigo - GUTS) | Olivia Rodrigo & Dan Nigro | Modern & Pop | **G maj** | 656 | 2:50 |
| `olivia-rodrigo-all-i-want-hsmtmts` | All I Want (Olivia Rodrigo) | Olivia Rodrigo | Modern & Pop | **Eb maj** | 588 | 4:39 |
| `bruno-mars-versace-on-the-floor` | Versace on the Floor (Bruno Mars) | Bruno Mars / Philip Lawrence / Brody Brown | Modern & Pop | **D maj** | 616 | 4:02 |
| `ed-sheeran-thinking-out-loud` | Thinking Out Loud (Ed Sheeran - Multiply) | Ed Sheeran & Amy Wadge | Modern & Pop | **D maj** | 572 | 4:09 |
| `ed-sheeran-galway-girl-celtic` | Galway Girl (Ed Sheeran - Divide) | Ed Sheeran / Amy Wadge / Beoga | Modern & Pop | **D maj** | 628 | 3:35 |
| `coldplay-paradise-mylo-xyloto` | Paradise (Coldplay - Mylo Xyloto) | Coldplay & Brian Eno | Modern & Pop | **F maj** | 1072 | 2:47 |
| `coldplay-trouble-piano-riff` | Trouble (Coldplay - Parachutes) | Coldplay | Modern & Pop | **G maj** | 832 | 4:20 |
| `coldplay-in-my-place-rush-of-blood` | In My Place (Coldplay) | Coldplay | Modern & Pop | **A maj** | 712 | 5:39 |
| `queen-bohemian-rhapsody-operatic` | Bohemian Rhapsody: Operatic Section (Queen) | Freddie Mercury (Queen) | Modern & Pop | **A maj** | 1336 | 3:23 |
| `queen-radio-ga-ga-roger-taylor` | Radio Ga Ga (Queen) | Roger Taylor (Queen) | Modern & Pop | **F maj** | 1072 | 3:29 |
| `queen-crazy-little-thing-called-love` | Crazy Little Thing Called Love (Queen) | Freddie Mercury (Queen) | Modern & Pop | **D maj** | 886 | 2:06 |
| `beatles-hey-jude-na-na-na-outro` | Hey Jude: Grand Na-Na-Na Outro (The Beatles) | John Lennon & Paul McCartney | Modern & Pop | **F maj** | 764 | 3:40 |
| `beatles-something-george-harrison` | Something (The Beatles - Abbey Road) | George Harrison (The Beatles) | Modern & Pop | **C maj** | 1028 | 5:41 |
| `beatles-in-my-life-rubber-soul` | In My Life (The Beatles - Rubber Soul) | John Lennon & Paul McCartney | Modern & Pop | **A maj** | 488 | 2:41 |
| `elton-john-bennie-and-the-jets` | Bennie and the Jets (Elton John) | Elton John & Bernie Taupin | Modern & Pop | **G maj** | 684 | 5:26 |
| `elton-john-goodbye-yellow-brick-road` | Goodbye Yellow Brick Road (Elton John) | Elton John & Bernie Taupin | Modern & Pop | **F maj** | 1116 | 3:20 |
| `elton-john-can-you-feel-the-love` | Can You Feel the Love Tonight (The Lion King) | Elton John & Tim Rice | Modern & Pop | **Bb maj** | 588 | 4:56 |
| `billy-joel-uptown-girl-an-innocent-man` | Uptown Girl (Billy Joel - An Innocent Man) | Billy Joel | Modern & Pop | **E maj** | 984 | 2:47 |
| `billy-joel-scenes-from-italian-restaurant` | Scenes from an Italian Restaurant (Billy Joel) | Billy Joel (The Stranger) | Modern & Pop | **F maj** | 812 | 3:13 |
| `lady-gaga-million-reasons-joanne` | Million Reasons (Lady Gaga - Joanne) | Lady Gaga / Hillary Lindsey / Mark Ronson | Modern & Pop | **C maj** | 876 | 4:59 |
| `lady-gaga-born-this-way-anthem` | Born This Way (Lady Gaga) | Lady Gaga & Jeppe Laursen | Modern & Pop | **F# maj** | 984 | 2:54 |
| `sam-smith-lay-me-down-acoustic` | Lay Me Down (Sam Smith) | Sam Smith / Jimmy Napes / Elvin Smith | Modern & Pop | **E maj** | 920 | 5:25 |
| `harry-styles-falling-piano-ballad` | Falling (Harry Styles - Fine Line) | Harry Styles & Kid Harpoon | Modern & Pop | **E maj** | 764 | 5:10 |
| `leonard-cohen-hallelujah-prayer` | Hallelujah (Leonard Cohen / Jeff Buckley) | Leonard Cohen | Modern & Pop | **C maj** | 808 | 5:55 |
| `rihanna-stay-mikky-ekko-acoustic` | Stay (Rihanna feat. Mikky Ekko) | Mikky Ekko & Justin Parker | Modern & Pop | **C maj** | 832 | 2:42 |
| `now-we-are-free-gladiator` | Now We Are Free | Hans Zimmer & Lisa Gerrard (Gladiator) | Cinematic & Game | **D maj** | 764 | 4:18 |
| `mia-and-sebastians-theme` | Mia & Sebastian's Theme | Justin Hurwitz (La La Land) | Cinematic & Game | **A maj** | 812 | 4:18 |
| `epilogue-la-la-land` | Epilogue | Justin Hurwitz (La La Land) | Cinematic & Game | **F maj** | 1404 | 4:15 |
| `my-heart-will-go-on` | My Heart Will Go On | James Horner (Titanic) | Cinematic & Game | **E maj** | 744 | 2:44 |
| `concerning-hobbits` | Concerning Hobbits | Howard Shore (Lord of the Rings) | Cinematic & Game | **D maj** | 896 | 3:16 |
| `the-shire-lotr` | The Shire (Fellowship Theme) | Howard Shore (Lord of the Rings) | Cinematic & Game | **G maj** | 1028 | 4:56 |
| `cinema-paradiso-love-theme` | Cinema Paradiso (Love Theme) | Ennio & Andrea Morricone | Cinematic & Game | **F maj** | 1052 | 5:59 |
| `zelda-main-theme` | The Legend of Zelda (Main Theme) | Koji Kondo | Cinematic & Game | **Bb maj** | 1008 | 2:37 |
| `zelda-botw-theme` | Breath of the Wild (Main Theme) | Manaka Kataoka (The Legend of Zelda) | Cinematic & Game | **C maj** | 1072 | 4:39 |
| `hopes-and-dreams-undertale` | Hopes and Dreams | Toby Fox (Undertale) | Cinematic & Game | **G maj** | 812 | 2:42 |
| `fallen-down-undertale` | Fallen Down | Toby Fox (Undertale) | Cinematic & Game | **D maj** | 481 | 2:05 |
| `wet-hands-minecraft` | Wet Hands | C418 (Minecraft) | Cinematic & Game | **A maj** | 808 | 4:33 |
| `sweden-minecraft` | Sweden | C418 (Minecraft) | Cinematic & Game | **D maj** | 764 | 4:39 |
| `subwoofer-lullaby` | Subwoofer Lullaby | C418 (Minecraft) | Cinematic & Game | **C maj** | 896 | 4:33 |
| `dire-dire-docks` | Dire, Dire Docks | Koji Kondo (Super Mario 64) | Cinematic & Game | **G maj** | 638 | 2:23 |
| `aeriths-theme` | Aerith's Theme | Nobuo Uematsu (Final Fantasy VII) | Cinematic & Game | **D maj** | 1008 | 5:06 |
| `main-theme-ffvii` | Main Theme of Final Fantasy VII | Nobuo Uematsu (Final Fantasy VII) | Cinematic & Game | **F maj** | 964 | 4:30 |
| `genshin-main-theme` | Genshin Impact (Main Theme) | Yu-Peng Chen (HOYO-MiX) | Cinematic & Game | **D maj** | 964 | 3:59 |
| `dawn-winery-theme` | Dawn Winery Theme | Yu-Peng Chen (HOYO-MiX) | Cinematic & Game | **C maj** | 564 | 2:07 |
| `liyue-theme-genshin` | Liyue Harbor Theme | Yu-Peng Chen (HOYO-MiX) | Cinematic & Game | **G maj** | 964 | 4:17 |
| `first-steps-celeste` | First Steps | Lena Raine (Celeste) | Cinematic & Game | **G maj** | 964 | 3:11 |
| `duet-omori` | Duet | Pedro Silva / OMORI | Cinematic & Game | **C maj** | 964 | 4:23 |
| `tennessee-pearl-harbor` | Tennessee | Hans Zimmer (Pearl Harbor) | Cinematic & Game | **F maj** | 744 | 4:14 |
| `star-wars-main-theme` | Star Wars: Main Title | John Williams | Cinematic & Game | **Bb maj** | 1336 | 4:31 |
| `jurassic-park-theme` | Theme from Jurassic Park | John Williams | Cinematic & Game | **Bb maj** | 964 | 5:10 |
| `raiders-march-indiana` | The Raiders March (Indiana Jones) | John Williams (Raiders of the Lost Ark) | Cinematic & Game | **C maj** | 1116 | 3:17 |
| `et-flying-theme` | Flying Theme (from E.T. the Extra-Terrestrial) | John Williams | Cinematic & Game | **C maj** | 1316 | 3:31 |
| `summer-kikujiro-hisaishi` | Summer (from Kikujiro) | Joe Hisaishi | Cinematic & Game | **D maj** | 852 | 2:26 |
| `playing-love-legend-1900` | Playing Love (from The Legend of 1900) | Ennio Morricone | Cinematic & Game | **F maj** | 1140 | 5:46 |
| `gabriels-oboe-the-mission` | Gabriel's Oboe (from The Mission) | Ennio Morricone | Cinematic & Game | **D maj** | 788 | 4:21 |
| `married-life-up` | Married Life (from Up) | Michael Giacchino (Pixar) | Cinematic & Game | **F maj** | 783 | 2:18 |
| `ratatouille-main-theme` | Le Festin / Ratatouille Theme | Michael Giacchino | Cinematic & Game | **Bb maj** | 667 | 2:33 |
| `undertale-main-theme` | Undertale (Title Theme) | Toby Fox | Cinematic & Game | **B maj** | 516 | 2:57 |
| `his-theme-undertale` | His Theme (Memory) | Toby Fox (Undertale) | Cinematic & Game | **B maj** | 476 | 3:23 |
| `subwoofer-lullaby-c418` | Subwoofer Lullaby | C418 (Minecraft: Volume Alpha) | Cinematic & Game | **C maj** | 896 | 5:02 |
| `mice-on-venus-c418` | Mice on Venus | C418 (Minecraft: Volume Alpha) | Cinematic & Game | **Eb maj** | 832 | 4:13 |
| `haggstrom-c418` | Haggstrom | C418 (Minecraft: Volume Alpha) | Cinematic & Game | **F maj** | 808 | 2:41 |
| `danny-c418` | Danny | C418 (Minecraft: Volume Alpha) | Cinematic & Game | **C maj** | 808 | 4:21 |
| `great-fairy-fountain` | Great Fairy Fountain | Koji Kondo (The Legend of Zelda) | Cinematic & Game | **F maj** | 1008 | 3:17 |
| `lost-woods-saria` | Lost Woods (Saria's Song) | Koji Kondo (The Legend of Zelda: Ocarina of Time) | Cinematic & Game | **F maj** | 920 | 2:23 |
| `aeriths-theme-ffvii` | Aerith's Theme | Nobuo Uematsu (Final Fantasy VII) | Cinematic & Game | **D maj** | 1008 | 5:24 |
| `tifas-theme-ffvii` | Tifa's Theme | Nobuo Uematsu (Final Fantasy VII) | Cinematic & Game | **F maj** | 808 | 4:06 |
| `main-theme-final-fantasy` | Final Fantasy (Main Theme) | Nobuo Uematsu | Cinematic & Game | **F maj** | 1052 | 5:03 |
| `eyes-on-me-ffviii` | Eyes on Me | Nobuo Uematsu / Faye Wong (Final Fantasy VIII) | Cinematic & Game | **D maj** | 788 | 3:41 |
| `melodies-of-life-ffix` | Melodies of Life | Nobuo Uematsu (Final Fantasy IX) | Cinematic & Game | **C maj** | 876 | 4:26 |
| `dirtmouth-hollow-knight` | Dirtmouth | Christopher Larkin (Hollow Knight) | Cinematic & Game | **Db maj** | 896 | 5:07 |
| `john-williams-leias-theme-star-wars` | Princess Leia's Theme (Star Wars: A New Hope) | John Williams (Star Wars) | Cinematic & Game | **D maj** | 1028 | 5:41 |
| `john-williams-harry-wondrous-world` | Harry's Wondrous World (Harry Potter) | John Williams (Harry Potter) | Cinematic & Game | **F maj** | 927 | 3:40 |
| `john-williams-leaving-hogwarts-climax` | Leaving Hogwarts (Harry Potter) | John Williams (Harry Potter) | Cinematic & Game | **D maj** | 767 | 5:19 |
| `john-williams-fawkes-the-phoenix` | Fawkes the Phoenix (Harry Potter Chamber of Secrets) | John Williams (Harry Potter) | Cinematic & Game | **G maj** | 959 | 5:27 |
| `john-williams-jurassic-park-welcome` | Welcome to Jurassic Park (Main Theme) | John Williams (Jurassic Park) | Cinematic & Game | **Bb maj** | 984 | 4:44 |
| `john-williams-raiders-indiana-jones` | The Raiders March (Raiders of the Lost Ark) | John Williams (Indiana Jones) | Cinematic & Game | **C maj** | 1116 | 3:23 |
| `lotr-concerning-hobbits-flute-piano` | Concerning Hobbits (The Fellowship of the Ring) | Howard Shore (The Lord of the Rings) | Cinematic & Game | **D maj** | 852 | 3:32 |
| `lotr-into-the-west-annie-lennox` | Into the West (The Return of the King) | Howard Shore, Fran Walsh, Annie Lennox | Cinematic & Game | **C maj** | 852 | 4:52 |
| `morricone-cinema-paradiso-love-duet` | Cinema Paradiso: Love Theme (Ennio Morricone) | Ennio Morricone & Andrea Morricone | Cinematic & Game | **F maj** | 1008 | 5:34 |
| `morricone-gabriels-oboe-mission` | Gabriel's Oboe (The Mission / Ennio Morricone) | Ennio Morricone (The Mission) | Cinematic & Game | **D maj** | 964 | 6:30 |
| `forrest-gump-feather-theme-silvestri` | Feather Theme (Forrest Gump / Alan Silvestri) | Alan Silvestri (Forrest Gump) | Cinematic & Game | **A maj** | 852 | 4:19 |
| `up-married-life-waltz-giacchino` | Married Life (Disney Pixar Up / Giacchino) | Michael Giacchino (Up) | Cinematic & Game | **F maj** | 825 | 2:30 |
| `legend-1900-magic-waltz-morricone` | The Crave / Magic Waltz (The Legend of 1900) | Ennio Morricone / Jelly Roll Morton | Cinematic & Game | **C maj** | 912 | 2:29 |
| `la-la-land-engagement-party-hurwitz` | Engagement Party (La La Land / Justin Hurwitz) | Justin Hurwitz (La La Land) | Cinematic & Game | **G maj** | 622 | 4:01 |
| `la-la-land-planetarium-waltz-hurwitz` | Planetarium (La La Land Observatory Waltz) | Justin Hurwitz (La La Land) | Cinematic & Game | **E maj** | 1028 | 2:43 |
| `zelda-breath-of-the-wild-riding-day` | Riding (Day) (Zelda: Breath of the Wild) | Manaka Kataoka & Yasuaki Iwata (Nintendo) | Cinematic & Game | **C maj** | 1028 | 3:45 |
| `zelda-rito-village-day-dragon-roost` | Rito Village (Day) / Dragon Roost Tribute | Manaka Kataoka (Zelda BotW) | Cinematic & Game | **F maj** | 825 | 3:53 |
| `zelda-tarrey-town-theme-construction` | Tarrey Town (Zelda: Breath of the Wild) | Manaka Kataoka (Nintendo) | Cinematic & Game | **G maj** | 1140 | 4:19 |
| `undertale-quiet-water-temmie` | Quiet Water (Undertale / Toby Fox) | Toby Fox (Undertale) | Cinematic & Game | **F maj** | 572 | 4:05 |
| `undertale-reunited-true-pacifist` | Reunited (Undertale True Pacifist Epilogue) | Toby Fox (Undertale) | Cinematic & Game | **C maj** | 684 | 3:46 |
| `deltarune-dont-forget-laura-shigihara` | Don't Forget (Deltarune / Laura Shigihara) | Toby Fox & Laura Shigihara | Cinematic & Game | **D maj** | 920 | 4:39 |
| `minecraft-floating-trees-c418` | Floating Trees (Minecraft Volume Beta) | C418 (Daniel Rosenfeld) | Cinematic & Game | **C maj** | 832 | 5:14 |
| `minecraft-taswell-volume-beta` | Taswell (Minecraft Volume Beta / C418) | C418 (Daniel Rosenfeld) | Cinematic & Game | **Eb maj** | 1072 | 6:07 |
| `minecraft-alpha-credits-c418` | Alpha (Minecraft End Poem Credits / C418) | C418 (Daniel Rosenfeld) | Cinematic & Game | **G maj** | 1140 | 5:56 |
| `ffix-melodies-of-life-uematsu` | Melodies of Life (Final Fantasy IX) | Nobuo Uematsu (Final Fantasy IX) | Cinematic & Game | **F maj** | 1116 | 5:39 |
| `ffviii-eyes-on-me-faye-wong` | Eyes on Me (Final Fantasy VIII / Faye Wong) | Nobuo Uematsu (Final Fantasy VIII) | Cinematic & Game | **D maj** | 744 | 4:07 |
| `kingdom-hearts-dearly-beloved-shimomura` | Dearly Beloved (Kingdom Hearts Title Screen) | Yoko Shimomura (Kingdom Hearts) | Cinematic & Game | **Eb maj** | 564 | 3:53 |
| `genshin-impact-tender-strength-mondstadt` | Tender Strength (Genshin Impact / HOYO-MiX) | Yu-Peng Chen & HOYO-MiX | Cinematic & Game | **G maj** | 580 | 3:31 |
| `the-girl-from-ipanema` | The Girl from Ipanema (Garota de Ipanema) | Antônio Carlos Jobim | Jazz & Lo-Fi | **F maj** | 842 | 2:56 |
| `all-of-me-jazz` | All of Me | Gerald Marks & Seymour Simons | Jazz & Lo-Fi | **C maj** | 876 | 2:27 |
| `misty` | Misty | Erroll Garner | Jazz & Lo-Fi | **Eb maj** | 862 | 5:49 |
| `blue-monk` | Blue Monk | Thelonious Monk | Jazz & Lo-Fi | **Bb maj** | 698 | 2:53 |
| `watermelon-man` | Watermelon Man | Herbie Hancock | Jazz & Lo-Fi | **F maj** | 754 | 2:59 |
| `all-blues` | All Blues | Miles Davis | Jazz & Lo-Fi | **G maj** | 898 | 3:50 |
| `waltz-for-debby` | Waltz for Debby | Bill Evans | Jazz & Lo-Fi | **F maj** | 725 | 2:08 |
| `someday-my-prince-will-come-jazz` | Someday My Prince Will Come | Frank Churchill / Bill Evans & Miles Davis | Jazz & Lo-Fi | **Bb maj** | 796 | 2:29 |
| `stella-by-starlight` | Stella by Starlight | Victor Young | Jazz & Lo-Fi | **Bb maj** | 1150 | 4:39 |
| `night-and-day-jazz` | Night and Day | Cole Porter | Jazz & Lo-Fi | **C maj** | 718 | 2:34 |
| `what-a-wonderful-world-jazz` | What a Wonderful World | Bob Thiele & George David Weiss / Louis Armstrong | Jazz & Lo-Fi | **F maj** | 682 | 4:28 |
| `rhapsody-in-blue-jazz` | Rhapsody in Blue (Piano Theme) | George Gershwin | Jazz & Lo-Fi | **Bb maj** | 1130 | 5:59 |
| `i-got-rhythm` | I Got Rhythm | George Gershwin | Jazz & Lo-Fi | **Bb maj** | 898 | 2:13 |
| `georgia-on-my-mind` | Georgia on My Mind | Hoagy Carmichael / Ray Charles | Jazz & Lo-Fi | **F maj** | 790 | 5:51 |
| `take-the-a-train` | Take the 'A' Train | Billy Strayhorn / Duke Ellington | Jazz & Lo-Fi | **C maj** | 878 | 2:30 |
| `mood-indigo` | Mood Indigo | Duke Ellington | Jazz & Lo-Fi | **Ab maj** | 698 | 4:27 |
| `satin-doll` | Satin Doll | Duke Ellington & Billy Strayhorn | Jazz & Lo-Fi | **C maj** | 698 | 2:38 |
| `giant-steps` | Giant Steps | John Coltrane | Jazz & Lo-Fi | **B maj** | 1130 | 2:06 |
| `naima-coltrane` | Naima | John Coltrane | Jazz & Lo-Fi | **Ab maj** | 862 | 7:40 |
| `love-nat-king-cole` | L-O-V-E | Bert Kaempfert & Milt Gabler / Nat King Cole | Jazz & Lo-Fi | **G maj** | 698 | 2:28 |
| `unforgettable-jazz` | Unforgettable | Irving Gordon / Nat King Cole | Jazz & Lo-Fi | **G maj** | 682 | 4:36 |
| `cheek-to-cheek-jazz` | Cheek to Cheek | Irving Berlin | Jazz & Lo-Fi | **C maj** | 826 | 2:33 |
| `desafinado` | Desafinado (Slightly Out of Tune) | Antônio Carlos Jobim | Jazz & Lo-Fi | **F maj** | 790 | 2:42 |
| `corcovado-quiet-nights` | Corcovado (Quiet Nights of Quiet Stars) | Antônio Carlos Jobim | Jazz & Lo-Fi | **C maj** | 610 | 2:23 |
| `wave-jobim` | Wave | Antônio Carlos Jobim | Jazz & Lo-Fi | **D maj** | 806 | 2:39 |
| `maple-leaf-rag-joplin` | Maple Leaf Rag | Scott Joplin | Jazz & Lo-Fi | **Ab maj** | 1166 | 5:11 |
| `mercy-mercy-mercy` | Mercy, Mercy, Mercy | Joe Zawinul / Cannonball Adderley | Jazz & Lo-Fi | **Bb maj** | 734 | 3:43 |
| `straight-no-chaser-monk` | Straight, No Chaser | Thelonious Monk | Jazz & Lo-Fi | **F maj** | 914 | 2:32 |
| `coffee-breath-lofi` | Coffee Breath | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **Db maj** | 610 | 3:40 |
| `four-am-thoughts` | 4:00 AM Thoughts | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **Ab maj** | 826 | 5:44 |
| `tokyo-night-walk-lofi` | Tokyo Night Walk | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **Eb maj** | 842 | 4:35 |
| `vintage-vinyl-nostalgia` | Vintage Vinyl Nostalgia | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **C maj** | 646 | 4:14 |
| `sunday-morning-pancakes` | Sunday Morning Pancakes | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **F maj** | 754 | 4:18 |
| `stargazing-on-the-roof` | Stargazing on the Roof | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **D maj** | 826 | 4:50 |
| `sunset-boulevard-memories` | Sunset Boulevard Memories | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **E maj** | 934 | 4:57 |
| `warm-blanket-and-tea` | Warm Blanket & Tea | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **C maj** | 734 | 5:17 |
| `library-books-whisper` | Whispers in the Old Library | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **Bb maj** | 754 | 5:05 |
| `breezy-balcony-lofi` | Breezy Balcony | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **F maj** | 682 | 3:47 |
| `late-night-coding` | Late Night Coding Session | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **Eb maj** | 646 | 3:50 |
| `autumn-in-new-york-vernon-duke` | Autumn in New York (Vernon Duke) | Vernon Duke / Billie Holiday | Jazz & Lo-Fi | **F maj** | 826 | 5:06 |
| `lullaby-of-birdland-george-shearing` | Lullaby of Birdland (George Shearing) | George Shearing & George David Weiss | Jazz & Lo-Fi | **Ab maj** | 914 | 3:05 |
| `the-days-of-wine-and-roses-mancini` | The Days of Wine and Roses (Henry Mancini) | Henry Mancini & Johnny Mercer | Jazz & Lo-Fi | **F maj** | 826 | 4:10 |
| `moon-river-breakfast-at-tiffanys` | Moon River (Breakfast at Tiffany's) | Henry Mancini & Johnny Mercer | Jazz & Lo-Fi | **C maj** | 564 | 3:32 |
| `smoke-gets-in-your-eyes-jerome-kern` | Smoke Gets in Your Eyes (Jerome Kern) | Jerome Kern & Otto Harbach | Jazz & Lo-Fi | **Eb maj** | 862 | 6:11 |
| `body-and-soul-edward-heyman` | Body and Soul (Johnny Green / Coleman Hawkins) | Johnny Green, Edward Heyman, Frank Eyton | Jazz & Lo-Fi | **Db maj** | 1114 | 9:10 |
| `lush-life-billy-strayhorn` | Lush Life (Billy Strayhorn / John Coltrane) | Billy Strayhorn | Jazz & Lo-Fi | **Db maj** | 1166 | 10:23 |
| `in-a-mellow-tone-duke-ellington` | In a Mellow Tone (Duke Ellington) | Duke Ellington | Jazz & Lo-Fi | **Ab maj** | 662 | 2:41 |
| `sophisticated-lady-duke-ellington` | Sophisticated Lady (Duke Ellington) | Duke Ellington, Mitchell Parish, Irving Mills | Jazz & Lo-Fi | **Ab maj** | 862 | 6:51 |
| `prelude-to-a-kiss-duke-ellington` | Prelude to a Kiss (Duke Ellington) | Duke Ellington, Irving Gordon, Irving Mills | Jazz & Lo-Fi | **C maj** | 914 | 7:01 |
| `chelsea-bridge-billy-strayhorn` | Chelsea Bridge (Billy Strayhorn) | Billy Strayhorn | Jazz & Lo-Fi | **Db maj** | 790 | 6:46 |
| `st-louis-blues-wc-handy` | St. Louis Blues (W. C. Handy / Louis Armstrong) | W. C. Handy | Jazz & Lo-Fi | **G maj** | 878 | 4:04 |
| `sweet-georgia-brown-ben-bernie` | Sweet Georgia Brown (Ben Bernie & Maceo Pinkard) | Ben Bernie, Maceo Pinkard, Kenneth Casey | Jazz & Lo-Fi | **F maj** | 1078 | 2:39 |
| `honeysuckle-rose-fats-waller` | Honeysuckle Rose (Fats Waller) | Fats Waller & Andy Razaf | Jazz & Lo-Fi | **F maj** | 914 | 2:59 |
| `aint-misbehavin-fats-waller` | Ain't Misbehavin' (Fats Waller) | Fats Waller & Harry Brooks | Jazz & Lo-Fi | **Eb maj** | 790 | 3:59 |
| `stormy-weather-harold-arlen` | Stormy Weather (Harold Arlen / Lena Horne) | Harold Arlen & Ted Koehler | Jazz & Lo-Fi | **G maj** | 626 | 4:22 |
| `over-the-rainbow-jazz-ballad` | Over the Rainbow: Jazz Ballad (Keith Jarrett Arr.) | Harold Arlen & E.Y. Harburg | Jazz & Lo-Fi | **G maj** | 1042 | 9:16 |
| `they-cant-take-that-away-gershwin` | They Can't Take That Away from Me (George Gershwin) | George Gershwin & Ira Gershwin | Jazz & Lo-Fi | **Eb maj** | 790 | 3:02 |
| `someone-to-watch-over-me-gershwin` | Someone to Watch Over Me (George Gershwin) | George Gershwin & Ira Gershwin | Jazz & Lo-Fi | **Eb maj** | 718 | 5:42 |
| `foggy-day-london-town-gershwin` | A Foggy Day (in London Town) (George Gershwin) | George Gershwin & Ira Gershwin | Jazz & Lo-Fi | **F maj** | 826 | 3:03 |
| `fascinating-rhythm-george-gershwin` | Fascinating Rhythm (George Gershwin) | George Gershwin & Ira Gershwin | Jazz & Lo-Fi | **Eb maj** | 1186 | 3:31 |
| `but-not-for-me-george-gershwin` | But Not for Me (George Gershwin / Chet Baker) | George Gershwin & Ira Gershwin | Jazz & Lo-Fi | **Eb maj** | 878 | 3:37 |
| `embraceable-you-george-gershwin` | Embraceable You (George Gershwin / Charlie Parker) | George Gershwin & Ira Gershwin | Jazz & Lo-Fi | **G maj** | 718 | 5:19 |
| `the-man-i-love-george-gershwin` | The Man I Love (George Gershwin / Billie Holiday) | George Gershwin & Ira Gershwin | Jazz & Lo-Fi | **Eb maj** | 914 | 6:10 |
| `i-concentrate-on-you-cole-porter` | I Concentrate on You (Cole Porter) | Cole Porter | Jazz & Lo-Fi | **Eb maj** | 806 | 3:16 |
| `ive-got-you-under-my-skin-porter` | I've Got You Under My Skin (Cole Porter / Sinatra) | Cole Porter / Nelson Riddle | Jazz & Lo-Fi | **Db maj** | 1094 | 3:48 |
| `just-one-of-those-things-porter` | Just One of Those Things (Cole Porter) | Cole Porter | Jazz & Lo-Fi | **F maj** | 1094 | 2:42 |
| `what-is-this-thing-called-love-porter` | What Is This Thing Called Love? (Cole Porter) | Cole Porter | Jazz & Lo-Fi | **C maj** | 806 | 2:23 |
| `all-the-things-you-are-jerome-kern` | All the Things You Are (Jerome Kern / Charlie Parker) | Jerome Kern & Oscar Hammerstein II | Jazz & Lo-Fi | **Ab maj** | 1094 | 4:03 |
| `the-way-you-look-tonight-kern` | The Way You Look Tonight (Jerome Kern / Sinatra) | Jerome Kern & Dorothy Fields | Jazz & Lo-Fi | **Eb maj** | 898 | 3:04 |
| `almost-like-being-in-love-lerner-loewe` | Almost Like Being in Love (Lerner & Loewe) | Frederick Loewe & Alan Jay Lerner | Jazz & Lo-Fi | **G maj** | 842 | 2:43 |
| `on-green-dolphin-street-kaper` | On Green Dolphin Street (Bronisław Kaper / Miles Davis) | Bronisław Kaper & Ned Washington | Jazz & Lo-Fi | **Eb maj** | 898 | 3:04 |
| `there-will-never-be-another-you-warren` | There Will Never Be Another You (Harry Warren) | Harry Warren & Mack Gordon | Jazz & Lo-Fi | **Eb maj** | 898 | 2:51 |
| `you-stepped-out-of-a-dream-kahn` | You Stepped Out of a Dream (Nacio Herb Brown) | Nacio Herb Brown & Gus Kahn | Jazz & Lo-Fi | **C maj** | 826 | 2:58 |
| `tune-up-miles-davis` | Tune Up (Miles Davis / Sonny Rollins) | Miles Davis | Jazz & Lo-Fi | **D maj** | 790 | 2:22 |
| `four-miles-davis` | Four (Miles Davis) | Miles Davis | Jazz & Lo-Fi | **Eb maj** | 1078 | 2:59 |
| `doxy-sonny-rollins` | Doxy (Sonny Rollins / Miles Davis) | Sonny Rollins | Jazz & Lo-Fi | **Bb maj** | 662 | 2:41 |
| `oleo-sonny-rollins` | Oleo (Sonny Rollins / Rhythm Changes) | Sonny Rollins | Jazz & Lo-Fi | **Bb maj** | 1094 | 2:34 |
| `st-thomas-sonny-rollins-calypso` | St. Thomas (Sonny Rollins Calypso Jazz) | Sonny Rollins | Jazz & Lo-Fi | **C maj** | 898 | 2:51 |
| `tenor-madness-sonny-rollins` | Tenor Madness (Sonny Rollins & John Coltrane) | Sonny Rollins | Jazz & Lo-Fi | **Bb maj** | 862 | 2:39 |
| `scrapple-from-the-apple-parker` | Scrapple from the Apple (Charlie Parker) | Charlie Parker | Jazz & Lo-Fi | **F maj** | 1078 | 2:47 |
| `yardbird-suite-charlie-parker` | Yardbird Suite (Charlie Parker) | Charlie Parker | Jazz & Lo-Fi | **C maj** | 914 | 3:08 |
| `billies-bounce-charlie-parker` | Billie's Bounce (Charlie Parker Blues in F) | Charlie Parker | Jazz & Lo-Fi | **F maj** | 898 | 2:51 |
| `ornithology-charlie-parker` | Ornithology (Charlie Parker & Benny Harris) | Charlie Parker & Benny Harris | Jazz & Lo-Fi | **G maj** | 1094 | 2:42 |
| `now-the-time-charlie-parker` | Now's the Time (Charlie Parker Blues in F) | Charlie Parker | Jazz & Lo-Fi | **F maj** | 646 | 2:23 |
| `well-you-neednt-thelonious-monk` | Well You Needn't (Thelonious Monk) | Thelonious Monk | Jazz & Lo-Fi | **F maj** | 826 | 2:37 |
| `ruby-my-dear-thelonious-monk` | Ruby, My Dear (Thelonious Monk & John Coltrane) | Thelonious Monk | Jazz & Lo-Fi | **Ab maj** | 826 | 6:34 |
| `epistrophy-thelonious-monk` | Epistrophy (Thelonious Monk & Kenny Clarke) | Thelonious Monk & Kenny Clarke | Jazz & Lo-Fi | **Db maj** | 1094 | 3:45 |
| `monks-mood-thelonious-monk` | Monk's Mood (Thelonious Monk) | Thelonious Monk | Jazz & Lo-Fi | **Db maj** | 914 | 8:29 |
| `waltz-for-debby-village-vanguard` | Waltz for Debby: Village Vanguard Solo (Bill Evans) | Bill Evans | Jazz & Lo-Fi | **F maj** | 957 | 3:24 |
| `peace-piece-bill-evans` | Peace Piece (Bill Evans - Everybody Digs) | Bill Evans | Jazz & Lo-Fi | **C maj** | 898 | 7:59 |
| `my-foolish-heart-young-washington` | My Foolish Heart (Victor Young / Bill Evans Trio) | Victor Young & Ned Washington | Jazz & Lo-Fi | **Bb maj** | 790 | 6:46 |
| `peri-scope-bill-evans` | Peri's Scope (Bill Evans - Portrait in Jazz) | Bill Evans | Jazz & Lo-Fi | **C maj** | 842 | 2:41 |
| `time-remembered-bill-evans` | Time Remembered (Bill Evans Modal Jazz) | Bill Evans | Jazz & Lo-Fi | **C maj** | 1078 | 7:29 |
| `triste-antonio-carlos-jobim` | Triste (Antônio Carlos Jobim - Wave) | Antônio Carlos Jobim | Jazz & Lo-Fi | **Bb maj** | 862 | 2:54 |
| `meditation-meditacao-jobim` | Meditação / Meditation (Antônio Carlos Jobim) | Antônio Carlos Jobim & Newton Mendonça | Jazz & Lo-Fi | **C maj** | 734 | 3:38 |
| `dindi-antonio-carlos-jobim` | Dindi (Antônio Carlos Jobim & Aloysio de Oliveira) | Antônio Carlos Jobim & Aloysio de Oliveira | Jazz & Lo-Fi | **Eb maj** | 646 | 4:14 |
| `samba-de-uma-nota-so-one-note-samba` | One Note Samba / Samba de Uma Nota Só (Jobim) | Antônio Carlos Jobim & Newton Mendonça | Jazz & Lo-Fi | **Bb maj** | 842 | 2:30 |
| `the-entertainer-scott-joplin-rag` | The Entertainer: Classic Stride Ragtime (Scott Joplin) | Scott Joplin (1902) | Jazz & Lo-Fi | **C maj** | 656 | 3:45 |
| `maple-leaf-rag-scott-joplin-solo` | Maple Leaf Rag (Scott Joplin 1899 Original) | Scott Joplin (1899) | Jazz & Lo-Fi | **Ab maj** | 1166 | 4:48 |
| `solace-scott-joplin-mexican-serenade` | Solace: A Mexican Serenade (Scott Joplin Habanera) | Scott Joplin (1909) | Jazz & Lo-Fi | **C maj** | 914 | 6:22 |
| `bethena-scott-joplin-concert-waltz` | Bethena: A Concert Ragtime Waltz (Scott Joplin) | Scott Joplin (1905) | Jazz & Lo-Fi | **G maj** | 783 | 2:56 |
| `watermelon-man-herbie-hancock-solo` | Watermelon Man (Herbie Hancock - Takin' Off) | Herbie Hancock | Jazz & Lo-Fi | **F maj** | 790 | 3:08 |
| `dolphin-dance-herbie-hancock` | Dolphin Dance (Herbie Hancock - Maiden Voyage) | Herbie Hancock | Jazz & Lo-Fi | **Eb maj** | 1042 | 3:59 |
| `lofi-tokyo-subway-after-midnight` | Tokyo Subway After Midnight | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **Eb maj** | 718 | 4:26 |
| `lofi-coffee-steam-and-old-books` | Coffee Steam and Old Books | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **G maj** | 734 | 4:22 |
| `lofi-lo-fi-beats-to-sleep-to` | Lo-Fi Beats to Sleep To | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **Ab maj** | 734 | 5:27 |
| `lofi-warm-fireplace-and-jazz-vinyl` | Warm Fireplace and Jazz Vinyl | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **F maj** | 646 | 4:06 |
| `lofi-rooftop-stargazing-in-brooklyn` | Rooftop Stargazing in Brooklyn | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **Bb maj** | 806 | 4:36 |
| `lofi-rainy-afternoon-in-amsterdam` | Rainy Afternoon in Amsterdam | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **F maj** | 638 | 4:03 |
| `lofi-lo-fi-hip-hop-radio-girl` | Chilled Cow: Lo-Fi Study Beats | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **C maj** | 626 | 3:46 |
| `lofi-autumn-walk-in-central-park` | Autumn Walk in Central Park | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **G maj** | 662 | 3:53 |
| `lofi-sunset-over-han-river-bridge` | Sunset Over Han River Bridge | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **Db maj** | 934 | 5:56 |
| `lofi-sunday-morning-french-toast` | Sunday Morning French Toast | PianoFlow Lo-Fi Collective | Jazz & Lo-Fi | **D maj** | 698 | 3:53 |
| `bach-prelude` | Prelude in C Major, BWV 846 | Johann Sebastian Bach | Classical | **C maj** | 559 | 2:03 |
| `chopin-nocturne` | Nocturne in E-flat Major, Op. 9 No. 2 | Frédéric Chopin | Classical | **Eb maj** | 1093 | 2:12 |
| `sparkle-radwimps` | Sparkle | Radwimps (Your Name - Kimi no Na wa) | Anime & Ghibli | **B maj** | 1489 | 2:29 |
| `spirited-away` | One Summer's Day (The Name of Life) | Joe Hisaishi (Spirited Away) | Anime & Ghibli | **C maj** | 2130 | 4:40 |
| `one-summer-day` | One Summer's Day (The Name of Life) | Joe Hisaishi (Spirited Away) | Anime & Ghibli | **C maj** | 2130 | 4:40 |
| `bts-spring-day` | Spring Day (봄날) | BTS | K-Pop | **Eb maj** | 576 | 1:29 |
| `girl-from-ipanema` | The Girl from Ipanema (Garota de Ipanema) | Antônio Carlos Jobim | Jazz & Lo-Fi | **F maj** | 842 | 2:56 |

---

## 5. Security & Architectural Verification Summary

1. **Security Hotfix S0**:
   - `apps/web/app/api/debug-token/route.ts` deleted completely.
   - `apps/web/lib/transcribeClient.ts` client-side token exposure (`NEXT_PUBLIC_DEMO_TOKEN`) and direct Modal bypass stripped.
   - `apps/web/app/api/transcribe/route.ts` hardened with 503 fail-closed logic and strict request body validation.
   - `infra/modal/transcribe_app.py` hardened with fail-closed token verification (503 if token not configured, 401 if missing/invalid).

2. **Unit Testing**:
   - `apps/web/tests/key_root_pitch.spec.ts` passing all 11 test assertions across major and minor formats.
