// jest.polyfills.ts

/**
 * This file provides polyfills for Web APIs that are not available in the Node.js environment where Jest runs.
 * It includes polyfills for TextEncoder, TextDecoder, Fetch API, and Streams API.
 * These are necessary for testing code that relies on these APIs, such as API route handlers or services that use fetch.
 */

import { ReadableStream, TransformStream, WritableStream } from "stream/web";
import { TextDecoder, TextEncoder } from "util";

if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
}

if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}

if (typeof globalThis.ReadableStream === "undefined") {
  globalThis.ReadableStream =
    ReadableStream as unknown as typeof globalThis.ReadableStream;
}

if (typeof globalThis.TransformStream === "undefined") {
  globalThis.TransformStream =
    TransformStream as unknown as typeof globalThis.TransformStream;
}

if (typeof globalThis.WritableStream === "undefined") {
  globalThis.WritableStream =
    WritableStream as unknown as typeof globalThis.WritableStream;
}

const edgeFetch =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("next/dist/compiled/@edge-runtime/primitives/fetch") as {
    fetch: typeof fetch;
    Headers: typeof Headers;
    Request: typeof Request;
    Response: typeof Response;
  };

if (typeof globalThis.fetch === "undefined") {
  globalThis.fetch = edgeFetch.fetch as typeof globalThis.fetch;
}

if (typeof globalThis.Headers === "undefined") {
  globalThis.Headers = edgeFetch.Headers as typeof globalThis.Headers;
}

if (typeof globalThis.Request === "undefined") {
  globalThis.Request = edgeFetch.Request as typeof globalThis.Request;
}

if (typeof globalThis.Response === "undefined") {
  globalThis.Response = edgeFetch.Response as typeof globalThis.Response;
}
