/**
 * @module delete
 */
const error = AFRAME.utils.debug('ARENA:delete:error');

/*
 * Bounds for the orphan walk below. Deletes arrive from the network and are handled on the main
 * thread, so an unbounded walk of a very wide or very deep subtree would hold up the render loop.
 */
// Maximum number of descendants inspected for a single delete
const MAX_REAP_NODES = 5000;
// Maximum number of levels descended below the deleted object
const MAX_REAP_DEPTH = 32;
// Number of orphans removed before yielding back to the main thread
const REAP_BATCH_SIZE = 100;

/**
 * Delete object handler
 */
export default class Delete {
    /**
     * Delete handler
     * @param {object} message message to be parsed
     */
    static handle(message) {
        const { id } = message;
        if (id === undefined) {
            error('Malformed message (no object_id):', JSON.stringify(message));
        }

        const entityEl = document.getElementById(id);
        if (!entityEl) {
            error(`Object with object_id "${id}" does not exist!`);
            return;
        }

        // Clean up linked dependents
        try {
            document.querySelectorAll(`[dep='${id}']`).forEach((depEl) => {
                this.blipRemove(depEl);
            });
        } catch (e) {
            console.error(e);
        }

        /*
         * Collect the descendants that removing this element will not clean up. This has to happen
         * before the element is removed: A-Frame's disconnectedCallback detaches object3D from its
         * parent and nulls out object3D.el, so the graph we walk is gone afterwards. Collection is
         * read-only and bounded, so it stays synchronous.
         */
        let orphans = [];
        try {
            orphans = this.collectOrphans(entityEl, id);
        } catch (e) {
            console.error(e);
        }

        /*
         * Remove them, deepest first. Not awaited: the first batch runs synchronously (an async
         * function runs up to its first await), so ordinary deletes behave exactly as before, and
         * only oversized subtrees spill into later batches.
         */
        if (orphans.length > 0) {
            this.reapOrphans(orphans).catch((e) => {
                console.error(e);
            });
        }

        // Remove element itself
        this.blipRemove(entityEl);
    }

    /**
     * Collect descendants that will be orphaned by removing an element.
     *
     * ARENA has two parenting mechanisms (see create-update.js). On CREATE the child is parented in
     * the DOM (`parentEl.appendChild(entityEl)`), and A-Frame's own attach path mirrors that into
     * the THREE.js graph, so removing the parent element disposes of those children implicitly via
     * disconnectedCallback. On UPDATE the child is reparented in the THREE.js graph only
     * (`parentEl.object3D.add(entityEl.object3D)`) and its DOM element is left where it was, so the
     * DOM parent and the logical parent diverge and removing the logical parent leaves the element
     * in the document.
     *
     * The THREE.js graph is therefore the only index that covers both mechanisms, and A-Frame
     * back-links every object3D to its element (`object3D.el`), so we walk object3D.children rather
     * than querying a `parent` attribute: that attribute is removed again on the CREATE path
     * (create-update.js), so it only ever describes the UPDATE case and objects that never attached.
     *
     * @param {Element} entityEl element being deleted
     * @param {string} id object_id of the element being deleted, for logging
     * @return {Element[]} elements that must be removed explicitly, deepest first
     */
    static collectOrphans(entityEl, id) {
        const visited = new Set([entityEl]);
        const orphans = [];
        let frontier = [entityEl];
        let depth = 0;
        let truncated = false;

        while (frontier.length > 0 && !truncated) {
            if (depth >= MAX_REAP_DEPTH) {
                console.warn(
                    `Orphan reap of "${id}" hit the max depth bound (${MAX_REAP_DEPTH}); deeper descendants left in place`
                );
                break;
            }
            const next = [];
            for (let i = 0; i < frontier.length && !truncated; i++) {
                const el = frontier[i];
                const children = el.object3D?.children ?? [];
                for (let j = 0; j < children.length && !truncated; j++) {
                    const childEl = children[j].el;
                    /*
                     * object3D.el also back-links objects that belong to the entity itself (meshes,
                     * loaded models set with setObject3D), so only descend into distinct entities.
                     */
                    if (childEl && childEl !== el && childEl.object3D && !visited.has(childEl)) {
                        visited.add(childEl);
                        next.push(childEl);
                        if (!entityEl.contains(childEl)) {
                            /*
                             * Outside the deleted element's DOM subtree, i.e. reparented in the
                             * THREE.js graph only, so DOM removal will never reach it.
                             */
                            orphans.push(childEl);
                        }
                        if (visited.size > MAX_REAP_NODES) {
                            console.warn(
                                `Orphan reap of "${id}" hit the max node bound (${MAX_REAP_NODES}); remaining descendants left in place`
                            );
                            truncated = true;
                        }
                    }
                }
            }
            frontier = next;
            depth++;
        }

        // Breadth-first, so reversing gives deepest first
        return orphans.reverse();
    }

    /**
     * Remove orphaned descendants in bounded batches, yielding to the main thread between them
     * @param {Element[]} orphans elements to remove, deepest first
     */
    static async reapOrphans(orphans) {
        for (let i = 0; i < orphans.length; i++) {
            // Removing an ancestor may already have taken this one out of the document
            if (orphans[i].isConnected) {
                try {
                    this.blipRemove(orphans[i]);
                } catch (e) {
                    console.error(e);
                }
            }
            if (i > 0 && i % REAP_BATCH_SIZE === 0) {
                // eslint-disable-next-line no-await-in-loop
                await this.yieldToMain();
            }
        }
    }

    /**
     * Release the main thread so a large reap doesn't hold the frame
     * @return {Promise} resolves on the next macrotask
     */
    static yieldToMain() {
        return new Promise((resolve) => {
            setTimeout(resolve, 0);
        });
    }

    /**
     * Remove element with blip effect if it has the component and is set as enabled
     * @param el - element to remove
     */
    static blipRemove(el) {
        if (el.components.blip?.data?.blipout === true) {
            el.components.blip.blip('out');
        } else {
            el.remove();
        }
    }
}
