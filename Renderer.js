'use strict';

const Board = document.getElementById('Board');
const Ctx = Board.getContext('2d', { willReadFrequently: true });
const Toolbar = document.getElementById('Toolbar');
const Ring = document.getElementById('CursorRing');

const State = {
  DrawMode: false,
  Tool: 'Pen',
  Color: '#FF3B30',
  Size: 4,
  Drawing: false,
  Start: null,
  Last: null,
  Snapshot: null,
  UndoStack: [],
  RedoStack: [],
  MaxHistory: 40
};

const Colors = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE',
  '#0A84FF', '#BF5AF2', '#FF2D55', '#FFFFFF', '#1A1A1A'
];

const Icons = {
  Pen:         '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>',
  Highlighter: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  Line:        '<path d="M5 19 19 5"/>',
  Rect:        '<rect x="4" y="6" width="16" height="12" rx="1.5"/>',
  Arrow:       '<path d="M5 19 19 5"/><path d="M11 5h8v8"/>',
  Eraser:      '<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4L13 5a2 2 0 0 1 2.8 0l3.4 3.4a2 2 0 0 1 0 2.8L11 19"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  Undo:        '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  Redo:        '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>',
  Trash:       '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  Close:       '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>'
};

const ShapeTools = new Set(['Line', 'Rect', 'Arrow']);

const SizeInput = document.getElementById('Size');
const SizeLabel = document.getElementById('SizeLabel');

function MakeSVG(Name) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" '
    + 'stroke-linecap="round" stroke-linejoin="round">' + (Icons[Name] || '') + '</svg>';
}

function InjectIcons() {
  document.querySelectorAll('[data-ico]').forEach((El) => {
    El.innerHTML = MakeSVG(El.getAttribute('data-ico'));
  });
}

function ResizeBoard() {
  const Prev = Board.width ? Ctx.getImageData(0, 0, Board.width, Board.height) : null;
  const DPR = window.devicePixelRatio || 1;
  const W = window.innerWidth;
  const H = window.innerHeight;
  Board.style.width = W + 'px';
  Board.style.height = H + 'px';
  Board.width = Math.round(W * DPR);
  Board.height = Math.round(H * DPR);
  Ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (Prev) {
    Ctx.save();
    Ctx.setTransform(1, 0, 0, 1, 0, 0);
    Ctx.putImageData(Prev, 0, 0);
    Ctx.restore();
  }
}

function PushHistory() {
  try {
    const Img = Ctx.getImageData(0, 0, Board.width, Board.height);
    State.UndoStack.push(Img);
    if (State.UndoStack.length > State.MaxHistory) State.UndoStack.shift();
    State.RedoStack.length = 0;
  } catch (Err) {}
}

function Undo() {
  if (!State.UndoStack.length) return;
  const Current = Ctx.getImageData(0, 0, Board.width, Board.height);
  State.RedoStack.push(Current);
  RestoreImage(State.UndoStack.pop());
}

function Redo() {
  if (!State.RedoStack.length) return;
  const Current = Ctx.getImageData(0, 0, Board.width, Board.height);
  State.UndoStack.push(Current);
  RestoreImage(State.RedoStack.pop());
}

function RestoreImage(Img) {
  Ctx.save();
  Ctx.setTransform(1, 0, 0, 1, 0, 0);
  Ctx.clearRect(0, 0, Board.width, Board.height);
  Ctx.putImageData(Img, 0, 0);
  Ctx.restore();
}

function ClearAll() {
  PushHistory();
  Ctx.save();
  Ctx.setTransform(1, 0, 0, 1, 0, 0);
  Ctx.clearRect(0, 0, Board.width, Board.height);
  Ctx.restore();
}

function EffectiveSize() {
  if (State.Tool === 'Eraser') return State.Size * 2.5;
  if (State.Tool === 'Highlighter') return Math.max(State.Size * 3, 12);
  return State.Size;
}

