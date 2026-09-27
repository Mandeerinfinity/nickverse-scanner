# NICK-VERSE Scanner

*A CINCO Corporation Product. Model: CINCO Nick-Verse Scan-O-Matic 9000. Seeing Things, Now With More Things.™*

A handheld sensor-array HUD for Nick, and the companion to the [NICK-VERSE Watch](https://mandeerinfinity.github.io/nickverse-watch/).
It's a self-contained static PWA with no build step and no CDNs. It uses vanilla JS, Canvas 2D, Web Audio, Web Speech and the device sensor APIs.
It's built mobile-first and also lays out as a three-column command deck on desktop.

## Run
```bash
cd nickverse-scanner
python3 -m http.server 8000   # open http://localhost:8000
```
Camera, microphone, motion sensors and the service worker need a secure context (https or localhost).

## Modules (10 tabs)
1. **Scan (optical scanner)**: live camera with an animated HUD (corner brackets, reticle, range ticks, live histogram, centre-colour sampler) and filters: Normal, Night-Vision, Thermal and Edge-detect.
   It has digital or hardware zoom and a front/rear flip. **SCAN** freezes the frame and reports the real dominant colour, a 5-colour palette and brightness, plus an absurd *entertainment-only* object analysis and verdict.
   **QR/barcode** reading uses `BarcodeDetector` where the browser supports it. If there's no camera, you get a clearly labelled simulated feed.
2. **Motion**: live accelerometer and gyroscope graphs, a G-force gauge with peak hold, a shake detector with sensitivity control, and the iOS "Enable motion sensors" permission button.
3. **Nav**: compass rose with bearing marks, plus a bubble level with zero calibration and a "level" chime.
4. **Audio**: dB meter gauge (peak and average), a 56-band spectrum, waveform, scrolling spectrogram and a sound classifier. Choose the live microphone or a simulated signal.
5. **Threat**: threat-index ring built from the acoustic, kinetic, darkness and "anomaly" factors, a fictional contact list, a JARVIS assessment, and **Red Alert** (klaxon, red palette, pulsing edges, stand-down banner).
6. **Light**: torch via camera `torch` where supported, otherwise a full-screen light in 5 colours. Also a strobe (confirmation plus photosensitivity warning, capped at 12 Hz), a **Morse transmitter** with an SOS preset, speed control, optional beep and a live code display, and a **light meter** that uses the ambient light sensor, a camera estimate or a simulated value.
7. **Radar**: sonar sweep with fading phosphor trails, ping sound, 3 ranges, a pulse wave and wandering fake contacts ("Lost Left Sock", "Cat (Probable)"…). A mini sonar runs in the sidebar.
8. **System**: battery, network, FPS sparkline, uptime, a device info grid and a sensor capability matrix.
9. **Log**: scans with thumbnails saved in localStorage (up to 30). Includes a detail view, delete, JSON export and a two-tap clear.
10. **Timer**: stopwatch-style scan timer with marks/splits and a 5-second timed auto-scan.

## Extras
- **J.A.R.V.I.S.**: British, formal, dryly witty. It speaks aloud through Web Speech, preferring an en-GB voice. It gives a spoken **status briefing**, analysis, quips and commentary on scans, shakes and alerts, all with an animated voice orb.
- **Protocols menu** (`P`): Standard, Stealth (dimmed and silent), Party (confetti, hue cycling and a beat), Red Alert, Diagnostics (a self-test with commentary) and Briefing.
- **Secret theme**: enter the Konami code (↑↑↓↓←→←→BA), or tap the NICK-VERSE logo 7 times, to unlock *CINCO Executive Gold*.
- **CINCO Corporation parody**: a rotating "Also try the CINCO ___" ad that opens an infomercial. **Buy Now** never buys anything, never links out, and only gets more ridiculous. There are also random **product recall** notices, a footer stamp and absurd warranty text.
- **5 themes plus 1 secret theme**, with smooth colour-interpolated transitions. Also depth particles, scanlines, glassmorphism, parallax tilt, high-DPI canvases and a 60 fps requestAnimationFrame loop that only draws the visible module.
- **Settings drawer**: effects, UI sounds, haptics, voice, commentary, volume, forced simulation, wake lock, mic calibration offset, ads and recalls, PWA install and reset.
- **PWA**: manifest, icons and an offline cache-first service worker.

## Keyboard
`1–9, 0` tabs · `Space` primary action (scan / start / assess / pulse…) · `Q` QR mode · `V` cycle camera filter · `L` light ·
`R` red alert · `P` protocols · `J` JARVIS briefing · `K` simulate shake · `T` / `Shift+T` theme · `M` mute · `S` settings ·
`F` fullscreen · `?` help · `Esc` close/dismiss

URL flags for testing: `?noboot`, `?tab=radar`, `?theme=neon`, `?simcam`, `?autocam`, `?recall`.

## Known limitations
- **Torch** only works on Chrome for Android with a rear camera that exposes `torch`. iOS and desktop use the full-screen light.
- **QR/barcode scanning** needs `BarcodeDetector` (Chrome/Edge on Android and ChromeOS, macOS Chrome). iOS Safari and Firefox don't have it, and the UI says so.
- **Compass** needs a magnetometer. Some Android devices only give a relative heading, which is labelled. Desktop headings are simulated.
- **dB values** are approximate (uncalibrated, with a manual offset in settings). **Lux** is usually a camera estimate, and auto-exposure affects it.
- **iOS** requires tapping "Enable motion sensors" before motion or orientation data flows, and it has no vibration API.
- **Desktop browsers** have no motion sensors, so Motion and Nav run a clearly labelled simulation that follows the mouse.
- Speech voice quality depends on the OS voices installed. Audio starts only after your first tap or keypress.
- All "analysis", threats and radar contacts are fictional entertainment.

## Credits
Fonts: Orbitron, Rajdhani and Share Tech Mono (SIL OFL 1.1), bundled in `/fonts`. The design is original, with no Marvel or other franchise assets.
CINCO is a fictional parody brand. No products exist, and none were harmed.
