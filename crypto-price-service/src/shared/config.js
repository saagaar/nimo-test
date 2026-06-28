/**
 * @file config.js
 *
 * Shared configuration helpers.
 *
 * Provides small utilities for reading and validating environment variables.
 * Each service should define its own config using these helpers.
 */

export function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name, defaultValue = undefined) {
  return process.env[name] || defaultValue;
}