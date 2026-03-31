const toCacheKey = key =>
  typeof key === "string" ? key : JSON.stringify(key || {});

export const createRequestCache = (defaultTtlMs = 5000) => {
  const inflight = new Map();
  const settled = new Map();

  const run = (key, fetcher, options = {}) => {
    const cacheKey = toCacheKey(key);
    const ttlMs = options.ttlMs ?? defaultTtlMs;
    const force = options.force === true;

    if (!force) {
      const cached = settled.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < ttlMs) {
        return Promise.resolve(cached.value);
      }

      if (inflight.has(cacheKey)) {
        return inflight.get(cacheKey);
      }
    }

    const requestPromise = Promise.resolve()
      .then(fetcher)
      .then(value => {
        settled.set(cacheKey, {
          value,
          timestamp: Date.now()
        });
        return value;
      })
      .finally(() => {
        inflight.delete(cacheKey);
      });

    inflight.set(cacheKey, requestPromise);
    return requestPromise;
  };

  const invalidate = matcher => {
    if (!matcher) {
      settled.clear();
      inflight.clear();
      return;
    }

    const matches = cacheKey =>
      typeof matcher === "function" ? matcher(cacheKey) : cacheKey.includes(String(matcher));

    [...settled.keys()].forEach(cacheKey => {
      if (matches(cacheKey)) {
        settled.delete(cacheKey);
      }
    });

    [...inflight.keys()].forEach(cacheKey => {
      if (matches(cacheKey)) {
        inflight.delete(cacheKey);
      }
    });
  };

  return {
    run,
    invalidate,
    clear: () => invalidate()
  };
};
