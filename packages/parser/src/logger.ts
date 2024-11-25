import type { AnyNode } from '@humanwhocodes/momoa';
import color from 'picocolors';
import wcmatch from 'wildcard-match';
import { codeFrameColumns } from './lib/code-frame.js';

export const LOG_ORDER = ['error', 'warn', 'info', 'debug'] as const;

export type LogSeverity = 'error' | 'warn' | 'info' | 'debug';

export type LogLevel = LogSeverity | 'silent';

export type LogGroup = 'parser' | 'plugin';

export interface LogEntry {
  /** Error message to be logged */
  message: string;
  /** Prefix message with label */
  label?: string;
  /** File in disk */
  filename?: URL;
  /**
   * Continue on error?
   * @default false
   */
  continueOnError?: boolean;
  /** Show a code frame for the erring node */
  node?: AnyNode;
  /** Originator of log message */
  group?: LogGroup;
  /** To show a code frame, provide the original source code */
  src?: string;
}

export interface DebugEntry {
  group: LogGroup;
  /** Error message to be logged */
  message: string;
  /** Current subtask or submodule */
  label?: string;
  /** Show code below message */
  codeFrame?: { src: string; line: number; column: number };
  /** Display performance timing */
  timing?: number;
}

const DEBUG_GROUP_COLOR: Record<string, typeof color.red | undefined> = { core: color.green, plugin: color.magenta };

const MESSAGE_COLOR: Record<string, typeof color.red | undefined> = { error: color.red, warn: color.yellow };

const timeFormatter = new Intl.DateTimeFormat('en-gb', { timeStyle: 'medium' });

/**
 * @param {Entry} entry
 * @param {Severity} severity
 * @return {string}
 */
export function formatMessage(entry: LogEntry, severity: LogSeverity) {
  let message = entry.message;
  if (entry.label) {
    message = `${color.bold(`${entry.label}:`)} ${message}`;
  }
  if (severity in MESSAGE_COLOR) {
    message = MESSAGE_COLOR[severity]!(message);
  }
  if (entry.src) {
    const start = entry.node?.loc?.start ?? { line: 0, column: 0 };
    //  strip "file://" protocol, but not href
    const loc = entry.filename
      ? `${entry.filename?.href.replace(/^file:\/\//, '')}:${start?.line ?? 0}:${start?.column ?? 0}\n\n`
      : '';
    const codeFrame = codeFrameColumns(entry.src, { start }, { highlightCode: false });
    message = `${message}\n\n${loc}${codeFrame}`;
  }
  return message;
}

export default class Logger {
  level = 'info' as LogLevel;
  debugScope = '*';
  errorCount = 0;
  warnCount = 0;
  infoCount = 0;
  debugCount = 0;

  constructor(options?: { level?: LogLevel; debugScope?: string }) {
    if (options?.level) {
      this.level = options.level;
    }
    if (options?.debugScope) {
      this.debugScope = options.debugScope;
    }
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  /** Log an error message (always; can’t be silenced) */
  error(entry: LogEntry) {
    this.errorCount++;
    const message = formatMessage(entry, 'error');
    if (entry.continueOnError) {
      console.error(message);
      return;
    }
    if (entry.node) {
      throw new TokensJSONError(message);
    } else {
      throw new Error(message);
    }
  }

  /** Log an info message (if logging level permits) */
  info(entry: LogEntry) {
    this.infoCount++;
    if (this.level === 'silent' || LOG_ORDER.indexOf(this.level) < LOG_ORDER.indexOf('info')) {
      return;
    }
    // biome-ignore lint/suspicious/noConsoleLog: this is its job
    console.log(formatMessage(entry, 'info'));
  }

  /** Log a warning message (if logging level permits) */
  warn(entry: LogEntry) {
    this.warnCount++;
    if (this.level === 'silent' || LOG_ORDER.indexOf(this.level) < LOG_ORDER.indexOf('warn')) {
      return;
    }
    console.warn(formatMessage(entry, 'warn'));
  }

  /** Log a diagnostics message (if logging level permits) */
  debug(entry: DebugEntry) {
    this.debugCount++;
    if (this.level === 'silent' || LOG_ORDER.indexOf(this.level) < LOG_ORDER.indexOf('debug')) {
      return;
    }

    let message = formatMessage(entry, 'debug');

    const debugPrefix = entry.label ? `${entry.group}:${entry.label}` : entry.group;
    if (this.debugScope !== '*' && !wcmatch(this.debugScope)(debugPrefix)) {
      return;
    }
    message = `${(DEBUG_GROUP_COLOR[entry.group] || color.white)(debugPrefix)} ${color.dim(
      timeFormatter.format(new Date()),
    )} ${message}`;
    if (typeof entry.timing === 'number') {
      let timing: string | number = Math.round(entry.timing);
      if (timing < 1_000) {
        timing = `${timing}ms`;
      } else if (timing < 60_000) {
        timing = `${Math.round(timing * 100) / 100_000}s`;
      }
      message = `${message} ${color.dim(`[${timing}]`)}`;
    }

    // biome-ignore lint/suspicious/noConsoleLog: this is its job
    console.log(message);
  }

  /** Get stats for current logger instance */
  stats() {
    return {
      errorCount: this.errorCount,
      warnCount: this.warnCount,
      infoCount: this.infoCount,
      debugCount: this.debugCount,
    };
  }
}

export class TokensJSONError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokensJSONError';
  }
}