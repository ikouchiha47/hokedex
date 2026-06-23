/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Surface uncaught JS errors in logcat for release builds
const prevHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('[CRASH]', isFatal ? 'FATAL' : 'ERROR', error?.message, error?.stack);
  prevHandler?.(error, isFatal);
});

AppRegistry.registerComponent(appName, () => App);
