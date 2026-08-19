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
        this.removeAndDetach(entityEl);
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
        /*
         * Elements whose DOM subtree is already accounted for: the deleted element, plus every
         * orphan queued so far. Removing any of them takes its whole DOM subtree with it.
         */
        const covered = new Set([entityEl]);
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
                        if (!this.isCovered(childEl, covered)) {
                            /*
                             * No queued removal reaches this element through the DOM, i.e. it was
                             * reparented in the THREE.js graph only. Queue it, and record that its
                             * own DOM subtree is covered from here on: the ordinary DOM children
                             * hanging off an orphan are disposed of by that orphan's removal, so
                             * queuing them as well would blip each one separately instead of
                             * animating the subtree as one effect, and would spend the node budget
                             * on removals the DOM already performs.
                             */
                            orphans.push(childEl);
                            covered.add(childEl);
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
     * Whether an element's removal is already covered by a removal that is queued anyway, i.e. one
     * of its DOM ancestors is going to leave the document and will take this element with it.
     *
     * @param {Element} el element to test
     * @param {Set<Element>} covered elements whose DOM subtrees are already accounted for
     * @return {boolean} true if el is removed implicitly and must not be queued
     */
    static isCovered(el, covered) {
        let ancestor = el.parentElement;
        while (ancestor) {
            if (covered.has(ancestor)) {
                return true;
            }
            ancestor = ancestor.parentElement;
        }
        return false;
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
                    this.removeAndDetach(orphans[i]);
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
     * Remove an element, and detach its object3D from the THREE.js graph once that removal has
     * actually happened.
     *
     * A-Frame detaches object3D by asking the element's *DOM* parent to do it: disconnectedCallback
     * calls removeFromParent(), which calls `this.parentEl.remove(this)`, and `AEntity.remove(el)`
     * runs `this.object3D.remove(el.object3D)`. For anything reparented by an UPDATE message the
     * DOM parent is not the THREE.js parent, so that call removes nothing: the element leaves the
     * document while its object3D stays in the graph and keeps rendering, and because the element
     * is gone a later `parent: null` update can no longer rescue it. That applies both to the
     * orphans reaped here and to the deleted object itself, which may have been update-reparented
     * too. Detaching explicitly is a no-op in the ordinary case, where A-Frame has already done it.
     *
     * The detach has to happen *after* the removal rather than before it: pulling the object3D out
     * of the graph first would take the mesh out of the scene before its blip-out has played. The
     * blip component signals nothing on completion and removes the element from several different
     * paths (straight away when there is no geometry or no clippable material, from the anime.js
     * timeline's `complete` callback, or from its own backup timeout), so the one signal covering
     * every path is the element actually leaving the document: removeFromParent() emits
     * `child-detached` on the DOM parent, after its own detach attempt. Listening for that leaves
     * the animation intact whether the removal is synchronous or completes hundreds of ms later.
     *
     * @param el - element to remove
     */
    static removeAndDetach(el) {
        const { object3D } = el;
        // What removeFromParent() emits on; parentEl is the DOM parent (AEntity.attachToParent)
        const parentEl = el.parentEl ?? el.parentElement;
        if (object3D && parentEl) {
            const onDetached = (evt) => {
                // child-detached bubbles, so ignore the ones belonging to other elements
                if (evt.detail?.el !== el) {
                    return;
                }
                parentEl.removeEventListener('child-detached', onDetached);
                object3D.parent?.remove(object3D);
            };
            parentEl.addEventListener('child-detached', onDetached);
        }
        this.blipRemove(el);
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
