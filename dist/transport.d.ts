/// <reference types="node" />
import stream from 'stream';
import * as Sentry from '@sentry/node';
declare type ValueOf<T> = T extends any[] ? T[number] : T[keyof T];
export declare const SentryInstance: typeof Sentry;
declare const SEVERITIES_MAP: {
    readonly 10: Sentry.Severity.Debug;
    readonly 20: Sentry.Severity.Debug;
    readonly 30: Sentry.Severity.Info;
    readonly 40: Sentry.Severity.Warning;
    readonly 50: Sentry.Severity.Error;
    readonly 60: Sentry.Severity.Fatal;
    readonly trace: Sentry.Severity.Debug;
    readonly debug: Sentry.Severity.Debug;
    readonly info: Sentry.Severity.Info;
    readonly warning: Sentry.Severity.Warning;
    readonly error: Sentry.Severity.Error;
    readonly fatal: Sentry.Severity.Fatal;
};
declare const SeverityIota: {
    readonly debug: 1;
    readonly log: 2;
    readonly info: 3;
    readonly warning: 4;
    readonly error: 5;
    readonly fatal: 6;
    readonly critical: 7;
};
interface PinoSentryOptions extends Sentry.NodeOptions {
    /** Minimum level for a log to be reported to Sentry from pino-sentry */
    level?: keyof typeof SeverityIota;
    messageAttributeKey?: string;
    extraAttributeKeys?: string[];
    stackAttributeKey?: string;
    maxValueLength?: number;
    sentryExceptionLevels?: Sentry.Severity[];
    decorateScope?: (data: Record<string, unknown>, _scope: Sentry.Scope) => void;
}
export declare class PinoSentryTransport {
    minimumLogLevel: ValueOf<typeof SeverityIota>;
    messageAttributeKey: string;
    extraAttributeKeys: string[];
    stackAttributeKey: string;
    maxValueLength: number;
    sentryExceptionLevels: Sentry.Severity[];
    decorateScope: (_data: Record<string, unknown>, _scope: Sentry.Scope) => void;
    constructor(options?: PinoSentryOptions);
    getLogSeverity(level: keyof typeof SEVERITIES_MAP): Sentry.Severity;
    get sentry(): typeof Sentry;
    transformer(): stream.Transform;
    prepareAndGo(chunk: any, cb: any): void;
    private validateOptions;
    private isObject;
    private isSentryException;
    private shouldLog;
}
export declare function createWriteStream(options?: PinoSentryOptions): stream.Duplex;
export declare const createWriteStreamAsync: typeof createWriteStream;
export {};