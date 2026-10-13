# Post Studio — Instagram post editor

A mobile-first Instagram post editor built around one idea: **tap what you want
to change**. Direct canvas manipulation like Canva, plus a guided Quick Edit
path for people who don't use design software.

## The flow

```
Home → Create post → Size → Pick a design → Edit → Done → Create my post → Save / Share
```

## Editing

**Tap anything.** Elements are individually selectable on the canvas. Tap once
to select; tap a selected text element again and the keyboard opens with the
caret on the design itself — the artwork updates live as you type, in the
template's own font, size, weight, colour and alignment. No separate form.

**Direct manipulation.** Drag to move, corner handles to resize (photos and
ornaments keep their aspect ratio), a rotate handle below the selection with
45° snapping, and a floating action bar above the selection for replace,
duplicate, bring-to-front and delete.

**Zoom and pan.** Pinch to zoom from 40% up to 400%, drag empty space to pan,
and a fit-to-screen button to get back. Selection handles stay finger-sized at
every zoom level, so small elements never need precise taps.

**Smart positioning.** Moving an element snaps to the canvas centre lines and
the standard margin, with guides showing when it locks on.

**Quick Edit** (the beginner path). One button opens a plain-language menu —
Profile, Text, Pictures, Background. Choosing "Text" lists every line by name
with a preview of its content; picking one zooms the canvas to it and starts
editing. It's a shortcut to the same elements, not a parallel system.

## Profile

Three modes, switchable at any time and remembered between designs:

1. Profile picture + handle
2. Handle only — just `@kenzie.rest`
3. No profile at all

Instagram's own UI chrome (like, comment, share, bookmark) never appears on the
artwork. The handle area is part of the design; the app's interface icons stay
in the app.

## Templates

16 templates rebuilt from the supplied reference designs — layout, composition,
type hierarchy, shapes and ornaments — as structured editable layers, never
flattened images:

Ribbon Serif · Mascot Point · Stencil Bold · Hey You · Soft Editorial ·
Highlighter · Did You Know · Mixed Weight · Dashed Route · Hello Monday ·
Panel Pop · Feedback Card · Quote Card · Fact Slab · Night Quote · Paper Serif

Plus a Blank canvas. Decorative parts (blobs, quote marks, squiggles, dashed
routes, badges, frames, arrows) are preset vectors — recolourable, resizable
and deletable like any other element.

## Sizes

- **Square** — 1:1, exports 1080 × 1080
- **Portrait** — 4 × 4.8 in, exports 1080 × 1296

Templates are defined in percentages, so the same composition holds on both.

## Interface

One strong primary (`#F02D63`), neutral surfaces, clear text hierarchy, no
gradients. Icons are a hand-built rounded set (`src/ui/icons.tsx`) rather than a
stock icon pack. Controls are contextual: text tools when text is selected,
picture tools when a picture is selected, and general tools when nothing is.

## Run

```
npm install
npm run dev      # http://localhost:3000, open in a mobile viewport
npm run build
npm run lint     # typecheck
```

## Structure

```
src/
  types/index.ts          element, background, project model
  store/useStore.ts       state, undo/redo, profile modes, persistence
  render/Render.tsx       one renderer for canvas, thumbnails and export
  editor/
    EditorCanvas.tsx      zoom, pan, selection, live inline text editing
    QuickEdit.tsx         guided menu + profile sheet
    ContextBar.tsx        contextual tools + add sheet
    kit.tsx               sheets, sliders, colour picker
  ui/icons.tsx            the icon set
  ui/Decor.tsx            preset vector ornaments
  utils/templates*.ts     the 16 templates
  screens/                home, size, template, editor, preview, designs
scripts/qa.tsx            dev-only: renders every template to HTML for review
```

## Shipping to Android

Wrap `dist/` with Capacitor (`npx cap add android`). Save and Share currently
use browser fallbacks; swap them for the native filesystem and share-sheet
plugins in `src/utils/exporter.ts`. Photos are stored as base64 in local
storage — move these to the filesystem for a production build.
