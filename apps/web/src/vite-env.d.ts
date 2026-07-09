/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OTEL_EXPORTER_OTLP_ENDPOINT?: string;
}

declare const __APP_BUILD_INFO__: import('./lib/build-info').BuildInfo;
