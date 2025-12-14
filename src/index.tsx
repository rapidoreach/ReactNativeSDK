import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

type RapidoreachType = {
  initWithApiKeyAndUserId(apiKey: string, userId: string): Promise<void> | void;
  setUserIdentifier(userId: string): Promise<void>;
  setNavBarColor(color: string): void;
  setNavBarTextColor(color: string): void;
  setNavBarText(text: string): void;
  enableNetworkLogging(enabled: boolean): void;
  getBaseUrl(): Promise<string>;
  showRewardCenter(): void;
  isSurveyAvailable(cb: (isAvailable: boolean) => any): void;
  sendUserAttributes(
    attributes: Record<string, any>,
    clearPrevious?: boolean
  ): Promise<void>;
  getPlacementDetails(tag: string): Promise<Record<string, any>>;
  listSurveys(tag: string): Promise<any[]>;
  hasSurveys(tag: string): Promise<boolean>;
  canShowSurvey(tag: string, surveyId: string): Promise<boolean>;
  canShowContent(tag: string): Promise<boolean>;
  showSurvey(
    tag: string,
    surveyId: string,
    customParams?: Record<string, any>
  ): Promise<void>;
  fetchQuickQuestions(tag: string): Promise<Record<string, any>>;
  hasQuickQuestions(tag: string): Promise<boolean>;
  answerQuickQuestion(
    tag: string,
    questionId: string,
    answer: any
  ): Promise<Record<string, any>>;
  updateBackend(baseURL: string, rewardHashSalt?: string | null): Promise<void>;
};

const { RNRapidoReach, Rapidoreach } = NativeModules as any;
const NativeModuleCandidate = RNRapidoReach ?? Rapidoreach;

const emitterTarget =
  Platform.OS === 'ios'
    ? NativeModules.RapidoReachEventEmitter
    : NativeModuleCandidate;
const RapidoReachEventEmitter =
  emitterTarget != null
    ? new NativeEventEmitter(emitterTarget)
    : new NativeEventEmitter();

const RapidoReachNative = NativeModuleCandidate as RapidoreachType;

const RapidoReach = {
  ...RapidoReachNative,
  initWithApiKeyAndUserId: (apiKey: string, userId: string) => {
    const fn = (RapidoReachNative as any)?.initWithApiKeyAndUserId;
    if (typeof fn === 'function') {
      return fn(apiKey, userId);
    }
    throw new Error(
      'RapidoReach native module is not linked. Run `cd ios && pod install`, rebuild the app, and ensure the pod is installed.'
    );
  },
  isSurveyAvailable: (cb: (isAvailable: boolean) => any) => {
    const fn = (RapidoReachNative as any)?.isSurveyAvailable;
    if (typeof fn === 'function') {
      fn(cb);
      return;
    }
    cb(false);
  },
  setNavBarColor: (color: string) => {
    const fn = (RapidoReachNative as any)?.setNavBarColor;
    if (typeof fn === 'function') {
      fn(color);
    }
  },
  setNavBarTextColor: (color: string) => {
    const fn = (RapidoReachNative as any)?.setNavBarTextColor;
    if (typeof fn === 'function') {
      fn(color);
    }
  },
  setNavBarText: (text: string) => {
    const fn = (RapidoReachNative as any)?.setNavBarText;
    if (typeof fn === 'function') {
      fn(text);
    }
  },
  enableNetworkLogging: (enabled: boolean) => {
    const fn = (RapidoReachNative as any)?.enableNetworkLogging;
    if (typeof fn === 'function') {
      fn(enabled);
    }
  },
  getBaseUrl: async () => {
    const fn = (RapidoReachNative as any)?.getBaseUrl;
    if (typeof fn === 'function') {
      return await fn();
    }
    return '';
  },
  sendUserAttributes: (
    attributes: Record<string, any>,
    clearPrevious = false
  ) => RapidoReachNative.sendUserAttributes(attributes, clearPrevious),
  showSurvey: (
    tag: string,
    surveyId: string,
    customParams?: Record<string, any>
  ) => RapidoReachNative.showSurvey(tag, surveyId, customParams || {}),
  updateBackend: (baseURL: string, rewardHashSalt?: string) =>
    RapidoReachNative.updateBackend(baseURL, rewardHashSalt ?? null),
};

export default RapidoReach as RapidoreachType;
export { RapidoReachEventEmitter };
