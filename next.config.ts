import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Silence workspace root warning
    root: ".",
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
