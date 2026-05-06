import winston from 'winston';
import * as appInsights from 'applicationinsights';

let client: ReturnType<typeof appInsights.defaultClientGetter> | null = null;

try {
  if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    appInsights.setup().start();
    client = appInsights.defaultClient;
  }
} catch {
  // Application Insights not configured, continue without it
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

export { logger };

export function logEvent(name: string, properties: Record<string, string>): void {
  logger.info(name, properties);
  if (client) {
    try {
      client.trackEvent({ name, properties });
    } catch {
      // Ignore telemetry errors
    }
  }
}

export function logMetric(name: string, value: number, properties?: Record<string, string>): void {
  if (client) {
    try {
      client.trackMetric({ name, value, properties });
    } catch {
      // Ignore telemetry errors
    }
  }
}

export { appInsights };