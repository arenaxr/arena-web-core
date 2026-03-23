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

### 2. Unified Playback Architecture (Backend-Driven MQTT Proxy)
> *Based on design feedback, we have simplified the architecture: there is no difference between a "Single Player" scrub and a "Watch Party". Both rely on the backend proxying historical messages over a live MQTT topic.*

When a user initiates a replay (or joins an existing replay session), the `arena-recorder` spins up a lightweight "Playback Engine" worker on the backend.
- **The Engine**: This Go routine opens the `.jsonl` file and acts as the timeline pump. It reads the historical messages and publishes them to a unique, dynamic MQTT topic (e.g., `realm/s/original_scene/replay_session_123`).
- **Scrubbing & Client Sync**: When an arbitrary timeline jump occurs (e.g., jumping to $T_{50}$), the backend computes the exact state of all objects at $T_{50}$ using the nearest previous keyframe and fast-forwards the historical MQTT messages instantly in memory. 
  - **Crucially:** The viewer client `replay.html` forces a reload and **fetches this computed state via a REST API call** against the backend (identical to how standard ARENA clients fetch the initial scene state from `arena-persist`). This radically prevents overloading the MQTT broker with thousands of `create` messages every time someone moves the slider.
  - Once the client renders the exact REST state of $T_{50}$, the backend resumes streaming the normal, incremental time-steps over the live MQTT topic.
- **Client Simplicity**: The viewer client (`replay.html`) doesn't need complex local timeline logic. It just joins the replay scene, makes the initial REST call for the current 3D state, and renders whatever incoming MQTT messages the proxy pumps. 
- **Watch Parties**: Multiplayer viewing is instantly supported by default. Any number of users can join `replay_session_123`, but only the "Host" has permission to send Control Messages to scrub the timeline.

### 3. Read-Only Spectator Client (`replay.html`)
While the client logic is vastly simplified by the backend pump, it still requires a specialized HTML entry point in `arena-web-core`.
- **Clean Slate**: It loads `a-scene` but explicitly disables `build3d`, `jitsi`, `chat`, click listeners, and physics colliders. 
- **Pre-loading**: The backend sends an initial "Manifest" message containing all unique `gltf-model` URLs found in the recording. The client forces a pre-fetch (memory load) for all assets so scrubbing backward/forward doesn't stutter on HTTP requests.
- **Time-Series Scrubber UI**: A 2D HTML/CSS overlay at the bottom. Displays the current timeline position (broadcasted by the backend `playback_status` messages) and contains the Play/Pause/Scrub controls (which emit commands back to the server).

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
