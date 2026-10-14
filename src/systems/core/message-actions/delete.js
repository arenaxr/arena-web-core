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

        /*
         * Arm this element's own detach before anything below can remove it. Because the two
         * parenting mechanisms let the DOM and the THREE.js graph disagree, an element reaped
         * below can be a DOM *ancestor* of this one: DOM `sceneRoot > X > A` with graph
         * `Z > A > X` needs only two ordinary updates and renders normally. A `[dep=...]`
         * element can be an ancestor too. Removing either takes this element out of the document
         * along with it, and `child-detached` is emitted once, at that moment, so arming any
         * later would miss it and leave object3D in the graph with nothing left to remove it.
         */
        try {
            this.armDetach(entityEl);
        } catch (e) {
            console.error(e);
        }

        // The subtree an orphan must still belong to for its removal to be valid, see reapOrphans
        const rootObj = entityEl.object3D;

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
            this.reapOrphans(orphans, rootObj).catch((e) => {
                console.error(e);
            });
        }

        /*
         * Remove element itself. Guarded because blip removes the element from several different
         * paths and can throw doing it (blip.js falls through after its no-geometry removal and
         * can reach a second, unguarded el.remove()). This runs inside mqtt.js's messages.forEach,
         * so an escaping exception would drop the rest of the message batch.
         */
        try {
            this.blipRemove(entityEl);
        } catch (e) {
            console.error(e);
        }
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
                /*
                 * The frontier is at the bound but has already been collected; what the bound
                 * costs us is its children. Stay quiet when it has none, so the warning only
                 * fires when descendants really were left behind.
                 */
                const missed = frontier.some((el) =>
                    (el.object3D?.children ?? []).some((child) => this.isUnvisitedEntity(child.el, el, visited))
                );
                if (missed) {
                    console.warn(
                        `Orphan reap of "${id}" hit the max depth bound (${MAX_REAP_DEPTH}); deeper descendants left in place`
                    );
                }
                break;
            }
            const next = [];
            for (let i = 0; i < frontier.length && !truncated; i++) {
                const el = frontier[i];
                const children = el.object3D?.children ?? [];
                for (let j = 0; j < children.length && !truncated; j++) {
                    const childEl = children[j].el;
                    if (this.isUnvisitedEntity(childEl, el, visited)) {
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
     * Whether a child object3D back-links to a distinct entity that has not been walked yet.
     *
     * object3D.el also back-links objects belonging to the entity itself (meshes, loaded models
     * set with setObject3D), so only distinct entities are worth descending into.
     *
     * @param {Element} [childEl] element behind the child object3D, if it has one
     * @param {Element} el element whose object3D the child hangs off
     * @param {Set<Element>} visited elements already walked
     * @return {boolean} true if childEl is a distinct, not-yet-walked entity
     */
    static isUnvisitedEntity(childEl, el, visited) {
        return !!childEl && childEl !== el && !!childEl.object3D && !visited.has(childEl);
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
        // Bounded like the walk itself; nothing constrains how deep the DOM gets either
        for (let i = 0; ancestor && i < MAX_REAP_DEPTH; i++) {
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
     * @param {object} rootObj object3D of the deleted element, the subtree these orphans belong to
     */
    static async reapOrphans(orphans, rootObj) {
        for (let i = 0; i < orphans.length; i++) {
            /*
             * Two things can stop an entry being ours to remove. Removing an ancestor may already
             * have taken it out of the document; and any batch after the first runs once the
             * message loop has resumed, so a CREATE for the same object_id may have arrived
             * meanwhile. create-update.js looks the element up by id and reuses it rather than
             * building a new one, so a re-created object was never disconnected and isConnected
             * cannot tell the two apart. Where the object now hangs can: a re-created one has been
             * reparented out of the deleted subtree, a doomed one is still inside it. The test has
             * to be ancestry to the deleted object3D rather than reachability from the scene,
             * because the deleted object's own detach may itself still be pending behind a blip.
             */
            if (orphans[i].isConnected && this.isUnder(orphans[i].object3D, rootObj)) {
                try {
                    this.removeAndDetach(orphans[i]);
                } catch (e) {
                    console.error(e);
                }
            }
            if ((i + 1) % REAP_BATCH_SIZE === 0) {
                // eslint-disable-next-line no-await-in-loop
                await this.yieldToMain();
            }
        }
    }

    /**
     * Whether an object3D still hangs somewhere below another object in the THREE.js graph
     * @param {object} [object3D] object to test
     * @param {object} [rootObj] ancestor to look for
     * @return {boolean} true if rootObj is reached walking up from object3D
     */
    static isUnder(object3D, rootObj) {
        let parent = object3D?.parent;
        // Bounded by the depth that collectOrphans was allowed to descend to find these elements
        for (let i = 0; parent && i <= MAX_REAP_DEPTH; i++) {
            if (parent === rootObj) {
                return true;
            }
            parent = parent.parent;
        }
        return false;
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
     * Remove an element, detaching its object3D from the THREE.js graph once that removal has
     * actually happened.
     * @param el - element to remove
     */
    static removeAndDetach(el) {
        this.armDetach(el);
        this.blipRemove(el);
    }

    /**
     * Arrange for an element's object3D to be detached from the THREE.js graph once the element
     * has actually left the document.
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
     * A null parentEl gets no listener and deliberately has no `parentElement` fallback: parentEl
     * is null only for an element that never attached or has already detached, and
     * disconnectedCallback early-returns in both cases, so `child-detached` is never emitted for
     * it and a listener on the DOM parent could only sit there unable to fire.
     *
     * @param el - element whose object3D must be detached once it is removed
     */
    static armDetach(el) {
        const { object3D } = el;
        // What removeFromParent() emits on; parentEl is the DOM parent (AEntity.addToParent)
        const { parentEl } = el;
        if (!object3D || !parentEl) {
            return;
        }
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
