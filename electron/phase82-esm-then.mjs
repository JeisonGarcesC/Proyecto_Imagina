import { app } from 'electron';

console.log(`ESM_THEN_START electron=${process.versions.electron} runAsNode=${process.env.ELECTRON_RUN_AS_NODE ?? '<unset>'}`);
setTimeout(() => {
  console.log(`ESM_THEN_TIMEOUT ready=${app.isReady()}`);
  app.exit(2);
}, 10000);
app.whenReady().then(() => {
  console.log('ESM_THEN_READY');
  app.exit(0);
});
