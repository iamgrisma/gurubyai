# B6 Location Hardening

Production location flow must not depend directly on public Nominatim/OSRM endpoints from the browser.

Required before B6 close:
- server-side geocoder/router proxy or managed provider
- timeout and bounded retries
- rate limiting / abuse protection
- provider failure fallback to coordinates + straight-line distance
- minimize precise-location persistence
- provider attribution and usage-policy compliance
- telemetry for provider failures and latency

Current frontend fallback remains functional, but direct public-provider calls are not production-hardened.
