"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWriteStreamAsync = exports.createWriteStream = exports.PinoSentryTransport = exports.SentryInstance = void 0;
const split2_1 = __importDefault(require("split2"));
const pumpify_1 = __importDefault(require("pumpify"));
const through2_1 = __importDefault(require("through2"));
const Sentry = __importStar(require("@sentry/node"));
exports.SentryInstance = Sentry;
class ExtendedError extends Error {
    constructor(info) {
        super(info.message);
        this.name = "Error";
        this.stack = info.stack || null;
    }
}
const SEVERITIES_MAP = {
    10: Sentry.Severity.Debug,
    20: Sentry.Severity.Debug,
    30: Sentry.Severity.Info,
    40: Sentry.Severity.Warning,
    50: Sentry.Severity.Error,
    60: Sentry.Severity.Fatal,
    // Support for useLevelLabels
    // https://github.com/pinojs/pino/blob/master/docs/api.md#uselevellabels-boolean
    trace: Sentry.Severity.Debug,
    debug: Sentry.Severity.Debug,
    info: Sentry.Severity.Info,
    warning: Sentry.Severity.Warning,
    error: Sentry.Severity.Error,
    fatal: Sentry.Severity.Fatal,
};
// How severe the Severity is
const SeverityIota = {
    [Sentry.Severity.Debug]: 1,
    [Sentry.Severity.Log]: 2,
    [Sentry.Severity.Info]: 3,
    [Sentry.Severity.Warning]: 4,
    [Sentry.Severity.Error]: 5,
    [Sentry.Severity.Fatal]: 6,
    [Sentry.Severity.Critical]: 7,
};
function get(data, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], data);
}
class PinoSentryTransport {
    constructor(options) {
        // Default minimum log level to `debug`
        this.minimumLogLevel = SeverityIota[Sentry.Severity.Debug];
        this.messageAttributeKey = 'msg';
        this.extraAttributeKeys = ['extra'];
        this.stackAttributeKey = 'stack';
        this.maxValueLength = 250;
        this.sentryExceptionLevels = [Sentry.Severity.Fatal, Sentry.Severity.Error];
        this.decorateScope = (_data, _scope) => { };
        Sentry.init(this.validateOptions(options || {}));
    }
    getLogSeverity(level) {
        return SEVERITIES_MAP[level] || Sentry.Severity.Info;
    }
    get sentry() {
        return Sentry;
    }
    transformer() {
        return through2_1.default.obj((chunk, _enc, cb) => {
            this.prepareAndGo(chunk, cb);
        });
    }
    prepareAndGo(chunk, cb) {
        const severity = this.getLogSeverity(chunk.level);
        // Check if we send this Severity to Sentry
        if (this.shouldLog(severity) === false) {
            setImmediate(cb);
            return;
        }
        const tags = chunk.tags || {};
        const breadcrumbs = chunk.breadcrumbs || {};
        if (chunk.reqId) {
            tags.uuid = chunk.reqId;
        }
        if (chunk.responseTime) {
            tags.responseTime = chunk.responseTime;
        }
        if (chunk.hostname) {
            tags.hostname = chunk.hostname;
        }
        const extra = {};
        this.extraAttributeKeys.forEach((key) => {
            if (chunk[key] !== undefined) {
                extra[key] = chunk[key];
            }
        });
        const message = get(chunk, this.messageAttributeKey);
        const stack = get(chunk, this.stackAttributeKey) || '';
        const scope = new Sentry.Scope();
        this.decorateScope(chunk, scope);
        scope.setLevel(severity);
        if (this.isObject(tags)) {
            Object.keys(tags).forEach(tag => scope.setTag(tag, tags[tag]));
        }
        if (this.isObject(extra)) {
            Object.keys(extra).forEach(ext => scope.setExtra(ext, extra[ext]));
        }
        if (this.isObject(breadcrumbs)) {
            Object.values(breadcrumbs).forEach(breadcrumb => scope.addBreadcrumb(breadcrumb));
        }
        // Capturing Errors / Exceptions
        if (this.isSentryException(severity)) {
            const error = message instanceof Error ? message : new ExtendedError({ message, stack });
            setImmediate(() => {
                Sentry.captureException(error, scope);
                cb();
            });
        }
        else {
            // Capturing Messages
            setImmediate(() => {
                Sentry.captureMessage(message, scope);
                cb();
            });
        }
    }
    validateOptions(options) {
        var _a, _b, _c, _d, _e, _f;
        const dsn = options.dsn || process.env.SENTRY_DSN;
        if (!dsn) {
            console.log('Warning: [pino-sentry] Sentry DSN must be supplied, otherwise logs will not be reported. Pass via options or `SENTRY_DSN` environment variable.');
        }
        if (options.level) {
            const allowedLevels = Object.keys(SeverityIota);
            if (allowedLevels.includes(options.level) === false) {
                throw new Error(`[pino-sentry] Option \`level\` must be one of: ${allowedLevels.join(', ')}. Received: ${options.level}`);
            }
            // Set minimum log level
            this.minimumLogLevel = SeverityIota[options.level];
        }
        this.stackAttributeKey = (_a = options.stackAttributeKey) !== null && _a !== void 0 ? _a : this.stackAttributeKey;
        this.extraAttributeKeys = (_b = options.extraAttributeKeys) !== null && _b !== void 0 ? _b : this.extraAttributeKeys;
        this.messageAttributeKey = (_c = options.messageAttributeKey) !== null && _c !== void 0 ? _c : this.messageAttributeKey;
        this.maxValueLength = (_d = options.maxValueLength) !== null && _d !== void 0 ? _d : this.maxValueLength;
        this.sentryExceptionLevels = (_e = options.sentryExceptionLevels) !== null && _e !== void 0 ? _e : this.sentryExceptionLevels;
        this.decorateScope = (_f = options.decorateScope) !== null && _f !== void 0 ? _f : this.decorateScope;
        return {
            dsn,
            // npm_package_name will be available if ran with
            // from a "script" field in package.json.
            serverName: process.env.npm_package_name || 'pino-sentry',
            environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
            debug: !!process.env.SENTRY_DEBUG || false,
            sampleRate: 1.0,
            maxBreadcrumbs: 100,
            ...options,
        };
    }
    isObject(obj) {
        const type = typeof obj;
        return type === 'function' || type === 'object' && !!obj;
    }
    isSentryException(level) {
        return this.sentryExceptionLevels.includes(level);
    }
    shouldLog(severity) {
        const logLevel = SeverityIota[severity];
        return logLevel >= this.minimumLogLevel;
    }
}
exports.PinoSentryTransport = PinoSentryTransport;
;
function createWriteStream(options) {
    const transport = new PinoSentryTransport(options);
    const sentryTransformer = transport.transformer();
    return new pumpify_1.default(split2_1.default((line) => {
        try {
            return JSON.parse(line);
        }
        catch (e) {
            // Returning undefined will not run the sentryTransformer
            return;
        }
    }), sentryTransformer);
}
exports.createWriteStream = createWriteStream;
;
// Duplicate to not break API
exports.createWriteStreamAsync = createWriteStream;
//# sourceMappingURL=transport.js.map