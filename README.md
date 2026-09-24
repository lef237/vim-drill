# Vim Drill

A frontend-only app for practicing Vim commands, one question at a time.

Each question shows a task and the goal state. You edit real text in an in-browser Vim editor (CodeMirror 6 + `@replit/codemirror-vim`), and the question is cleared once your buffer matches the goal.

## Modes

- **Practice mode**: The model answer is shown as a sequence of keys. Type exactly that sequence to pass.
  - If you press a wrong key, the question resets automatically after a short pause.
  - If you reach the goal with a different sequence, it counts as an alternative solution, and you are asked to try again with the keys shown.
- **Test mode**: No answer is shown. Any sequence counts as long as the text and cursor position match the goal.
  - If you used more keystrokes than the model answer, a shorter solution is suggested.

## Controls (fully keyboard-driven)

| Screen | Keys |
| --- | --- |
| Home | `1` practice / `2` test / `c` category / `l` level / `n` number of questions (hold Shift to cycle backwards) / `t` switch language / `Enter` start |
| Quiz | `:hint` show a hint / `:reset` start over / `:skip` skip / `:q` back to home |
| Results | `r` same settings again / `w` only the missed questions / `Enter` back to home |

Progress is stored in `localStorage`. Questions you missed or skipped are asked more often in later sessions.

## Language (Japanese / English)

The display language is chosen in this order:

1. The `?lang=ja` / `?lang=en` URL parameter
2. The language you picked and saved on the home screen
3. The browser's language settings (Japanese if any starts with `ja`, otherwise English)

UI strings live in `src/i18n/messages.ts`. A missing English entry is a type error.

## Keyboard extensions such as Vimium

Vimium intercepts the Esc key while you are typing in a text field and moves focus away from it, so Esc never reaches the editor.

A page cannot detect browser extensions directly, so the app infers it from the symptom. If the editor loses focus without a click or a window switch, a warning asks you to add this site to the extension's exclusion list.

## Development

```bash
npm install
npm run dev
```

### Tests

Tests run in Vitest browser mode (Playwright). For every question, the model answers are typed into a real browser to confirm that they reach the goal.

```bash
npx playwright install chromium   # first time only
npm test
```

To use your installed Chrome instead:

```bash
PW_CHANNEL=chrome npm test
```

### Adding questions

Questions live in `src/problems/data/*.ts`. The cursor position is marked with `|`.

```ts
{
  id: 'edit-dw',                 // unique ID
  category: 'edit',
  level: 1,
  prompt: {                      // both Japanese and English are required (checked by tests)
    ja: 'カーソル位置の単語（後ろの空白も）を削除',
    en: 'Delete the word under the cursor (and the space after it)',
  },
  before: 'const |foo = bar;',   // use an array for multiple lines
  after: 'const |= bar;',
  answers: ['dw'],               // the first one is shown in practice mode
  // checkCursor: false,         // don't check the cursor position
  // hint: { ja: '…', en: '…' },
  // language: 'html',           // needed for tag text objects such as `it` / `at`
}
```

Run `npm test` after adding questions. If the emulator behaves differently from real Vim, the test fails and shows the actual result.

Known differences and caveats:
- `dG` to the end of the file leaves one empty line behind.
- Pasting a line that was deleted (or yanked) from the last line inserts an extra empty line. `dd` on the last line itself works correctly.
- After `P`, the cursor ends up one character to the right of where real Vim puts it.
- Don't write questions that rely on keys the browser reserves (`Ctrl-w`, `Ctrl-t`, `Ctrl-n`, etc.).

## Deployment (Cloudflare Workers Static Assets)

```bash
npx wrangler login
npm run deploy
```

The configuration is in `wrangler.jsonc`. To deploy from GitHub, connect the repository in Workers Builds on the Cloudflare dashboard, with `npm run build` as the build command and `npx wrangler deploy` as the deploy command.
