# Remember Position

Reopens each document scrolled to the cursor location it had the last time it
was open — so you pick up exactly where you left off.

## How it works

- When you open a document, the cursor and scroll position are restored to where
  they were when you last closed it.
- The position is tracked as you work and saved when you stop typing, save, close
  the tab, or quit Nova.
- Positions are stored globally (per document), so they persist across restarts
  and across windows. Unsaved (untitled) documents are ignored.

## Commands

- **Remember Position: Clear Saved Positions** — forgets every stored position.

## Notes

Nova may also restore scroll position within a single session on its own; this
extension makes it explicit and persistent across full quits and relaunches.
