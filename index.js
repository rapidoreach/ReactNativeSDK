import { NativeEventEmitter, NativeModules } from 'react-native';

const { RNRapidoReach } = NativeModules;
const RapidoReachEventEmitter = new NativeEventEmitter(RNRapidoReach);

export default RNRapidoReach;
export { RapidoReachEventEmitter };
