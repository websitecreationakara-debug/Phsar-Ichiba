import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const cloudflareWorkersShim = fileURLToPath(
  new URL('./src/shims/cloudflare-workers.mjs', import.meta.url),
)

// `cloudflare:workers` only resolves in the worker (ssr) environment, but
// TanStack Start's server-fn import graph is also parsed in the client
// environment (db/index.ts, lib/auth.ts), which 500s `vite dev` otherwise.
// Stub it there only — the worker keeps the real module.
const clientCloudflareWorkersStub: Plugin = {
  name: 'client-cloudflare-workers-stub',
  resolveId(id) {
    if (id === 'cloudflare:workers' && this.environment?.name === 'client') {
      return cloudflareWorkersShim
    }
    return null
  },
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    clientCloudflareWorkersStub,
    tailwindcss(),
    tanstackStart({ start: { entry: './start.ts' } }),
    viteReact(),
  ],
})

export default config
