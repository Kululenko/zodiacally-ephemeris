> **English note.** This is the German build documentation, originally written for Zodiacally's
> internal repository and kept for its detailed evidence tables. Paths and commands are adapted to
> this repository, and the statements on the Swiss Ephemeris comparison, the fit error and
> reproducibility were corrected to match the English documents. The English version of the
> conventions is [`docs/conventions.md`](../../docs/conventions.md); where the two differ, the
> English version applies. The comparison table with the Swiss Ephemeris near the end comes from
> Zodiacally's internal comparison tool during the development of version 1.1.0 and predates the
> public benchmark; current, reproducible figures are in
> [`docs/accuracy.md`](../../docs/accuracy.md) and [`benchmark/`](../../benchmark/README.md).

# Ephemeriden-Tabellen – Offline-Builder

Erzeugt die Chebyshev-Tabellen von Zodiacally Ephemeris (`data/*.bin` + `data/manifest.json`)
und die Referenz-Fixture `test/fixtures/reference.json`. Läuft nur offline auf
Entwicklerrechnern und gehört nicht zum ausgelieferten Paket. Die Runtime liest nur die erzeugten
Dateien (reines JavaScript, keine Abhängigkeit zu Python, Skyfield oder `sweph`).

## Ein Befehl

```sh
sh build/tables/build.sh
```

