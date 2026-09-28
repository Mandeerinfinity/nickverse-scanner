# NICK-VERSE Scanner · v10

*A CINCO Corporation Product. Model: CINCO Nick-Verse Scan-O-Matic 9000, Mark X. Seeing Things, Now With More Things.™*

A handheld sensor-array HUD for Nick, and the companion to the [NICK-VERSE Watch](https://mandeerinfinity.github.io/nickverse-watch/).
It's a self-contained static PWA with no build step. It uses vanilla JS, Canvas 2D, Web Audio, Web Speech and the device sensor APIs.
It's built mobile-first and lays out as a three-column command deck on desktop.

**Live:** https://mandeerinfinity.github.io/nickverse-scanner/

## Run
```bash
cd nickverse-scanner
python3 -m http.server 8000   # open http://localhost:8000
```
Camera, microphone, motion sensors, geolocation and the service worker need a secure context (https or localhost).

## Navigation
v10 has **20 tools in 5 categories**, so the old tab bar has been retired.
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
17. **System Diagnostics** · 18. **Scan Log** · 19. **Scan Timer** · 20. **Achievements** *(new)*: 30 bronze, silver and gold badges stored locally, with a toast and a progress bar.

## Extras
- **Voice commands** *(new)*: Web Speech `SpeechRecognition` (en-GB). Try "Jarvis scan", "red alert", "stand down", "stealth mode", "party mode", "status report", "open radar", "what's the weather", "arm perimeter", "change theme", "mute" or "call the hotline". There's a mic indicator and a live transcript pill. Unsupported browsers get a polite message and the command palette instead.
- **CINCO Customer Support Hotline** *(new)*: an LCD phone tree with DTMF keypad tones, an original synthesized hold-music track with a live visualiser, and a queue position that escalates from 7 to a googol, then ∞, then "behind yourself". No numbers are dialled, nothing is linked and nothing is sold.
- **CINCO catalogue**: 14 absurd products (new: Bluetooth Spoon, Silent Doorbell, Cloud Storage Jar, Self-Folding Map, Anti-Gravity Toast, Pre-Lost Keys, Emotional Support Stapler) and more product recalls.
- **J.A.R.V.I.S.**: British, dry, calls you "Sir", speaks through Web Speech and comments on the new tools.
- **Sound design** *(new)*: separate effect and music buses into a compressor, a convolution-reverb send, new cues (navigation whooshes, locks, badges, boot chord), an optional ambient reactor hum, and Master, Effects and Music volume sliders.
- **Boot sequence** *(new)*: an animated ring, tool icons lighting up, a percentage counter and a time-aware "Good evening, Sir."
- **Accessibility**: an in-app *Reduce motion* setting (it also follows the OS setting), higher-contrast secondary text, focus rings, ARIA roles for navigation, dialogs and live regions, keyboard-operable hold buttons and haptic feedback.
- **Performance**: only the visible tool draws. Sensors, the magnetometer, the torch and camera analysis stop or throttle when their tool is hidden. Adaptive quality thins the particle field when the frame rate drops.
- **PWA**: versioned assets, network-first pages and cache-first assets (`nickverse-scanner-v10`). An update pill appears when a new version is installed. Cross-origin requests (weather, OCR engine) are never cached.

## Keyboard
`Ctrl/⌘ K` command palette · `G` tool launcher · `[` / `]` previous/next tool · `1–9, 0` classic tools · `Space` primary action ·
`C` voice command · `H` CINCO hotline · `Q` QR · `V` camera filter · `L` light · `R` red alert · `P` protocols · `J` briefing ·
`K` simulate shake · `T` theme · `M` mute · `S` settings · `F` fullscreen · `?` help · `Esc` close

URL flags for testing: `?noboot`, `?tab=weather`, `?theme=neon`, `?simcam`, `?autocam`, `?recall`, `?noupdate`.

## Known limitations
- **iPhone / iPad (Safari):** no torch control, so the Pulse Estimator needs an external light source, and the Photon Suite uses a full-screen light. There's no `Magnetometer`, so the Metal Detector runs a compass-drift estimate or the simulation. No `TextDetector` or `BarcodeDetector`, so OCR downloads Tesseract.js (online, first use) and QR is unavailable. Speech recognition depends on the iOS version and Siri settings. Motion needs the "Enable motion sensors" tap. There's no vibration API, so no haptics.
- **Android (Chrome):** the best overall support, including torch. The Generic Sensor `Magnetometer` is only exposed on some Chrome builds and devices; otherwise the compass-drift estimate is used. Speech recognition uses Google's online service.
- **Desktop:** there are no motion sensors or magnetometer, so Seismograph, Metal Detector, Protractor and the Guard's motion channel are simulated (labelled). Moving the mouse counts as moving the device. Firefox has no speech recognition.
- **Weather** needs a connection for new data (the cached report is shown offline). The sky dome is approximate (±1° for planets, a bit more for the Moon). Faint background stars are decorative.
- **Measure** accuracy depends on calibration. The protractor is only as good as the device's tilt sensor.
- **Pulse** readings are an entertainment estimate, not a medical measurement.
- All "analysis", threats, radar contacts, target IDs and ranges are fictional entertainment.

## Credits
Fonts: Orbitron, Rajdhani and Share Tech Mono (SIL OFL 1.1), bundled in `/fonts`. The design is original, with no Marvel or other franchise assets.
Weather data: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0). OCR fallback: Tesseract.js (Apache 2.0), loaded on demand.
CINCO is a fictional parody brand. No products exist, and none were harmed.
