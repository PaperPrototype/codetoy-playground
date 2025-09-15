function consolelog(...args) {
    self.postMessage({ type: 'log', payload: args });
}

function consoleerror(...args) {
    self.postMessage({ type: 'error', payload: args });
}

self.console = {
    log: consolelog,
    error: consoleerror,
    info: consolelog,
    warn: consoleerror,
    debug: consolelog,
};