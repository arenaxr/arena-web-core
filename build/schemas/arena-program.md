---
title: Program
nav_order: 14
layout: default
parent: ARENA Options
---

# Program

## Properties

- **`object_id`** *(string)*: Object identifier; Must be a valid UUID.
- **`action`** *(string)*: One of 3 basic Create/Update/Delete actions or a special client event action (e.g. a click). Must be one of: `['create', 'delete', 'update', 'clientEvent']`. Default: `create`.
- **`persist`** *(boolean)*: Persist this object in the database. Default: `true`.
- **`type`** *(string)*: Must be one of: `['program']`.
- **`data`**: Object data payload; Program config data. Refer to *#/definitions/program*.
## Definitions

- **`program`** *(object)*
  - **`name`** *(string)*: Name of the program in the format namespace/program-name.
  - **`affinity`** *(string)*: Indicates the module affinity (client=client's runtime; none or empty=any suitable/available runtime). Must be one of: `['client', 'none']`. Default: `client`.
  - **`instantiate`** *(string)*: Single instance of the program (=single), or let every client create a program instance (=client). Per client instance will create new uuid for each program. Must be one of: `['single', 'client']`. Default: `client`.
  - **`filename`** *(string)*: Filename of the entry binary.
  - **`filetype`** *(string)*: Type of the program (WA=WASM or PY=Python). Must be one of: `['WA', 'PY']`. Default: `['WA']`.
  - **`args`** *(array)*: Command-line arguments (passed in argv). Supports variables: ${scene}, ${mqtth}, ${cameraid}, ${username}, ${runtimeid}, ${moduleid}, ${query-string-key}.
    - **Items** *(string)*
  - **`env`** *(array)*: Environment variables. Supports variables: ${scene}, ${namespace}, ${mqtth}, ${cameraid}, ${username}, ${runtimeid}, ${moduleid}, ${query-string-key}. Default: `['MID=${moduleid}', 'SCENE=${scene}', 'NAMESPACE=${namespace}', 'MQTTH=${mqtth}', 'REALM=realm']`.
    - **Items** *(string)*
  - **`channels`** *(array)*: Channels describe files representing access to IO from pubsub and client sockets (possibly more in the future; currently only supported for WASM programs). Default: `[{'path': '/ch/${scene}', 'type': 'pubsub', 'mode': 'rw', 'params': {'topic': 'realm/s/${scene}'}}]`.
    - **Items** *(object)*
      - **`path`** *(string)*: Folder visible by the program.
      - **`type`** *(string)*: Pubsub or client socket. Must be one of: `['pubsub', 'client']`. Default: `pubsub`.
      - **`mode`** *(string)*: Access mode. Must be one of: `['r', 'w', 'rw']`.
      - **`params`** *(object)*: Type (i.e. pubsub/client)-specific parameters.
        - **`topic`** *(string)*: Pubsub topic (pubsub).
        - **`host`** *(string)*: Destination host address (client socket; ignored for now).
        - **`port`** *(number)*: Destination port (client socket; ignored for now).
