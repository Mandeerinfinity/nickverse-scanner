# NICK-VERSE Scanner · v11

*A CINCO Corporation Product. Model: CINCO Nick-Verse Scan-O-Matic 9000, Mark XI. Seeing Things, Now With More Things.™*

A handheld sensor-array HUD for Nick, and the companion to the [NICK-VERSE Watch](https://mandeerinfinity.github.io/nickverse-watch/).
It's a self-contained static PWA with no build step. It uses vanilla JS, Canvas 2D, Web Audio, Web Speech and the device sensor APIs.
It's built mobile-first and lays out as a three-column command deck on desktop.

**Live:** https://mandeerinfinity.github.io/nickverse-scanner/

## What's new in v11
### Performance (the headline)
v10 ran at 10 to 40 fps on a throttled phone; v11 holds a steady 60 fps median on every tool (table below).
- **One shared animation loop** drives every canvas; hidden tools, off-screen canvases (IntersectionObserver), background tabs and anything covered by a modal stop drawing.
- **Capped canvas resolution:** DPR is at most 2, and lower for background layers and lower quality tiers. Particles, scanlines and the grid live on a single low-res background canvas.
- **Cheap glow:** no `shadowBlur` in hot paths, and no animated `backdrop-filter` or blur. Glows are pre-rendered sprites; animations touch only `transform` and `opacity`.
- **Camera pipeline:** each new video frame is decoded once into a shared frame canvas. Analysis runs on a 160 px downsampled copy at about 15 Hz while drawing stays at 60. Colour Lab repaints only when a new camera frame arrives.
- **No per-frame allocations** in the hot paths. Paths are batched, a `ctx.font` cache skips repeated font parsing, sensor handlers are debounced, and the DOM is written only when values change.
- **Adaptive quality governor:** Settings → Performance offers **Auto / Ultra / High / Balanced / Battery**. Auto watches frame time and steps down a tier when frames go over 16.7 ms (and back up when there's headroom). There's also an optional **FPS overlay** (`?fps` or the setting). `?q=high` forces a tier.

**Frames per second, headless Chrome, 4× CPU throttle, 390 px @2×, software rendering (Auto quality):**

| Tool | v10 avg / median | v11 avg / median |
|---|---|---|
| Optical Scanner | 10.8 / 12 | 53.6 / 60 |
| AR Overlay | 12.9 / 12 | 51.3 / 60 |
| Colour Lab | 14.5 / 15 | 51.7 / 60 |
| Text Reader | 18.1 / 20 | 59.2 / 60 |
| Measure | 40.4 / 60 | 60.0 / 60 |
| Motion & Tilt | 22.9 / 20 | 60.0 / 60 |
| Compass & Level | 16.2 / 15 | 58.8 / 60 |
| Seismograph | 26.4 / 30 | 59.6 / 60 |
| Metal Detector | 31.0 / 30 | 60.0 / 60 |
| Pulse Estimator | 22.3 / 20 | 60.0 / 60 |
| Weather & Sky | 26.5 / 30 | 57.6 / 60 |
| Acoustic Analyser | 22.0 / 20 | 60.0 / 60 |
| Photon Suite | 17.2 / 20 | 60.0 / 60 |
| Threat Assessment | 28.0 / 30 | 60.0 / 60 |
| Sonar Sweep | 20.8 / 20 | 60.0 / 60 |
| Perimeter Guard | 23.5 / 20 | 60.0 / 60 |
| Diagnostics | 33.0 / 30 | 60.0 / 60 |
| Scan Log | 41.8 / 60 | 60.0 / 60 |
| Scan Timer | 44.4 / 60 | 60.0 / 60 |
| Achievements | 32.8 / 30 | 60.0 / 60 |
| Paranormal Detector *(new)* | — | 60.0 / 60 |
| GPS Speedometer *(new)* | — | 60.0 / 60 |
| Soundscape *(new)* | — | 60.0 / 60 |
| Clap Switch *(new)* | — | 60.0 / 60 |
| JARVIS Console *(new, while speaking)* | — | 60.0 / 60 |
| Mission Planner *(new)* | — | 60.0 / 60 |
| Daily Briefing *(new)* | — | 60.0 / 60 |
| CINCO Hotline *(modal)* | — | 60.0 / 60 |

*The camera tools vary between runs on a busy machine: in quieter runs the Optical Scanner reached 59.6, AR 58.0 and Colour Lab 54.8 avg.*

### JARVIS Console *(new tool)*
- Chat by typing or by voice, with an animated core/orb and a live waveform while he speaks. Tap the orb to talk.
- A rule-based answer engine: no API, no keys, nothing leaves the device. He handles time and date, weather (from the Weather tool), sensor readings, the last scan, battery, achievements, "open *tool*", protocols, jokes, CINCO facts, **timers and reminders** ("remind me in 5 minutes to stretch"), unit conversions, maths, coin flips, dice and odds ("odds of double six"), and "how are you".
- **Session memory** of recent actions ("what have I done?"), and occasional contextual **quips**. These are rate-limited and can be switched off.
- **Voice settings:** choose a voice, set rate and pitch, and switch on an optional **wake phrase** ("Jarvis, …") that listens continuously while voice mode is on.
- British, dry, and calls you "Sir" or "Nicholas".

### CINCO Hotline, rebuilt
- **Phone tree:** recursive menus (the menu about the menu about menus) with a depth counter and breadcrumb.
- **DJ Gary:** six synthesized hold tracks. **Skip** only makes it worse ("Played Underwater", "Recorded on a Potato", "Beyond Help").
- **Hold announcements** every 30 to 45 s, spoken in a different voice from JARVIS where possible.
- **Escalate:** Supervisor → Senior Supervisor → Regional Manager of Supervisors → the CINCO Board → Gerald.
- **Callback requests** that never call back, but send ever more apologetic notifications.
- **CINCObot**, a live-chat bot that misunderstands everything.
- **Ticket numbers**, plus a **Warranty claim form (W-404)** that rejects every claim for a new absurd reason, with a stamp.
- A **rigged satisfaction survey** in which every option is bad and the stars reset to one.
- A running JARVIS commentary bar.
- Nothing is dialled, linked or sold.

### Seven new tools (27 in total)
- **Soundscape** (Environment): six synthesized ambient layers with a mixer, a visualiser, a sleep timer and a 12-pad sound board.
- **Clap Switch** (Environment): mic transient detection. Two or three claps trigger mappable actions (holo-lamp, torch, status report, scan, party mode, red alert…), and it works whichever tool is open.
- **Paranormal Detector** (Sensors): a clearly fake horror-comedy EMF meter with a spirit box, question chips, an entity log and Banish.
- **GPS Speedometer** (Sensors): speed gauge, trip distance, max/avg, moving time, altitude and heading from geolocation. Units are km/h, mph, m/s and knots, and there's a simulator for indoors.
- **JARVIS Console** (Tactical): see above.
- **Mission Planner** (Tactical): a checklist with templates, a progress ring, and a countdown that JARVIS calls out, with confetti when the mission is complete.
- **Daily Briefing** (Records): weather, moon phase, sun, battery, achievements, next reminder, mission status, a JARVIS quip and a "tool of the day", which he can read aloud.
- There are 15 new achievements, making 45 in total.

### Visual upgrade
- Layered holographic panels with subtle animated gradients, a panel-head light line and a one-shot holo sweep on each tool change.
- Refined icons for the new tools and spring micro-interactions on the dock, rail and buttons.
- A more cinematic boot: phase labels, a decoding title, a scan line and a flash ring on completion.
- All of it uses transform and opacity only, and it's automatically simplified on the Balanced and Battery tiers.

## Run
```bash
cd nickverse-scanner
python3 -m http.server 8000   # open http://localhost:8000
```
Camera, microphone, motion sensors, geolocation and the service worker need a secure context (https or localhost).

## Navigation
v11 has **27 tools in 5 categories**, so the old tab bar has been retired.
- **Desktop:** a category rail (Optics · Sensors · Environment · Tactical · Records) with the tools for the chosen category underneath.
- **Phones:** a bottom **dock** with 4 favourites and a central **Tools** button that opens a searchable **launcher grid**. Tap ☆ on a tile to pin it to the dock.
- **Command palette:** press `Ctrl/⌘ K` or the 🔍 button to jump to any tool, protocol, action or theme.
- Switching tools uses the View Transitions API: a directional slide-and-blur, with a plain swap as the fallback.

## Tools
**Optics**
1. **Optical Scanner**: live camera HUD, filters (Night-Vision, Thermal, Edge), zoom, QR/barcode (`BarcodeDetector`) and a frozen-frame analysis with the real dominant colour and palette.
2. **AR Overlay** *(new)*: tracking brackets that follow the brightest, most salient or moving region. Also a heading tape, pitch ladder, roll arc, reticle and live telemetry, plus target lock and an "Analyse Target" readout.
3. **Colour Lab** *(new)*: tap to sample (7×7 average) and get HEX/RGB/HSL/CMYK, the nearest named colour (CIE Lab ΔE), an absurd "CINCO Paint" match, and complementary, triadic, analogous and split swatches. Saved swatches and tap-to-copy included.
4. **Text Reader** *(new)*: OCR through the native `TextDetector` where available. Otherwise Tesseract.js is lazy-loaded from a CDN **only when you press Read**. It shows word boxes, copies text and reads it aloud, and you can import an image. It degrades gracefully offline.
5. **Measure** *(new)*: an on-screen ruler (mm/cm and inches, draggable handles) that you calibrate against an 85.6 mm bank card. There's also a tilt protractor (edge and flat modes, hold, set zero).

**Sensors**
6. **Motion & Tilt**: accelerometer/gyro graphs, G-force gauge, shake detector.
7. **Compass & Level**: compass rose and bubble level.
8. **Seismograph** *(new)*: a scrolling drum trace from the accelerometer on the CINCO-Richter scale ("Cat landed", "Nick jumped off the sofa", "Someone opened the biscuit tin"…), with an event log and a Stomp button.
9. **Metal Detector** *(new)*: reads the `Magnetometer` (Generic Sensor API) if present, otherwise a compass-drift estimate. With neither, it runs a **labelled simulation**: find the hidden CINCO coin by following the beeps. The beep rate and pitch rise with field strength.
10. **Pulse Estimator** *(new)*: fingertip PPG using the rear camera and torch (red-channel average, detrending, peak detection, median BPM, signal-quality meter), plus a demo signal. **Entertainment only, not a medical device.**

**Environment**
11. **Weather & Sky** *(new)*: Open-Meteo forecast (no API key) with current conditions, a 24-hour chart, sunrise/sunset arc and city search. It uses a fallback city by time zone until you tap "Use My Location", and the last result is cached. The **sky dome** shows the current sky: Sun, Moon (with phase) and Mercury–Saturn from approximate orbital elements, plus bright stars, constellation lines and the Milky Way. Tap an object to identify it.
12. **Acoustic Analyser**: dB meter, spectrum, waveform, spectrogram.
13. **Photon Suite**: torch, strobe, Morse transmitter and light meter.

**Tactical**
14. **Threat Assessment**: threat index, contacts, Red Alert.
15. **Sonar Sweep**: radar with fictional contacts.
16. **Perimeter Guard** *(new)*: arm it (5-second countdown) and it watches device motion and, optionally, camera motion. When triggered it sounds an alarm, shows a full-screen breach alert and JARVIS protests. There's no PIN: **hold to disarm** for 1.5 s (pointer or keyboard). It keeps running whichever tool is open.

**Records**
17. **System Diagnostics** · 18. **Scan Log** · 19. **Scan Timer** · 20. **Achievements**: 45 bronze, silver and gold badges stored locally, with a toast and a progress bar.

**New in v11:** JARVIS Console, Mission Planner (Tactical) · Soundscape, Clap Switch (Environment) · Paranormal Detector, GPS Speedometer (Sensors) · Daily Briefing (Records).

## Extras
- **Voice commands** *(new)*: Web Speech `SpeechRecognition` (en-GB). Try "Jarvis scan", "red alert", "stand down", "stealth mode", "party mode", "status report", "open radar", "what's the weather", "arm perimeter", "change theme", "mute" or "call the hotline". There's a mic indicator and a live transcript pill. Unsupported browsers get a polite message and the command palette instead.
- **CINCO Customer Support Hotline** *(new)*: an LCD phone tree with DTMF keypad tones, an original synthesized hold-music track with a live visualiser, and a queue position that escalates from 7 to a googol, then ∞, then "behind yourself". No numbers are dialled, nothing is linked and nothing is sold.
- **CINCO catalogue**: 14 absurd products (new: Bluetooth Spoon, Silent Doorbell, Cloud Storage Jar, Self-Folding Map, Anti-Gravity Toast, Pre-Lost Keys, Emotional Support Stapler) and more product recalls.
- **J.A.R.V.I.S.**: British, dry, calls you "Sir", speaks through Web Speech and comments on the new tools.
- **Sound design** *(new)*: separate effect and music buses into a compressor, a convolution-reverb send, new cues (navigation whooshes, locks, badges, boot chord), an optional ambient reactor hum, and Master, Effects and Music volume sliders.
- **Boot sequence** *(new)*: an animated ring, tool icons lighting up, a percentage counter and a time-aware "Good evening, Sir."
- **Accessibility**: an in-app *Reduce motion* setting (it also follows the OS setting), higher-contrast secondary text, focus rings, ARIA roles for navigation, dialogs and live regions, keyboard-operable hold buttons and haptic feedback.
- **Performance**: see *What's new in v11* above.
- **PWA**: versioned assets, network-first pages and cache-first assets (`nickverse-scanner-v11`). An update pill appears when a new version is installed. Cross-origin requests (weather, OCR engine) are never cached.

## Keyboard
`Ctrl/⌘ K` command palette · `G` tool launcher · `[` / `]` previous/next tool · `1–9, 0` classic tools · `Space` primary action ·
`C` voice command · `H` CINCO hotline · `Q` QR · `V` camera filter · `L` light · `R` red alert · `P` protocols · `J` briefing ·
`K` simulate shake · `T` theme · `M` mute · `S` settings · `F` fullscreen · `?` help · `Esc` close

URL flags for testing: `?q=auto|ultra|high|balanced|battery`, `?fps`, `?noboot`, `?tab=weather`, `?theme=neon`, `?simcam`, `?autocam`, `?recall`, `?noupdate`.

## Known limitations
- **iPhone / iPad (Safari):** no torch control, so the Pulse Estimator needs an external light source, and the Photon Suite uses a full-screen light. There's no `Magnetometer`, so the Metal Detector runs a compass-drift estimate or the simulation. No `TextDetector` or `BarcodeDetector`, so OCR downloads Tesseract.js (online, first use) and QR is unavailable. Speech recognition depends on the iOS version and Siri settings. Motion needs the "Enable motion sensors" tap. There's no vibration API, so no haptics.
- **Android (Chrome):** the best overall support, including torch. The Generic Sensor `Magnetometer` is only exposed on some Chrome builds and devices; otherwise the compass-drift estimate is used. Speech recognition uses Google's online service.
- **Desktop:** there are no motion sensors or magnetometer, so Seismograph, Metal Detector, Protractor and the Guard's motion channel are simulated (labelled). Moving the mouse counts as moving the device. Firefox has no speech recognition.
- **Weather** needs a connection for new data (the cached report is shown offline). The sky dome is approximate (±1° for planets, a bit more for the Moon). Faint background stars are decorative.
- **Measure** accuracy depends on calibration. The protractor is only as good as the device's tilt sensor.
- **Pulse** readings are an entertainment estimate, not a medical measurement.
- **v11 fps figures** were measured in headless Chrome with 4× CPU throttling at 390 px@2×, with software rendering, on a shared machine. Real phones use GPU compositing and will differ; the governor adapts either way. On the camera tools, Auto usually settles on Balanced or Battery on slower devices.
- **Voice chat and the wake phrase** need Web Speech recognition (Chrome/Edge, recent Safari). Continuous listening stops when the tab is backgrounded, and some browsers ask for mic permission again. The JARVIS brain is rule-based, so unusual phrasings get a polite shrug.
- **Reminders and timers** only fire while the page is open (plus a system notification if you allow it).
- **GPS Speedometer** is weak indoors and noisy at walking pace; fixes worse than ±60 m are ignored.
- **Clap Switch** can be fooled by other sharp sounds (doors, dropped spoons); use the sensitivity slider.
- **Paranormal Detector** is entirely fake, for fun.
- Hold announcements use a second system voice only if the device has more than one.
- All "analysis", threats, radar contacts, target IDs and ranges are fictional entertainment.

## Credits
Fonts: Orbitron, Rajdhani and Share Tech Mono (SIL OFL 1.1), bundled in `/fonts`. The design is original, with no Marvel or other franchise assets.
Weather data: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0). OCR fallback: Tesseract.js (Apache 2.0), loaded on demand.
CINCO is a fictional parody brand. No products exist, and none were harmed.
