import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Absolute root silences the workspace-root warning.
    root: path.resolve(__dirname),
    // Handle missing optional modules in @supabase/auth-js
    resolveAlias: {
      // Stub out web3/ethereum - optional Supabase feature we don't use
      "@supabase/auth-js/dist/module/lib/web3/ethereum": path.resolve(
        __dirname,
        "lib/stubs/empty.js"
      ),
    },
  },
};

export default nextConfig;
