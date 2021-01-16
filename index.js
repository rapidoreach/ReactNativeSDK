import { NativeEventEmitter, NativeModules } from 'react-native';

const { RNRapidoReach } = NativeModules;
const RapidoReachEventEmitter = new NativeEventEmitter(NativeModules.RapidoReachEventEmitter);

export default RNRapidoReach;
export { RapidoReachEventEmitter };