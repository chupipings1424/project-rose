// Tells TypeScript which VITE_* variables exist on import.meta.env.
// Only variables prefixed with VITE_ are bundled into the browser code.
interface ImportMetaEnv {
  readonly VITE_ROSE_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}