function ApplyStroke() {
  Ctx.lineCap = 'round';
  Ctx.lineJoin = 'round';
  if (State.Tool === 'Eraser') {
    Ctx.globalCompositeOperation = 'destination-out';
    Ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else if (State.Tool === 'Highlighter') {
    Ctx.globalCompositeOperation = 'source-over';
    Ctx.strokeStyle = HexToRGBA(State.Color, 0.35);
  } else {
    Ctx.globalCompositeOperation = 'source-over';
    Ctx.strokeStyle = State.Color;
  }
  Ctx.lineWidth = EffectiveSize();
}

function HexToRGBA(Hex, A) {
  const V = Hex.replace('#', '');
  const R = parseInt(V.substring(0, 2), 16);
  const G = parseInt(V.substring(2, 4), 16);
  const B = parseInt(V.substring(4, 6), 16);
  return 'rgba(' + R + ',' + G + ',' + B + ',' + A + ')';
}

function DrawFreehandSegment(From, To) {
  ApplyStroke();
  Ctx.beginPath();
  Ctx.moveTo(From.X, From.Y);
  Ctx.lineTo(To.X, To.Y);
  Ctx.stroke();
}

function DrawShapePreview(From, To, Shift) {
  if (State.Snapshot) RestoreImage(State.Snapshot);
  ApplyStroke();
  Ctx.globalCompositeOperation = 'source-over';
  let End = { X: To.X, Y: To.Y };
  if (State.Tool === 'Line' && Shift) End = SnapTo45(From, To);
  Ctx.beginPath();
  if (State.Tool === 'Line') {
    Ctx.moveTo(From.X, From.Y);
    Ctx.lineTo(End.X, End.Y);
    Ctx.stroke();
  } else if (State.Tool === 'Rect') {
    let X = From.X, Y = From.Y, W = To.X - From.X, H = To.Y - From.Y;
    if (Shift) {
      const S = Math.max(Math.abs(W), Math.abs(H));
      W = Math.sign(W || 1) * S;
      H = Math.sign(H || 1) * S;
    }
    Ctx.strokeRect(X, Y, W, H);
  } else if (State.Tool === 'Arrow') {
    DrawArrow(From, End);
  }
}

function SnapTo45(From, To) {
  const DX = To.X - From.X;
  const DY = To.Y - From.Y;
  const Angle = Math.atan2(DY, DX);
  const Snapped = Math.round(Angle / (Math.PI / 4)) * (Math.PI / 4);
  const Len = Math.hypot(DX, DY);
  return { X: From.X + Math.cos(Snapped) * Len, Y: From.Y + Math.sin(Snapped) * Len };
}

function DrawArrow(From, To) {
  const HeadLen = Math.max(State.Size * 3, 12);
  const Angle = Math.atan2(To.Y - From.Y, To.X - From.X);
  Ctx.beginPath();
  Ctx.moveTo(From.X, From.Y);
  Ctx.lineTo(To.X, To.Y);
  Ctx.stroke();
  Ctx.beginPath();
  Ctx.moveTo(To.X, To.Y);
  Ctx.lineTo(To.X - HeadLen * Math.cos(Angle - Math.PI / 6), To.Y - HeadLen * Math.sin(Angle - Math.PI / 6));
  Ctx.moveTo(To.X, To.Y);
  Ctx.lineTo(To.X - HeadLen * Math.cos(Angle + Math.PI / 6), To.Y - HeadLen * Math.sin(Angle + Math.PI / 6));
  Ctx.stroke();
}

function Pos(E) {
  return { X: E.clientX, Y: E.clientY };
}

function ShowRing(X, Y) {
  const D = Math.max(4, EffectiveSize());
  Ring.style.width = D + 'px';
  Ring.style.height = D + 'px';
  Ring.style.left = X + 'px';
  Ring.style.top = Y + 'px';
  Ring.classList.add('Show');
}

function HideRing() {
  Ring.classList.remove('Show');
}

Board.addEventListener('pointerdown', (E) => {
  if (!State.DrawMode) return;
  if (E.button !== 0) return;
  State.Drawing = true;
  State.Start = Pos(E);
  State.Last = State.Start;
  PushHistory();
  ShowRing(State.Start.X, State.Start.Y);
  if (ShapeTools.has(State.Tool)) {
    State.Snapshot = Ctx.getImageData(0, 0, Board.width, Board.height);
  } else {
    DrawFreehandSegment(State.Start, { X: State.Start.X + 0.01, Y: State.Start.Y });
  }
  Board.setPointerCapture(E.pointerId);
});

Board.addEventListener('pointermove', (E) => {
  if (!State.DrawMode || !State.Drawing) return;
  const P = Pos(E);
  ShowRing(P.X, P.Y);
  if (ShapeTools.has(State.Tool)) {
    DrawShapePreview(State.Start, P, E.shiftKey);
  } else {
    DrawFreehandSegment(State.Last, P);
    State.Last = P;
  }
});

function EndStroke(E) {
  if (!State.Drawing) return;
  State.Drawing = false;
  State.Snapshot = null;
  HideRing();
  if (E && Board.hasPointerCapture && Board.hasPointerCapture(E.pointerId)) {
    Board.releasePointerCapture(E.pointerId);
  }
}
Board.addEventListener('pointerup', EndStroke);
Board.addEventListener('pointercancel', EndStroke);

Toolbar.addEventListener('pointerenter', () => {
  if (!State.DrawMode) window.OpenDraw.SetIgnoreMouse(false);
});
Toolbar.addEventListener('pointerleave', () => {
  if (!State.DrawMode) window.OpenDraw.SetIgnoreMouse(true);
});

function BuildColors() {
  const Wrap = document.getElementById('Colors');
  Colors.forEach((C, I) => {
    const Swatch = document.createElement('div');
    Swatch.className = 'Swatch' + (I === 0 ? ' Active' : '');
    Swatch.style.background = C;
    Swatch.dataset.color = C;
    Swatch.title = C;
    Swatch.addEventListener('click', () => {
      State.Color = C;
      document.querySelectorAll('.Swatch').forEach((El) => El.classList.remove('Active'));
      Swatch.classList.add('Active');
      if (State.Tool === 'Eraser') SetTool('Pen');
      UpdateSizeDot();
    });
    Wrap.appendChild(Swatch);
  });
}

function SetTool(Tool) {
  State.Tool = Tool;
  document.querySelectorAll('.Tool').forEach((El) => {
    El.classList.toggle('Active', El.dataset.tool === Tool);
  });
  UpdateSizeDot();
}

function UpdateSizeDot() {
  const Dot = document.getElementById('SizeDot');
  const Px = Math.max(3, Math.min(20, State.Size));
  Dot.style.width = Px + 'px';
  Dot.style.height = Px + 'px';
  Dot.style.background = State.Tool === 'Eraser' ? '#E8E8E8' : State.Color;
}

function ApplyModeUI() {
  document.body.classList.toggle('Draw', State.DrawMode);
  const Btn = document.getElementById('ModeBtn');
  const Text = document.getElementById('ModeText');
  Btn.classList.toggle('Drawing', State.DrawMode);
  if (State.DrawMode) {
    Text.textContent = 'Drawing';
  } else {
    Text.textContent = 'Pass-through';
    HideRing();
  }
}

let HintTimer = null;
function ShowHint(HTML, MS = 2600) {
  const Hint = document.getElementById('Hint');
  Hint.innerHTML = HTML;
  Hint.classList.add('Show');
  clearTimeout(HintTimer);
  HintTimer = setTimeout(() => Hint.classList.remove('Show'), MS);
}

document.querySelectorAll('.Tool').forEach((Btn) => {
  Btn.addEventListener('click', () => SetTool(Btn.dataset.tool));
});

SizeInput.addEventListener('input', () => {
  State.Size = parseInt(SizeInput.value, 10);
  SizeLabel.textContent = SizeInput.value;
  UpdateSizeDot();
});

document.getElementById('UndoBtn').addEventListener('click', Undo);
document.getElementById('RedoBtn').addEventListener('click', Redo);
document.getElementById('ClearBtn').addEventListener('click', ClearAll);
document.getElementById('QuitBtn').addEventListener('click', () => window.OpenDraw.Quit());
document.getElementById('ModeBtn').addEventListener('click', () => window.OpenDraw.ToggleDrawMode());

window.addEventListener('keydown', (E) => {
  const Mod = E.ctrlKey || E.metaKey;
  if (Mod && E.key.toLowerCase() === 'z') { E.preventDefault(); Undo(); return; }
  if (Mod && E.key.toLowerCase() === 'y') { E.preventDefault(); Redo(); return; }
  if (E.key === 'Escape') { window.OpenDraw.SetDrawMode(false); return; }
  if (!State.DrawMode) return;
  switch (E.key.toLowerCase()) {
    case 'p': SetTool('Pen'); break;
    case 'h': SetTool('Highlighter'); break;
    case 'l': SetTool('Line'); break;
    case 'r': SetTool('Rect'); break;
    case 'a': SetTool('Arrow'); break;
    case 'e': SetTool('Eraser'); break;
    case '[': SizeInput.value = Math.max(1, State.Size - 1); SizeInput.dispatchEvent(new Event('input')); break;
    case ']': SizeInput.value = Math.min(40, State.Size + 1); SizeInput.dispatchEvent(new Event('input')); break;
  }
  if (/[0-9]/.test(E.key)) {
    const Idx = E.key === '0' ? 9 : parseInt(E.key, 10) - 1;
    if (Colors[Idx]) {
      State.Color = Colors[Idx];
      document.querySelectorAll('.Swatch').forEach((El, I) => El.classList.toggle('Active', I === Idx));
      if (State.Tool === 'Eraser') SetTool('Pen');
      UpdateSizeDot();
    }
  }
});

window.OpenDraw.OnDrawMode((On) => {
  State.DrawMode = On;
  ApplyModeUI();
  if (On) {
    ShowHint('Drawing — <kbd>Esc</kbd> or <kbd>Ctrl+Alt+D</kbd> to click through');
  } else {
    ShowHint('Pass-through — <kbd>Ctrl+Alt+D</kbd> to draw');
  }
});
window.OpenDraw.OnClear(() => ClearAll());
window.OpenDraw.OnUndo(() => Undo());
window.OpenDraw.OnTool((Tool) => SetTool(Tool));
window.OpenDraw.OnResized(() => ResizeBoard());

window.addEventListener('resize', ResizeBoard);

ResizeBoard();
InjectIcons();
BuildColors();
SetTool('Pen');
ApplyModeUI();
UpdateSizeDot();
ShowHint('<kbd>Ctrl+Alt+D</kbd> to draw', 4000);
