# OpenDraw

Transparent always-on-top drawing overlay for Windows 10/11. Draw over any app;
clicks pass through when not drawing. Runs from the system tray.

## Download

Get `OpenDraw.exe` from the [latest release](../../releases/latest) and run it.
One file, no installer.

> Unsigned, so SmartScreen may warn on first launch — **More info → Run anyway**.

## Controls

| Key | Action |
| --- | --- |
| `Ctrl+Alt+D` | Toggle draw / pass-through |
| `Ctrl+Alt+C` | Clear |
| `Ctrl+Alt+P` / `Ctrl+Alt+E` | Pen / eraser |
| `P` `H` `L` `R` `A` `E` | Pen, Highlighter, Line, Rect, Arrow, Eraser |
| `1`–`9`, `0` | Color |
| `[` / `]` | Brush size |
| `Shift` (line/rect) | Snap 45° / square |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Esc` | Pass-through |

## Made with

Electron — Node.js main process, Chromium renderer (HTML/CSS/JS, Canvas 2D).

## Develop

```
npm install
npm start
```

## Build

```
npm run dist
```

Outputs `dist/OpenDraw.exe`.

## License

[MIT](LICENSE)
