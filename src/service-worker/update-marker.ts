/**
 * Name of an empty cache the app creates once it can show the "Update" banner.
 * The service worker reads it to know whether a new version may wait for the user's tap
 * or must take over by itself (devices still running 1.1, which had no banner).
 */
export const UPDATE_UI_MARKER = "forja-update-ui-v1";
