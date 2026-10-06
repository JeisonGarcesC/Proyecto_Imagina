import { app } from 'electron';

console.log(`ESM_START electron=${process.versions.electron} runAsNode=${process.env.ELECTRON_RUN_AS_NODE ?? '<unset>'}`);
app.on('ready', () => console.log('ESM_EVENT_READY'));
setTimeout(() => {
  console.log(`ESM_TIMEOUT ready=${app.isReady()}`);
  app.exit(2);
}, 10000);
await app.whenReady();
console.log('ESM_WHEN_READY');
app.exit(0);
