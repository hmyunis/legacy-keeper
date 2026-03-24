import { syncBuiltinESMExports } from 'node:module';
import childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';

const originalExec = childProcess.exec;

childProcess.exec = function patchedExec(...args) {
  try {
    return originalExec.apply(this, args);
  } catch (error) {
    const callback =
      typeof args[1] === 'function'
        ? args[1]
        : typeof args[2] === 'function'
          ? args[2]
          : undefined;

    if (callback) {
      queueMicrotask(() => callback(error, '', ''));
    }

    const stub = new EventEmitter();
    stub.pid = -1;
    stub.kill = () => false;
    return stub;
  }
};

syncBuiltinESMExports();

const hasConfigLoader = process.argv.some((arg) => arg.startsWith('--configLoader'));
if (!hasConfigLoader) {
  process.argv.push('--configLoader', 'native');
}

const hasPool = process.argv.some((arg) => arg === '--pool' || arg.startsWith('--pool='));
if (!hasPool) {
  process.argv.push('--pool=threads');
}

const hasSingleThread = process.argv.some((arg) => arg.startsWith('--poolOptions.threads.singleThread'));
if (!hasSingleThread) {
  process.argv.push('--poolOptions.threads.singleThread');
}

const hasIsolate = process.argv.some((arg) => arg.startsWith('--poolOptions.threads.isolate'));
if (!hasIsolate) {
  process.argv.push('--poolOptions.threads.isolate=false');
}

await import('vitest/vitest.mjs');
