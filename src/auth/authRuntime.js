export function shouldRestoreApiSession(env) {
  return env?.PROD === true;
}
