# ARENA 3D Replay Architecture Exploration

This document outlines an architectural proposal for implementing the ARENA 3D Replay feature. This allows users to record a scene's state and MQTT message timeline, and scrub through it like a 3D video.

*Based on user feedback, the complex "reverse-channel" mutation tracking has been tabled in favor of a robust Keyframe + Fast-Forward approach.*

---

## Storage & Ingestion Architecture

> **Why a new storage system?**
> `arena-persist` is fundamentally a spatial database designed to quickly query the *CURRENT HEAD* state of all objects in a scene. Storing thousands of rapidly changing MQTT payloads per second into a MongoDB `objects` collection would cause massive bloat, index fragmentation, and degrade Editor performance. 
> 
> *Conclusion: 3D Replay requires an independent Time-Series log.*

### 1. Recording Microservice (`arena-recorder`)
A dedicated backend service—highly recommended to be built in **Go (Golang)** due to its lightweight Goroutines excelling at high-throughput, concurrent I/O operations (streaming thousands of MQTT messages across multiple scenes to disk simultaneously without GIL/Event-Loop blocking).
- **Initialization**: When recording starts, `arena-recorder` requests a full scene dump from `arena-persist` at $t=0$ and writes it as the initial keyframe.
- **Stream Capture**: Subscribes to the scene's `#` wildcard topic and buffers incoming `action: create/update/delete` messages.
- **Storage Strategy**: Writes the buffered MQTT payloads to chunked `.jsonl` or binary files on disk. 
  - **Crucially, this data MUST NOT reside in the standard ARENA user file store** (which is optimized for ad-hoc binary media). Instead, `arena-recorder` will have its own dedicated Docker volume (e.g., `/recording-store`), managed entirely by the `arena-recorder` service.
  - This isolated architectural boundary allows the service to enforce strict **TTLs (Time To Live), max file size limits, per-user recording quotas, and transparent scale** without ever risking "bloat" or Disk-Full scenarios for the primary file store.

---

## Playback Architecture

> **Leveraging `?build3d=1` constraints:**
> `build3d` injects highly interactive editing components (gizmos, click listeners, attribution handles) that actively emit MQTT mutations back to the broker. Injecting historical replay messages into a fully interactive scene risks "muddying the waters" and causing severe desyncs if the user accidental clicks a historical object.
> 
> *Conclusion: Playback should be strictly isolated to read-only environments.*

### 2. Primary Playback Architecture (Local Client Pump)
> *For the initial V1 release, the system will heavily prioritize an ultra-responsive, single-viewer experience. This avoids the immediate hurdle of building dynamic MQTT Auth/ACL rules required for server-side proxying.*

When a user initiates a replay, the `replay.html` client handles the timeline natively in the browser:
- **REST File Streaming**: The client authenticates against the `arena-recorder` backend and fetches the `.jsonl` replay file (or chunks) **via a strict REST API**, storing the historical messages in local browser memory.
- **Local Timeline Engine**: `replay.js` implements a custom A-Frame `system` that replaces the standard ARENA MQTT real-time loop. It "pumps" the downloaded JSON messages into the scene components locally based on the elapsed playhead time.
- **Instant Scrubbing**: Because the data is local, the user can scrub back and forth with zero network latency. When seeking ($T_{50}$), the local engine instantly locates the nearest previous keyframe, resets the scene, and rapidly loops over the array in memory up to the target timestamp before resuming normal speed.

### 3. Read-Only Spectator Client (`replay.html`)
- **Clean Slate**: It loads `a-scene` but explicitly disables `build3d`, `jitsi`, `chat`, click listeners, and physics colliders to prevent the spectator from altering the local timeline. 
- **Pre-loading**: Parses the `.jsonl` metadata at load to extract all unique `gltf-model` URLs. Forces a pre-fetch (memory load) for all assets so scrubbing doesn't stutter on HTTP requests.
- **Time-Series Scrubber UI**: A 2D HTML/CSS overlay at the bottom displaying the timeline slider and controls (Play, Pause, Speed).

---

## Phase 2 / Future Expansion: Multiplayer Watch Parties (Backend MQTT Proxy)
*Due to the strict Auth/ACL restructuring required to safely proxy historical data, synchronized multiplayer viewing is deferred to Phase 2.*

