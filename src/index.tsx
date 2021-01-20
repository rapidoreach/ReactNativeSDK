import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

type RapidoreachType = {
  initWithApiKeyAndUserId(a: string, b: string): any;
};

// const { Rapidoreach } = NativeModules;
const { RNRapidoReach } = NativeModules;
let RapidoReachEventEmitter;
if (Platform.OS === 'android') {
  RapidoReachEventEmitter = new NativeEventEmitter(RNRapidoReach);
}
if (Platform.OS === 'ios') {
  RapidoReachEventEmitter = new NativeEventEmitter(
    NativeModules.RapidoReachEventEmitter
  );
}

export default RNRapidoReach as RapidoreachType;
export { RapidoReachEventEmitter };
// export default Rapidoreach as RapidoreachType;
