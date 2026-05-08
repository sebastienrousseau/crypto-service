/**
 * Copyright © 2022-2024 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */

/**
 * @remarks OpenTelemetry instrumentation for the Crypto Server.
 *
 * Provides:
 * - Distributed tracing (HTTP + Fastify auto-instrumentation)
 * - Custom spans for crypto operations
 * - Metrics (operation counters, latency histograms)
 * - OTLP export (configurable via OTEL_EXPORTER_OTLP_ENDPOINT)
 *
 * Initialize BEFORE importing Fastify to ensure auto-instrumentation hooks.
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { FastifyInstrumentation } from "@opentelemetry/instrumentation-fastify";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { trace, metrics, SpanStatusCode } from "@opentelemetry/api";

const SERVICE_NAME = "crypto-server";
const SERVICE_VERSION = "0.0.3";

let sdk: NodeSDK | undefined;

/**
 * Initialize OpenTelemetry SDK. Call once at startup, before any other imports.
 * No-op if OTEL_EXPORTER_OTLP_ENDPOINT is not set (avoids overhead in dev).
 */
export function initTelemetry(): void {
  const endpoint = process.env["OTEL_EXPORTER_OTLP_ENDPOINT"];
  if (!endpoint && process.env["NODE_ENV"] !== "production") {
    return; // Skip in development unless explicitly configured
  }

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
  });

  const traceExporterOpts = endpoint ? { url: `${endpoint}/v1/traces` } : {};
  const metricExporterOpts = endpoint ? { url: `${endpoint}/v1/metrics` } : {};

  sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter(traceExporterOpts),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(metricExporterOpts),
      exportIntervalMillis: 30000,
    }),
    instrumentations: [new HttpInstrumentation(), new FastifyInstrumentation()],
  });

  sdk.start();
}

/**
 * Shut down the telemetry SDK gracefully (flush pending spans/metrics).
 */
export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
  }
}

// --- Custom crypto operation instrumentation ---

const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
const meter = metrics.getMeter(SERVICE_NAME, SERVICE_VERSION);

const operationCounter = meter.createCounter("crypto.operations.total", {
  description: "Total number of cryptographic operations performed",
});

const operationDuration = meter.createHistogram(
  "crypto.operations.duration_ms",
  {
    description: "Duration of cryptographic operations in milliseconds",
    unit: "ms",
  },
);

/**
 * Wraps an async crypto operation with tracing and metrics.
 *
 * @param operationName - e.g. "encrypt", "sign", "hash"
 * @param attributes - Additional span attributes (algorithm, key size, etc.)
 * @param fn - The actual operation to execute
 */
export async function traceCryptoOperation<T>(
  operationName: string,
  attributes: Record<string, string | number>,
  fn: () => Promise<T> | T,
): Promise<T> {
  return tracer.startActiveSpan(`crypto.${operationName}`, async (span) => {
    const start = performance.now();
    span.setAttributes(attributes);

    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      operationCounter.add(1, {
        operation: operationName,
        status: "success",
        ...attributes,
      });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      span.recordException(error as Error);
      operationCounter.add(1, {
        operation: operationName,
        status: "error",
        ...attributes,
      });
      throw error;
    } finally {
      const duration = performance.now() - start;
      operationDuration.record(duration, {
        operation: operationName,
        ...attributes,
      });
      span.end();
    }
  });
}
