/**
 * Copyright © 2022-2026 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks OpenTelemetry instrumentation for the Crypto Server.
 *
 * Provides distributed tracing and metrics (HTTP and Fastify
 * auto-instrumentation) exported over OTLP to the collector named by
 * OTEL_EXPORTER_OTLP_ENDPOINT. Without an endpoint, or with
 * OTEL_SDK_DISABLED=true, nothing starts and the SDK modules are never
 * loaded.
 *
 * Initialize BEFORE importing Fastify to ensure auto-instrumentation hooks.
 */

import type * as Api from "@opentelemetry/api";
import type * as SdkNode from "@opentelemetry/sdk-node";
import type * as TraceExporter from "@opentelemetry/exporter-trace-otlp-http";
import type * as MetricExporter from "@opentelemetry/exporter-metrics-otlp-http";
import type * as SdkMetrics from "@opentelemetry/sdk-metrics";
import type * as HttpInstr from "@opentelemetry/instrumentation-http";
import type * as FastifyOtel from "@fastify/otel";
import type * as Resources from "@opentelemetry/resources";
import type * as Semconv from "@opentelemetry/semantic-conventions";
import { PACKAGE_VERSION } from "./version";

/** OpenTelemetry service name for spans and metrics. */
const SERVICE_NAME = "crypto-server";

/** Active OpenTelemetry SDK instance (undefined if telemetry is disabled). */
let sdk: SdkNode.NodeSDK | undefined;

/**
 * The instrumentations the SDK started. NodeSDK.shutdown() leaves them
 * enabled, and @fastify/otel stays subscribed to new Fastify instances,
 * so shutdownTelemetry() disables them itself. It also clears the API's
 * global providers, which the API refuses to replace: without that, an
 * SDK started after a shutdown exported nothing, its spans going to the
 * stopped one.
 */
let instrumentations: (
  HttpInstr.HttpInstrumentation | FastifyOtel.FastifyOtelInstrumentation
)[] = [];

/** Loads the OpenTelemetry SDK modules, only once telemetry is enabled. */
/* eslint-disable @typescript-eslint/no-require-imports -- loaded on demand */
function loadSdk() {
  return {
    ...(require("@opentelemetry/sdk-node") as typeof SdkNode),
    ...(require("@opentelemetry/exporter-trace-otlp-http") as typeof TraceExporter),
    ...(require("@opentelemetry/exporter-metrics-otlp-http") as typeof MetricExporter),
    ...(require("@opentelemetry/sdk-metrics") as typeof SdkMetrics),
    ...(require("@opentelemetry/instrumentation-http") as typeof HttpInstr),
    ...(require("@fastify/otel") as typeof FastifyOtel),
    ...(require("@opentelemetry/resources") as typeof Resources),
    ...(require("@opentelemetry/semantic-conventions") as typeof Semconv),
  };
}
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Initialize the OpenTelemetry SDK. Call once at startup, before any
 * other imports. A no-op unless OTEL_EXPORTER_OTLP_ENDPOINT is set, in
 * every environment, and when OTEL_SDK_DISABLED is "true".
 */
export function initTelemetry(): void {
  const endpoint = process.env["OTEL_EXPORTER_OTLP_ENDPOINT"];
  if (!endpoint || process.env["OTEL_SDK_DISABLED"] === "true" || sdk) {
    return;
  }
  const otel = loadSdk();
  instrumentations = [
    new otel.HttpInstrumentation(),
    // Hooks each Fastify instance as it is created, so it works even
    // when Fastify was loaded before telemetry started.
    new otel.FastifyOtelInstrumentation({ registerOnInitialization: true }),
  ];
  sdk = new otel.NodeSDK({
    resource: otel.resourceFromAttributes({
      [otel.ATTR_SERVICE_NAME]: SERVICE_NAME,
      [otel.ATTR_SERVICE_VERSION]: PACKAGE_VERSION,
    }),
    traceExporter: new otel.OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    metricReader: new otel.PeriodicExportingMetricReader({
      exporter: new otel.OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
      exportIntervalMillis: 30000,
    }),
    instrumentations,
  });
  sdk.start();
}

/** Whether the OpenTelemetry SDK is running. */
export function telemetryActive(): boolean {
  return sdk !== undefined;
}

/**
 * Shut down the telemetry SDK gracefully (flush pending spans/metrics).
 */
export async function shutdownTelemetry(): Promise<void> {
  const running = sdk;
  sdk = undefined;
  for (const instrumentation of instrumentations) instrumentation.disable();
  instrumentations = [];
  if (!running) return;
  await running.shutdown();
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded on demand
  const api = require("@opentelemetry/api") as typeof Api;
  api.trace.disable();
  api.metrics.disable();
  api.propagation.disable();
  api.context.disable();
}
