---
name: simple-todo-list-localstorage
description: Use when you need a quick, single-page todo list that persists data in the browser's localStorage using vanilla HTML, CSS, and JavaScript.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [todo, frontend, localstorage, vanilla-js]
    related_skills: [writing-plans, requesting-code-review]
---
# Simple Todo List with localStorage

## Overview
A minimal, dependency‑free todo application that stores items in the browser's `localStorage`. Ideal for prototypes, learning exercises, or lightweight internal tools.

## When to Use
- You need a client‑only todo list without a backend.
- You want to demonstrate or teach CRUD operations with persistent storage.
- You prefer zero‑build‑step projects (plain HTML/CSS/JS).

## Folder Structure
```
todo-project/
├─ index.html
├─ style.css
└─ script.js
```

## Steps
1. **Create the project folder**  
   ```bash
   mkdir -p ~/hermes/todo-project && cd ~/hermes/todo-project
   ```
2. **Add `index.html`** (see template in `references/index.html` or copy from below).  
3. **Add `style.css`** (see template).  
4. **Add `script.js`** (see template).  
5. **Open `index.html` in a browser** – the app will load any existing todos from `localStorage`.  
6. **Use the UI** to add, edit, complete, and delete items. Data persists across page reloads.

## Code Templates
The skill includes ready‑to‑copy files in the `templates/` directory:
- `templates/index.html`
- `templates/style.css`
- `templates/script.js`

Copy them into your project folder:
```bash
cp templates/* .
```

## Common Pitfalls
- **Storage quota:** Browsers limit `localStorage` to ~5 MB; avoid storing large blobs.
- **Data type:** Only strings can be stored directly; we serialize the todo array with `JSON.stringify`.
- **Same‑origin restriction:** `localStorage` is tied to the scheme, host, and port. Opening the file via `file://` works, but some browsers isolate each file URL; serving via a local HTTP server (e.g., `python -m http.shared`) ensures consistent storage.
- **Event delegation:** For larger lists, consider delegating click events to the `<ul>` element instead of attaching listeners to each button.

## Verification Checklist
- [ ] Page loads without console errors.
- [ ] Adding a todo appears in the list.
- [ ] After a page refresh, the added todo is still present.
- [ ] Edit, complete, and delete functions work and persist.
- [ ] No duplicate IDs or lost focus bugs when editing.

## References
- `references/browser-storage.md` – notes on `localStorage` API and limits.
- `references/sample-data.json` – example of the stored JSON structure.

## Related Skills
- `writing-plans` – if you need to expand this into a larger feature set.
- `requesting-code-review` – for peer review of the generated code.