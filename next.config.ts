import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jsdom's dependency chain (html-encoding-sniffer -> @exodus/bytes, ESM-only)
  // fails with ERR_REQUIRE_ESM when Turbopack bundles it for the function;
  // leaving it to Node's own loader is the documented fix.
  serverExternalPackages: ["jsdom", "@mozilla/readability"],
  // The route reads the fleet from disk with a dynamic path, which output
  // file tracing cannot see.
  outputFileTracingIncludes: { "/api/scan": ["./public/policies/*.json"] },
};

export default nextConfig;
