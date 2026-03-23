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
