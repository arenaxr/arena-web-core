# Contributing to ARENA Web Core

The general Contribution Guide for all ARENA projects can be found [here](https://docs.arenaxr.org/content/contributing.html).

This document covers **development rules and conventions** specific to `arena-web-core`. These rules are mandatory for all contributors, including automated/agentic coding tools.

## Development Rules

### 1. MQTT Topics — Always Use the `TOPICS` Constructor

**Never hardcode MQTT topic strings.** All topic paths must be constructed using the `TOPICS` constant from [`src/constants/topics.js`](src/constants/topics.js) with `formatStr()` for variable interpolation.

This enables future topic format refactoring without scattered string updates.

```javascript
// ✅ CORRECT — Use TOPICS with formatStr
import TOPICS from '../../constants/topics.js';

const topic = TOPICS.PUBLISH.SCENE_OBJECTS.formatStr({
    nameSpace: namespace,
    sceneName: sceneId,
    userClient: this.arena.userClient,
    objectId: objectId,
});

// ❌ WRONG — Never hardcode topic strings
const topic = `realm/s/${namespace}/${sceneId}/o/${userClient}/${objectId}`;
```

For unbundled page scripts (e.g., `scenes/scenes.js`, `build/main.js`) that cannot use ES6 `import`, `TOPICS` can be imported directly since those scripts use `<script type="module">`:

```javascript
import TOPICS from '../src/constants/topics.js';
```

### 2. Content Security Policy — No Inline Scripts

The ARENA deployment uses a strict [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/API/Content_Security_Policy) that **blocks inline scripts**. The `script-src` directive is set to `'self'` plus specific CDN domains and SHA hashes.

**All JavaScript must be in external `.js` files**, never inline in HTML.

```html
<!-- ✅ CORRECT — External script file -->
<script src="my-page.js"></script>

<!-- ❌ WRONG — Inline scripts are blocked by CSP -->
<script>
  window.addEventListener('load', () => { /* ... */ });
</script>
```

If you need page-specific initialization logic, create a small external JS file (e.g., `replay/replay-ui.js`) and reference it via `<script src="...">`.

### 3. Styling — Prefer CSS Classes Over Inline Styles

Move visual styling to CSS files whenever possible. Use CSS classes instead of setting `element.style.*` properties in JavaScript.

The primary stylesheet for the 3D scene UI is [`src/style/arena.css`](src/style/arena.css).

```javascript
// ✅ CORRECT — Use CSS classes
btn.classList.add('disabled');

// ❌ AVOID — Inline styles are harder to maintain
btn.style.color = '#999';
btn.style.pointerEvents = 'none';
```

Exceptions are acceptable for truly dynamic values (e.g., computed positions) that cannot be expressed in static CSS.

### 4. Authentication — Wait for `onauth` Before Authenticated Requests

The ARENA auth system is asynchronous. Any code that requires authentication (MQTT tokens, REST API calls to `/recorder/`, `/persist/`, etc.) **must wait for the `onauth` event** before executing.

```javascript
// ✅ CORRECT — Wait for auth
window.addEventListener('onauth', async (e) => {
    const { mqtt_username, mqtt_token } = e.detail;
    // Now safe to make authenticated requests
});

// ❌ WRONG — Token may not exist yet
fetch('/recorder/list', { credentials: 'same-origin' }); // 401 error
```

### 5. UI Visibility — Show Disabled, Don't Hide

When a feature is unavailable due to permissions (not platform constraints), **show the UI element in a disabled state** with an explanatory tooltip, rather than hiding it entirely. This helps users understand what features exist and what permissions they need.

```javascript
// ✅ CORRECT — Visible but disabled with tooltip
btn.setAttribute('title', 'Recording requires scene editor permissions');
btn.classList.add('disabled');
btn.onclick = (e) => e.preventDefault();

// ❌ AVOID — Hidden leaves users unaware the feature exists
if (hasPermission) {
    container.appendChild(btn);
}
```

Platform constraints (e.g., mobile, no Jitsi) where the feature genuinely cannot function are acceptable reasons to hide UI elements entirely.

### 6. Module Initialization — Guard Against Race Conditions

A-Frame systems and components initialize asynchronously. Use the event system (`ARENA_EVENTS`) rather than assuming objects exist at module load time.

```javascript
// ✅ CORRECT — Lazy initialization / event-driven
ARENA.events.addMultiEventListener(
    [ARENA_EVENTS.ARENA_LOADED, ARENA_EVENTS.JITSI_LOADED],
    this.ready.bind(this)
);

// ❌ WRONG — May crash if dependency isn't loaded yet
const actions = Object.keys(AFRAME.components); // undefined at import time
```

### 7. Unbundled vs Bundled Scripts

The codebase has two types of JavaScript:

- **Bundled** (`src/`): Processed by Parcel, supports ES6 `import`/`export`, has access to all constants and utilities.
- **Unbundled** (`scenes/`, `build/`, `replay/`, `static/`): Loaded directly via `<script>` tags, must be self-contained or use `<script type="module">` for imports.

When adding functionality to unbundled scripts:
- Use `<script type="module">` when ES6 imports are needed
- Access shared state via `window.*` globals (`ARENA`, `ARENAAUTH`, `ARENADefaults`)
- Never assume bundled module internals are available on `window` unless explicitly exposed

### 8. Dependencies — Pin All Versions

**All dependencies in `package.json` must use exact versions** (no `^`, `~`, or `*` ranges). This prevents version drift across environments and ensures reproducible builds.

```json
// ✅ CORRECT — Exact pinned version
"three": "0.149.0"

// ❌ WRONG — Semver range allows drift
"three": "^0.149.0"
```

When adding or updating a dependency:
- Use `npm install --save-exact <package>@<version>` to pin automatically
- Verify `package.json` does not contain `^` or `~` prefixes before committing
- Always commit `package-lock.json` alongside `package.json` changes

### 9. Repo Linting & Formatting

This repository enforces code style using [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/). Before submitting a pull request, you **must** format and lint your javascript files.

```bash
# Automatically format code using Prettier
npm run format

# Find and automatically fix linting errors using ESLint
npm run lint
```

## Build & Local Verification

**This repository has no unit-test suite** — there is no test framework, no `npm test` script, and no workflow that runs tests. The only automated check on a pull request is the [Build workflow](.github/workflows/build.yaml), which installs dependencies and runs the Parcel bundler. Reproduce that same signal locally before you push:

```bash
# Install exactly the locked dependencies (Node version comes from .nvmrc)
npm ci

# The exact production build CI runs, with a cold cache
npm run build-ci
```

Exit code 0 with output written to the git-ignored `dist/` means your change builds; a bundling error exits non-zero and is what CI reports as a failed check. On a warm `node_modules` the build takes well under a minute.

For day-to-day work use the watch build, which rebuilds on save:

```bash
npm run watch
```

Verification beyond that is manual: load the built scene in a browser and exercise the feature you changed.

> [!NOTE]
> `npm run lint` and `npm run format` are **not** run by CI, and both rewrite files in place (`eslint --fix`, `prettier -w`). `master` is not currently lint-clean, so expect pre-existing errors that are not yours — check `git diff` afterwards and commit only changes to files you actually touched.

## File Structure Conventions

| Directory | Type | Purpose |
|-----------|------|---------|
| `src/` | Bundled (Parcel) | Core A-Frame systems, components, and utilities |
| `src/constants/` | Bundled | Shared constants: events, topics, defaults |
| `src/style/` | Bundled | CSS stylesheets (processed by Parcel) |
| `build/` | Module script | Scene editor (Build JSON) page |
| `scenes/` | Standalone script | Scene selector page |
| `replay/` | Standalone + Bundle | 3D replay viewer page |
| `static/` | Standalone | Shared vendor libs, auth, navbar |
| `conf/` | Config | Deployment defaults |

The `arena-web-core` uses [Release Please](https://github.com/googleapis/release-please) to automate CHANGELOG generation and semantic versioning. Your PR titles *must* follow Conventional Commit standards (e.g., `feat:`, `fix:`, `chore:`).

> [!CAUTION]
> **Never use `BREAKING CHANGE` in commit/PR bodies or the `!` suffix on commit/PR types (e.g., `feat!:`, `fix!:`).** These tokens cause release-please to automatically bump the major version. Major version increments are reserved for the maintainer's explicit decision — contributors and agents do not decide what constitutes a breaking change for semver purposes.

> [!IMPORTANT]
> **Issue and PR References in Commit & PR Messages:**
> Only use `#NN` notation in commit messages, PR titles, and PR descriptions if they correspond to actual GitHub issues or pull requests. Do **not** use `#NN` notation for internal enumerations of planning docs or triage items (e.g., use `Task NN` or plain text instead), as this creates erroneous links and may result in unintended automatic actions.


## CI & Dependency Management Conventions
- **GitHub Actions Tag SHA Pinning**: All GitHub Action references in `.github/workflows/` MUST be pinned to the exact commit SHA of the official release tag (e.g., `uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0`).
- **Inline Version Comments**: The inline comment next to the SHA MUST specify the exact tag version used. This enables Dependabot to recognize the release version, generate human-readable SemVer PR titles (`from X.Y.Z to A.B.C`), and automatically update version comments during upgrades.