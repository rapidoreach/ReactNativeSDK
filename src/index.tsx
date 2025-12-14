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

const missingNativeMethodError = (name: string) =>
  new Error(
    `RapidoReach native method '${name}' is not linked. Rebuild the app and ensure pods/gradle are installed.`
  );

const RapidoReach = {
  ...RapidoReachNative,
  initWithApiKeyAndUserId: (apiKey: string, userId: string) => {
    const fn = (RapidoReachNative as any)?.initWithApiKeyAndUserId;
    if (typeof fn === 'function') {
      return fn(apiKey, userId);
    }
    throw missingNativeMethodError('initWithApiKeyAndUserId');
  },
  isSurveyAvailable: (cb: (isAvailable: boolean) => any) => {
    const fn = (RapidoReachNative as any)?.isSurveyAvailable;
    if (typeof fn === 'function') {
      fn(cb);
      return;
    }
    cb(false);
  },
  showRewardCenter: () => {
    const fn = (RapidoReachNative as any)?.showRewardCenter;
    if (typeof fn === 'function') {
      fn();
      return;
    }
    throw missingNativeMethodError('showRewardCenter');
  },
  setUserIdentifier: async (userId: string) => {
    const fn = (RapidoReachNative as any)?.setUserIdentifier;
    if (typeof fn === 'function') {
      return await fn(userId);
    }
    throw missingNativeMethodError('setUserIdentifier');
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
  ) => {
    const fn = (RapidoReachNative as any)?.sendUserAttributes;
    if (typeof fn === 'function') {
      return fn(attributes, clearPrevious);
    }
    return Promise.reject(missingNativeMethodError('sendUserAttributes'));
  },
  showSurvey: (
    tag: string,
    surveyId: string,
    customParams?: Record<string, any>
  ) => {
    const fn = (RapidoReachNative as any)?.showSurvey;
    if (typeof fn === 'function') {
      return fn(tag, surveyId, customParams || {});
    }
    return Promise.reject(missingNativeMethodError('showSurvey'));
  },
  updateBackend: async (baseURL: string, rewardHashSalt?: string) => {
    const fn = (RapidoReachNative as any)?.updateBackend;
    if (typeof fn === 'function') {
      return await fn(baseURL, rewardHashSalt ?? null);
    }
    return Promise.reject(missingNativeMethodError('updateBackend'));
  },
  getPlacementDetails: async (tag: string) => {
    const fn = (RapidoReachNative as any)?.getPlacementDetails;
    if (typeof fn === 'function') {
      return await fn(tag);
    }
    return {};
  },
  listSurveys: async (tag: string) => {
    const fn = (RapidoReachNative as any)?.listSurveys;
    if (typeof fn === 'function') {
      return await fn(tag);
    }
    return [];
  },
  hasSurveys: async (tag: string) => {
    const fn = (RapidoReachNative as any)?.hasSurveys;
    if (typeof fn === 'function') {
      return await fn(tag);
    }
    return false;
  },
  canShowSurvey: async (tag: string, surveyId: string) => {
    const fn = (RapidoReachNative as any)?.canShowSurvey;
    if (typeof fn === 'function') {
      return await fn(tag, surveyId);
    }
    return false;
  },
  canShowContent: async (tag: string) => {
    const fn = (RapidoReachNative as any)?.canShowContent;
    if (typeof fn === 'function') {
      return await fn(tag);
    }
    return false;
  },
  fetchQuickQuestions: async (tag: string) => {
    const fn = (RapidoReachNative as any)?.fetchQuickQuestions;
    if (typeof fn === 'function') {
      return await fn(tag);
    }
    return {};
  },
  hasQuickQuestions: async (tag: string) => {
    const fn = (RapidoReachNative as any)?.hasQuickQuestions;
    if (typeof fn === 'function') {
      return await fn(tag);
    }
    return false;
  },
  answerQuickQuestion: async (tag: string, questionId: string, answer: any) => {
    const fn = (RapidoReachNative as any)?.answerQuickQuestion;
    if (typeof fn === 'function') {
      return await fn(tag, questionId, answer);
    }
    return {};
  },
};

export default RapidoReach as RapidoreachType;
export { RapidoReachEventEmitter };