When Watch Parties are supported, the playback architecture flips:
- **The Engine**: The Go backend opens the `.jsonl` file and becomes the timeline pump, blasting historical messages to an ephemeral live MQTT topic (e.g., `realm/s/original_scene/replay_123`).
- **Syncing & Spectators**: Viewers join this live topic via the standard network stack. The client is completely "dumb" and relies entirely on the server to push state changes. Live avatars and Jitsi video are suppressed (stealth mode) to avoid muddying the historical render, but Jitsi Audio and Chat remain enabled for socialization.

---

## Authentication & Authorization (MQTT ACLs)

Because 3D Replays can broadcast full historical scene data and act as heavy MQTT proxies, strict authentication controls (via `arena-account` and Mosquitto ACLs) are absolutely necessary.

- **Recording Rights (`publish`)**: A user can only issue a `record: start` command to `arena-recorder` if they hold a valid JWT granting **Editor/Publisher** rights over the target scene namespace. Spectators cannot independently trigger server recordings of private spaces.
- **Hosting a Replay (Watch Party)**: To act as the Timeline host (the user scrubbing the playhead), the user must have **publish** privileges to the dynamically generated replay MQTT topic (e.g., `realm/s/<namespace>/<scene>/replay_<uuid>`). The backend assigns this ACL dynamically when the host initiates the session.
- **Spectating**: Viewers joining the watch party only require **subscribe** rights to the `replay_<uuid>` topic. They do not need (and are explicitly denied) publish rights to prevent muddying the timeline.

## Static Bundle Routing & URL Structure

To serve the replay viewer cleanly **without requiring custom Nginx rewrite rules**, the application will compile a dedicated entry point mapping directly to a static directory structure (e.g., `/replay/index.html` and `/replay/replay.js`).

- **Chosen URL Pattern**: `https://<host>.arenaxr.org/replay/?namespace=<ns>&sceneId=<sn>&session=<uuid>`
- **Why this works seamlessly**: 
  - ARENA's current Nginx config is heavily optimized to serve local files/directories if they exist, and assumes all other paths are scene paths.
  - Because `/replay/` will exist as a physical directory generated by the bundler, Nginx natively serves `/replay/index.html`.
  - The Query Parameters (`?namespace=...`) are preserved by Nginx and parsed securely by `/replay/replay.js` on load to construct the MQTT topic names and REST API fetches, bypassing any need for complex `location` blocks.

---

## UI Integration & Recording Lifecycle

To ensure users can intuitively start, stop, and locate recordings, the feature must be integrated into the existing ARENA portal ecosystem (e.g., `arena-account` and the `/build` or `/scenes` listings).

### 1. Starting a Recording
- **Via the Web Portal (`/scenes`)**: Users navigating their list of owned scenes should see a new "Record" action next to "Enter" and "Edit". Clicking it prompts a modal to define:
  - Max duration (e.g., 1 hour limit).
  - Optional title/tags for the session.
- **Via In-Scene UI**: For spontaneity, the standard ARENA gear/settings menu could include a "Record Scene" toggle that sends a REST request to `arena-recorder` to start capturing the current space.

### 2. Managing & Locating Recordings
- **The Native `/replay` Dashboard**: If a user navigates directly to `https://arenaxr.org/replay/` (without any query parameters), `replay.js` natively detects the empty session state. Instead of loading an empty A-Frame scene, it renders a standalone 2D Dashboard querying the `arena-recorder` REST API. Here, users can immediately view, monitor, and manage the recordings their JWT has ACL rights to.
- **Scene-Level Shortcuts**: On the standard scene listing page (`/build` or `/scenes`), a user can click a "Recordings" shortcut next to a specific scene, which redirects them to `/replay/?search=namespace/scene_id` to pre-filter the native dashboard.
- **Master User Dashboard Integration**: The `arena-account` user profile can optionally feature a "My Recordings" shortcut tab that links directly to their authenticated `/replay` management view. This avoids massive duplicate UI code between the systems.

*Through the `/replay` dashboard, users can:*
  - Monitor active recording durations in real-time.
  - Manually stop ongoing recordings.
  - Delete old `.jsonl` sessions to manage their quotas.
  - Generate shareable `https://arenaxr.org/replay/...` viewer links.
  - Click to "Host a Watch Party" (spins up the MQTT proxy engine).
