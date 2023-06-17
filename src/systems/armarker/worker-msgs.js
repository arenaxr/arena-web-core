const CVWorkerMsgs = {
    type: {
        /* sent from worker */
        INIT_DONE: 0, // worker is ready
        FRAME_RESULTS: 1, // worker finished processing frame
        NEXT_FRAME_REQ: 2, // worker requests a new frame
        /* sent to worker */
        PROCESS_GSFRAME: 3, // process grayscale image
        KNOWN_MARKER_ADD: 4, // indicate known marker data (size)
        KNOWN_MARKER_DEL: 5, // remove known marker data (size)
    },
};

export { CVWorkerMsgs };
