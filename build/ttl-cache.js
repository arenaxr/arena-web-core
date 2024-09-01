/*
A storage-unbounded ttl cache that is not an lru-cache
Inspired by: https://www.npmjs.com/package/lru-cache

The ISC License (this file only)

Copyright (c) 2010-2023 Isaac Z. Schlueter and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/ 

/**
 * A cache of objects with a TTL that can be automatically computed from the average time between 'set' operations.
 * Objects will be inactive after ttlMs*ttlToInactiveErrorPercent time. 
 * After entering inactive state, they will be deleted after ttlInactiveMs.
 * 
 * Example:
 * <pre>
 * {@code
 * c = new TTLCache({ttlMs: 500, doTtlAvg:false}); // set a default ttl of 500 ms, do not use average time between set
 * c.set(1, "test value")
 * console.log(c.get(1)) // output: "test value"
 * setTimeout(() => console.log(c.get(1)), 1000); // after 1 second; output: "undefined"
 * }
 * </pre>
 * 
 * With the defaults (ttlMs = 300000, doTtlAvg = true), it will try to set the ttl from the average time between set, assuming this time is < ttlMs:
 * <pre>
 * {@code
 * // function to repeatedly set key 1 every 1000 ms
 * function set(c, n) {
 *     c.set(1, `test value:${n}`);
 *     if (n < 10) setTimeout(() => set(c, n+1), 1000);     
 *     console.log(c.get(1, true)); // output (true outputs all attributes stored in the cache): {ttl: <undefined or avg~1000ms>, inserted_at: <timestamp>, n: n, value: 'test value: n'
 * }
 * c = new TTLCache();
 * set(c, 1);
 * }
 * </pre>
 * 
 */
export const TTLCache = class {
  constructor({
    ttlMs = 10000, // default ttl; 10 seconds
    doTtlAvg = true, // instead of default above, compute the ttl based on an average between 'set' operations of the same key
    ttlToInactiveErrorPercent = 0.5, // ttl percentage margin to move to inactive (note: ttl can be an average)
    ttlInactiveMs = 5000, // inactive time until value is removed; default to 5 secs
    mutationCall = () => { console.log("ttlcache mutated");} // a mutation callback everytime the cache is updated (most operations have a doCallback argument)
  } = {}) {  
    this.ttlMs = ttlMs;
    this.doTtlAvg = doTtlAvg;
    this.ttlToInactiveErrorPercent = ttlToInactiveErrorPercent;
    this.ttlInactiveMs = ttlInactiveMs;
    this.mutationCall = mutationCall;
    this.data = new Map();
    this.timers = new Map();
  }

  set(k, v, doCallback=true, forceCallback=false) {
    const cache = this;
    const item = cache.data.get(k);
    let ttl = item?.ttl;
    if (cache.timers.has(k)) {
      clearTimeout(cache.timers.get(k))
    }
    const timeout = ttl ? ttl * (1+cache.ttlToInactiveErrorPercent) : cache.ttlMs * (1+cache.ttlToInactiveErrorPercent);
    cache.timers.set(
      k,
      // eslint-disable-next-line no-unneeded-ternary
      setTimeout(() => cache.inactive(k), timeout)
    )
    // eslint-disable-next-line no-unneeded-ternary
    const n = item ? item.n + 1 : 1;
    const tsNow = Date.now();
    if (cache.doTtlAvg) {
        if (!ttl && item) {
          ttl = tsNow - item.inserted_at;
        } else if (item) {
          const ttlSamp = tsNow - item.inserted_at;
          ttl -= ttl / n;
          ttl += ttlSamp / n;
        }
        cache.data.set(k, {"ttl": ttl, "inserted_at": tsNow, "n": n, "value": v, state: State.ACTIVE})    
    } else {
        cache.data.set(k, {"value": v, state: State.CONNECTED})        
    }
    if (doCallback && !item || forceCallback) cache.mutationCall();
  }
  
  get(k, allAttrs=false) {
    if (allAttrs) return this.data.get(k);
    return this.data.get(k)?.value;
  }
  
  has(k) { return this.data.has(k); }

  inactive(k, doCallback=true) {
    const cache = this;
    if (this.timers.has(k)) {
      clearTimeout(this.timers.get(k))
    }
    const item = cache.data.get(k);
    item.state = State.INACTIVE;
    cache.data.set(k, item);
    cache.timers.set(
      k,
      setTimeout(() => cache.delete(k), cache.ttlInactiveMs)
    )
    if (doCallback) cache.mutationCall();
  }

  delete(k, allAttrs=false, doCallback=true) {
    if (this.timers.has(k)) {
      clearTimeout(this.timers.get(k))
    }
    this.timers.delete(k)
    let retVal = this.data.delete(k)?.value
    if (allAttrs) 
        retVal = this.data.delete(k)
    if (doCallback) this.mutationCall();
    return retVal;
  }

  list(addState=true, allAttrs=false) {
    const array = [];
    this.data.forEach((item, key) => {
      if (allAttrs) array.push(item)
      else {
        if (addState) item.value.state = item.state;
        array.push(item.value);  
      }
    })
    return array;
  }

  clear(doCallback=false) {
    this.data.clear()
    // eslint-disable-next-line no-restricted-syntax
    for (const v of this.timers.values()) {
      clearTimeout(v)
    }
    this.timers.clear()
    if (doCallback) this.mutationCall();
  }
}

// enum of state values
const State = Object.freeze({
    ACTIVE: 'active',
    INACTIVE: 'inactive'
});