`build.sh` legt bei Bedarf `build/tables/.venv` an (python3), installiert die gepinnten Pakete
aus `requirements.txt`, lädt JPL DE440s nach `build/tables/.cache/de440s.bsp` (falls nicht
vorhanden) und startet `build.py`. `build.py` prüft Größe und SHA-256 von DE440s und bricht bei
Abweichung ab. Die Chiron-Rohdaten von JPL Horizons liegen versioniert in `sources/horizons/`
(gemeinfrei, 3,5 MB): Horizons liefert immer seine jeweils aktuelle Bahnlösung, erst die
eingecheckten Antworten machen die Eingaben für `chiron.bin` unabhängig vom Abrufzeitpunkt
(Lösung JPL#171, SHA-256 der Antworten im Manifest). Sie werden nur geholt, wenn sie fehlen. Dauer ca. 5 Minuten.

Der Build ist auf Determinismus ausgelegt: feste Eingaben (DE440s, `sources/horizons/`), gepinnte
Paketversionen und Koeffizienten aus reinen NumPy-Schleifen ohne BLAS. Gleiche Eingaben sollen
auf derselben Plattform byte-identische `.bin`-Dateien, `manifest.json` und Fixture ergeben: Ein
Neubau am 8. November 2026 auf einem Apple M1 (macOS, Python 3 von Homebrew) hat alle 24 Dateien
in `data/` (23 Tabellendateien und `manifest.json`) und die Referenz-Fixture byte-identisch zum
eingecheckten Build vom Oktober 2026 reproduziert. Unter Linux x86-64 (CI, Python 3.13) ist der
Neubau nicht bitgleich, weil Gleitkommaergebnisse zwischen Plattformen in den letzten Bits
abweichen, aber numerisch gleichwertig: gleiche Rekordstruktur, berechnete Werte höchstens
0,000000016″ verschieden, direkt berechnete Referenzwerte höchstens 0,0000217″ (Details in
[`build/README.md`](../README.md)).

Weitere Aufrufe (im Verzeichnis `build/tables/`): `.venv/bin/python build.py --explore jupiter
16x14 32x16` (Fit-Fehler/Größe für Intervall×Koeffizienten testen, schreibt nichts),
`--only sun,moon` (Debug, ohne Manifest).

## Quellen und Lizenzen

| Quelle | Inhalt | Lizenz |
| --- | --- | --- |
| JPL DE440s (`de440s.bsp`, 32 726 016 Bytes, SHA-256 `c1c7fee…a49f2`) | Sonne, Mond, Planeten, 1849–2150 | US-Regierungswerk, gemeinfrei |
| JPL Horizons API, Körper 2060 Chiron, Lösung JPL#171 | baryzentrische ICRF-Zustandsvektoren (TDB, 4-Tage-Raster) | gemeinfrei |
| Skyfield 1.55, jplephem 2.24, sgp4 | Reduktion, SPK-Lesen | MIT |
| numpy | Numerik | BSD-3 |
| certifi | Zertifikate (Skyfield-Abhängigkeit) | MPL-2.0, unverändert, nur Build |

**Clean Room:** Kein Quellcode der Swiss Ephemeris wurde gelesen oder verwendet, keine Daten der
Swiss Ephemeris werden mitgeliefert, und kein Koeffizient und kein kontinuierlicher Parameter
wurde an Ausgaben der Swiss Ephemeris angepasst. Die Tabellen entstehen nur aus JPL-Daten über
Skyfield; `build.py` importiert weder `sweph` noch etwas aus `benchmark/`. Die Swiss Ephemeris
(über `sweph`, nur die öffentliche API) dient als externe Referenz in `benchmark/` und in den
Studien unter `benchmark/studies/`.

Drei diskrete Modellentscheidungen zwischen veröffentlichten Konventionen wurden jedoch durch
Vergleich der Residuen mit Ausgaben der Swiss Ephemeris getroffen: (1) Lichtablenkung nur durch
die Sonne, (2) das Massenmodell eines n=3-Polytrops für Strahlen hinter der Sonnenscheibe,
(3) der lichtlaufzeit-retardierte oskulierende Knoten als wahrer Mondknoten. Gefittet wurde dabei
nichts; die Alternativen und Residuen stehen unten unter „Konventionen“, die Studienskripte
liegen in `benchmark/studies/`. Für diese drei Konventionen ist die Übereinstimmung mit der Swiss
Ephemeris deshalb teilweise konstruktionsbedingt; aus diesem Grund wird auch der Vergleich mit
NASA/JPL Horizons berichtet ([`docs/accuracy.md`](../../docs/accuracy.md)).

## Dateien

| Datei | Inhalt |
| --- | --- |
| `build.sh` | Ein-Befehl-Build (venv, Download, Build) |
| `build.py` | Tabellen, Verifikation, Manifest, Fixture |
| `reduction.py` | direkte (nicht tabellierte) Auswertung aller Größen |
| `chebyshev.py` | Chebyshev-Fit und Auswertung exakt nach dem Format-Vertrag |
| `horizons.py` | Chiron-Download (eine Anfrage nach der anderen, User-Agent `zodiacally-ephemeris-build/1.0`) nach `sources/horizons/`, Hermite-Interpolation |
| `sources/horizons/` | eingecheckte Horizons-Rohantworten (Chiron, JPL#171) |

## Konventionen (mit Evidenz)

Alle Tabellen in TT. Ephemeriden werden in TDB gelesen (Skyfield: TDB = TT + periodische Terme).

- **Scheinbarer Ort (Sonne bis Pluto, Chiron):** Beobachter Erdmittelpunkt; Lichtlaufzeit
  iteriert; Lichtablenkung **nur durch die Sonne**; relativistische jährliche Aberration;
  GCRS → wahrer Äquator/Äquinoktium des Datums mit Frame-Bias + IAU-2006-Präzession +
  IAU-2000A-Nutation (IERS Conventions 2010 Kap. 5), dann Drehung um x um die wahre Schiefe
  in die wahre Ekliptik des Datums. Mars bis Pluto sind System-Baryzentren (wie in DE440s).
- **Lichtablenkung nur durch die Sonne** (Skyfield nimmt standardmäßig Jupiter und Saturn
  dazu; auch JPL Horizons lenkt nur durch die Sonne ab, `Rel. light bend : Sun` in seinen
  Kopfzeilen). Gewählt durch Vergleich mit der Swiss Ephemeris
  (`benchmark/studies/deflection_study.py`): bei den engsten Uranus–Jupiter-Begegnungen
  1899–2101 (56", 76") streut das Residuum gegen die Swiss Ephemeris mit „nur Sonne“ um
  0,14–0,20 mas, mit Jupiter+Saturn um 0,67–0,98 mas (Jupiter-Signatur).
- **Strahlen hinter der Sonnenscheibe:** statt der Punktmasse (unphysikalische 1/b-Spitze) die
  Masse innerhalb des Zylinders mit Stoßparameter b eines n=3-Polytrops (Eddington-Modell;
  Schneider, Ehlers & Falco, „Gravitational Lenses“, 1992). Ebenfalls durch Vergleich mit der
  Swiss Ephemeris gewählt (`benchmark/studies/deflection_study.py`): bei den tiefsten
  Konjunktionen (Elongation 0,001°–0,05°) RMS-Residuum Polytrop 0,03–0,08", Punktmasse
  0,36–14,6", ohne Ablenkung 0,38–1,57". Der Körper ist dort von der Sonne verdeckt; das Modell
  sorgt nur für einen stetigen Verlauf.
- **Wahrer Mondknoten** (`benchmark/studies/true_node_study.py`, 3000 Epochen; gewählt durch
  Vergleich mit `SE_TRUE_NODE`, nichts gefittet): h = r × v des geozentrischen Mondes aus DE440s
  zum lichtlaufzeit-retardierten Zeitpunkt, Knoten auf der mittleren Ekliptik des Datums
  (IAU 2006) plus Δψ (= wahre Ekliptik des Datums). Residuen gegen `SE_TRUE_NODE` (RMS / max):
  lichtlaufzeit-retardiert 0,0084" / 0,18" (Mittel +0,0001"); geometrisch 0,0095" / 0,17"
  (Mittel −0,0026"); nur RMS: ohne Frame-Bias 0,17"; nur mittleres Äquinoktium 12,2";
  J2000-Ekliptik 2891".
- **Nutation/Schiefe:** Δψ IAU 2000A (vollständige Reihe, Skyfield `iau2000a`), wahre Schiefe
  = mittlere Schiefe IAU 2006 + Δε IAU 2000A.
- **Chiron:** baryzentrische Horizons-Vektoren, kubische Hermite-Interpolation auf dem
  4-Tage-Raster (geschätzter Fehler 2·10⁻⁶"), dann dieselbe Reduktion wie die Planeten.

## Tabellen

Chebyshev-Rekorde per Interpolation an den n Chebyshev-Lobatto-Punkten (Rekordenden gemeinsam
mit dem Nachbarn, Sprung an Grenzen < 10⁻⁸"), verifiziert an 24 gleichverteilten Punkten pro
Rekord inklusive beider Enden. Alle Tabellen: JD TT 2414655,5 (1899-01-01) bis 2488447,5
(2101-01-14). 16-Tage-Rekorde sind für die Planeten das Optimum: längere Rekorde brauchen wegen
des monatlichen Erd-Wackelns um das Erde-Mond-Baryzentrum deutlich mehr Koeffizienten.

**Rekorde an der oberen Konjunktion** (`refine_solar_conjunctions` in `build.py`, seit
Format 2): Nahe der Sonne ändert sich die Lichtablenkung (bis 1,75" am Rand) innerhalb von
Stunden; ein einzelnes 16-Tage-Polynom verfehlt sie um bis zu etwa 7" (Neptun 6,89", letzte
Spalte der Tabelle) und verteilt den Fehler über den ganzen Rekord. Für Planeten und Chiron wird
jeder Rekord, der < 3° an der Sonne vorbeiführt oder an den 24 Regelpunkten 0,5 mas überschreitet,
an 401 Punkten (≈ 1 h Abstand) direkt geprüft. Liegt er dort über 0,5 mas, ersetzen ihn
Teilrekorde: dieselbe Lobatto-Interpolation mit demselben n, fortgesetzt halbiert
(`split_record`), bis jeder Teilrekord an mindestens ebenso dichten Punkten das Ziel von 0,5 mas
einhält. Halbierte 16-Tage-Rekorde haben exakte Binärbruch-Grenzen; Teilrekorde teilen ihre
Enden mit den Nachbarn wie die Hauptrekorde, die Tabelle bleibt also stetig. Die Teilrekorde
stehen in `<name>.refined.bin` (Format unten); die Runtime nimmt sie statt des Hauptrekords.

Die Maximalfehler unten stammen aus der dichten Prüfung. Der Fitfehler liegt damit bei etwa
0,5 mas: Der größte an den Prüfpunkten gefundene Wert ist 0,5002 mas (Merkur, im Manifest als
`maxFitErrorArcsec`), knapp über dem Ziel, weil ein Teilrekord das Ziel nur an seinen eigenen
Prüfpunkten einhalten muss und die anschließende dichte Prüfung des ganzen Rekords etwas mehr
finden kann. Das sind an den Prüfpunkten gefundene Maxima, keine bewiesenen Schranken dazwischen.

| Tabelle | Tage × n | Bytes (+ Teilrekorde) | max. Fitfehler | max. Fitfehler in Rekorden, die durchgehend ≥ 1° von der Sonne entfernt bleiben | verfeinerte Rekorde / Teilrekorde | max. Fehler eines 16-Tage-Polynoms dort |
| --- | --- | --- | --- | --- | --- | --- |
| sun | 32 × 22 | 405 856 | 0,39 mas | – | – | – |
| moon | 16 × 22 | 811 712 | 0,11 mas | 0,11 mas | – | – |
| mercury | 16 × 15 | 553 440 + 240 448 | 0,50 mas | 0,058 mas | 560 / 1768 | 2,00" |
| venus | 16 × 14 | 516 544 + 19 200 | 0,50 mas | 0,090 mas | 51 / 150 | 2,40" |
| mars | 16 × 14 | 516 544 + 24 448 | 0,49 mas | 0,084 mas | 67 / 191 | 4,14" |
| jupiter | 16 × 14 | 516 544 + 98 048 | 0,50 mas | 0,22 mas | 202 / 766 | 5,46" |
| saturn | 16 × 14 | 516 544 + 76 032 | 0,50 mas | 0,18 mas | 189 / 594 | 5,18" |
| uranus | 16 × 14 | 516 544 + 133 888 | 0,50 mas | 0,28 mas | 225 / 1046 | 5,99" |
| neptune | 16 × 14 | 516 544 + 103 424 | 0,49 mas | 0,15 mas | 216 / 808 | 6,89" |
| pluto | 16 × 14 | 516 544 + 12 672 | 0,46 mas | 0,11 mas | 32 / 99 | 3,52" |
| chiron | 16 × 14 | 516 544 + 29 056 | 0,50 mas | 0,11 mas | 74 / 227 | 5,45" |
| trueNode | 16 × 20 | 737 920 | 0,019 mas | – | – | – |
| nutationLongitude | 32 × 22 | 405 856 | 0,39 mas | – | – | – |
| trueObliquity | 32 × 20 | 368 960 | 0,40 mas | – | – | – |

Summe 8 153 312 Bytes (7,78 MiB). Erste Auswertung in Node (Manifest, 14 Tabellen, SHA-256-Prüfung)
≈ 7 ms, danach ≈ 0,1 µs pro Körper (interne Messung; Abschnitt 6 des Oktober-Berichts in
[`docs/accuracy.md`](../../docs/accuracy.md) nennt 7,1 ms und 0,117 µs). Im öffentlichen
Benchmark brauchen das Laden der Bibliothek und das erste Chart in einem neuen Prozess (ohne den
Start von Node.js) 19,2 ms. Details zum Fit stehen in `manifest.json` unter `sources.fitReport`.

## Grenzen

- **Hinter der Sonnenscheibe** ist der scheinbare Ort eine Modellfrage (der Körper ist verdeckt):
  Die Tabellen folgen seit Format 2 auch dort den direkt berechneten Werten auf etwa 0,5 mas;
  gegenüber der Swiss Ephemeris bleibt der Unterschied der Ablenkungsmodelle (Polytrop, siehe
  Konventionen).
- **Chiron** folgt der JPL-Lösung JPL#171 (Beobachtungen 1895–2026), die auch JPL Horizons
  verwendet. Die Asteroidendatei der Swiss Ephemeris verwendet eine andere Bahnlösung; daraus
  ergeben sich Unterschiede von etwa 0,003″ um 2019 bis zu 0,93″ (größter Wert um 2097; um 1899
  etwa 0,8″). Das ist ein Unterschied der Bahnlösungen, keine Konvention, und keine Rangfolge der
  beiden.
- Geschwindigkeiten: Die Swiss Ephemeris weicht bei der Mondgeschwindigkeit um bis zu 0,28"/Tag
  ab (unsere Werte sind Fünf-Punkt-Differenzen der direkten Positionen bzw. die exakte
  Chebyshev-Ableitung).

## Abgleich mit der Swiss Ephemeris (internes Werkzeug, 5000 Zufallsepochen 1899–2101)

Gemessen mit Zodiacallys internem Vergleichswerkzeug während der Entwicklung von Version 1.1.0,
vor dem öffentlichen Benchmark; das Werkzeug ist nicht Teil dieses Repositorys. Residuum = unsere
direkten Werte bzw. Tabellen − `swe.calc` (sweph 2.10.03), gleiche TT-Zeitpunkte
(Tabellenspalten mit den Teilrekorden, Format 2).

| Körper | Länge max | p99 | Mittel | Geschw. p99 ["/Tag] | Tabelle max | Tabelle p99 |
| --- | --- | --- | --- | --- | --- | --- |
| sun | 0,0034" | 0,0021" | +0,0002" | 0,0025 | 0,0034" | 0,0022" |
| moon | 0,0082" | 0,0066" | −0,0015" | 0,255 | 0,0082" | 0,0066" |
| mercury | 0,0042" | 0,0024" | +0,0002" | 0,029 | 0,0042" | 0,0024" |
| venus | 0,0085" | 0,0044" | +0,0001" | 0,0071 | 0,0085" | 0,0044" |
| mars | 0,020" | 0,0030" | +0,0002" | 0,0036 | 0,020" | 0,0030" |
| jupiter | 0,19" | 0,0017" | +0,0001" | 0,0017 | 0,19" | 0,0017" |
| saturn | 0,34" | 0,0017" | +0,0001" | 0,0030 | 0,34" | 0,0017" |
| uranus | 0,0032" | 0,0016" | +0,0002" | 0,0013 | 0,0032" | 0,0016" |
| neptune | 0,0032" | 0,0017" | +0,0002" | 0,0020 | 0,0032" | 0,0017" |
| pluto | 0,0029" | 0,0016" | +0,0002" | 0,020 | 0,0029" | 0,0016" |
| chiron | 0,93" | 0,79" | +0,0026" | 0,0058 | 0,93" | 0,79" |
| trueNode | 0,11" | 0,025" | +0,0002" | 0,11 | 0,11" | 0,025" |
| nutationLongitude | 0,0029" | 0,0015" | +0,0001" | – | 0,0027" | 0,0015" |
| trueObliquity | 0,0012" | 0,0009" | +0,0004" | – | 0,0013" | 0,0009" |

Kein systematischer Versatz > 0,01" (größter Mittelwert ohne Chiron: Mond −0,0015"; Chiron
+0,0026" wegen der anderen Bahnlösung). Die Maxima bei Jupiter/Saturn/Mars liegen bei Epochen
hinter der Sonnenscheibe (Ablenkungsmodell); die Tabellen folgen dort seit Format 2 den direkten
Werten.

## Format

Exakt nach dem Vertrag (formatVersion 2): je Tabelle `<name>.bin` als little-endian Float64,
nRecords × n Koeffizienten; Rekord i deckt [jdStart + i·L, jdStart + (i+1)·L];
x = 2(t − Rekordstart)/L − 1; Wert = Σ c_k T_k(x) (c_0 nicht halbiert);
Ableitung [Grad/Tag] = (2/L) Σ c_k T_k'(x); Winkeltabellen innerhalb eines Rekords stetig,
Normierung auf [0, 360) in der Runtime. Neu in Format 2: Planeten und Chiron haben im Manifest
`refinedRecords` (file, sha256, bytes, count) für `<name>.refined.bin`: count Zeilen aus n + 2
Float64 `[start, end, c_0 … c_{n−1}]` in Zeitfolge. Die Teilrekorde eines verfeinerten Rekords
schließen lückenlos aneinander an und decken ihn exakt ab; innerhalb dieses Rekords gilt der letzte
Teilrekord mit start ≤ t, mit start und end − start statt Rekordstart und L.

---

**English summary.** Offline builder (Python, not part of the shipped package) for the Zodiacally
Ephemeris tables. `sh build/tables/build.sh` creates the venv, downloads and verifies JPL DE440s,
reads the committed JPL Horizons Chiron vectors (`sources/horizons/`) and writes 14 Chebyshev
tables plus refined sub-records (7.78 MiB), the manifest and a reference fixture of directly
evaluated values. A rebuild on macOS/arm64 reproduced all 24 files in `data/` and the fixture
byte-identically; on Linux x86-64 the rebuild is numerically equivalent (values within
0.000000016″, reference values within 0.0000217″) but not bit-identical. Reduction: Skyfield (MIT) on DE440s, geocentric apparent ecliptic longitude of date
(light time, solar light deflection only, aberration, IAU 2006/2000A). The true node is the
osculating node of h = r × v at the light-time-retarded epoch, referred to the true ecliptic of
date. The fit error is about 0.5 mas (largest 0.5002 mas at the check points; data format 2):
next to a superior solar conjunction, where the solar deflection changes within hours and a
single 16-day polynomial was off by up to about 7″, the record is replaced by halved Lobatto
sub-records (`<name>.refined.bin`) until each meets the 0.5 mas target at points as dense as the
check that flagged it; the tables stay continuous. No Swiss Ephemeris code was read or used, no
Swiss Ephemeris data files are shipped, and nothing was fitted to its output, but three discrete
conventions (Sun-only light deflection, the polytrope model behind the solar disc, the true-node
definition) were chosen by comparing residuals against Swiss Ephemeris output, so the agreement
is partly by construction for them. The internal comparison from the development of 1.1.0 shows
no systematic offset (mean at most 0.0015″ apart from Chiron), p99 ≤ 0.007″ for the Sun to
Pluto, 0.025″ for the true node, and up to 0.93″ for Chiron, whose table uses a different orbit
solution from the Swiss Ephemeris asteroid file.
