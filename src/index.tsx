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

type RapidoReachErrorCode =
  | 'not_linked'
  | 'not_initialized'
  | 'invalid_args'
  | 'already_initialized';

class RapidoReachError extends Error {
  code: RapidoReachErrorCode;
  details?: Record<string, any>;

  constructor(
    code: RapidoReachErrorCode,
    message: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'RapidoReachError';
    this.code = code;
    this.details = details;
  }
}

let isInitialized = false;
let initializedApiKey: string | null = null;

const logIntegrationError = (message: string) => {
  // Keep apps from "crashing" on integration mistakes, but make the failure visible.
  // In dev this will still show up in LogBox/console.
  console.error(`[rapidoreach] ${message}`);
};

const emitterTarget =
  Platform.OS === 'ios'
    ? NativeModules.RapidoReachEventEmitter
    : NativeModuleCandidate;
const RapidoReachEventEmitter =
  emitterTarget != null
    ? new NativeEventEmitter(emitterTarget)
    : new NativeEventEmitter();

const RapidoReachNative = NativeModuleCandidate as RapidoreachType;

const notLinkedError = (name: string) =>
  new RapidoReachError(
    'not_linked',
    `RapidoReach native method '${name}' is not linked. Rebuild the app and ensure pods/gradle are installed.`,
    { method: name }
  );

const notInitializedError = (name: string) =>
  new RapidoReachError(
    'not_initialized',
    `RapidoReach not initialized. Call RapidoReach.initWithApiKeyAndUserId(apiKey, userId) and await it before calling '${name}'.`,
    { method: name }
  );

const invalidArgsError = (name: string, message: string) =>
  new RapidoReachError('invalid_args', message, { method: name });

const alreadyInitializedError = (name: string) =>
  new RapidoReachError(
    'already_initialized',
    `RapidoReach is already initialized. Restart the app to reinitialize.`,
    { method: name }
  );

const ensureInitializedOrReject = (name: string) => {
  if (isInitialized) return null;
  return notInitializedError(name);
};

const RapidoReach = {
  ...RapidoReachNative,
  initWithApiKeyAndUserId: async (apiKey: string, userId: string) => {
    const trimmedKey = (apiKey ?? '').trim();
    const trimmedUserId = (userId ?? '').trim();
    if (!trimmedKey) {
      throw invalidArgsError('initWithApiKeyAndUserId', 'apiKey is required');
    }
    if (!trimmedUserId) {
      throw invalidArgsError('initWithApiKeyAndUserId', 'userId is required');
    }
    if (
      isInitialized &&
      initializedApiKey != null &&
      initializedApiKey !== trimmedKey
    ) {
      throw alreadyInitializedError('initWithApiKeyAndUserId');
    }

    const fn = (RapidoReachNative as any)?.initWithApiKeyAndUserId;
    if (typeof fn === 'function') {
      try {
        await fn(trimmedKey, trimmedUserId);
        isInitialized = true;
        initializedApiKey = trimmedKey;
        return;
      } catch (e) {
        isInitialized = false;
        initializedApiKey = null;
        throw e;
      }
    }
    const err = notLinkedError('initWithApiKeyAndUserId');
    logIntegrationError(err.message);
    return Promise.reject(err);
  },
  isSurveyAvailable: (cb: (isAvailable: boolean) => any) => {
    const fn = (RapidoReachNative as any)?.isSurveyAvailable;
    if (typeof fn === 'function') {
      if (!isInitialized) {
        logIntegrationError(notInitializedError('isSurveyAvailable').message);
        cb(false);
        return;
      }
      try {
        fn(cb);
      } catch (e: any) {
        logIntegrationError(
          `isSurveyAvailable failed: ${e?.message ?? String(e)}`
        );
        cb(false);
      }
      return;
    }
    logIntegrationError(notLinkedError('isSurveyAvailable').message);
    cb(false);
  },
  showRewardCenter: () => {
    if (!isInitialized) {
      logIntegrationError(notInitializedError('showRewardCenter').message);
      return;
    }
    const fn = (RapidoReachNative as any)?.showRewardCenter;
    if (typeof fn === 'function') {
      try {
        fn();
      } catch (e: any) {
        logIntegrationError(
          `showRewardCenter failed: ${e?.message ?? String(e)}`
        );
      }
      return;
    }
    logIntegrationError(notLinkedError('showRewardCenter').message);
  },
  setUserIdentifier: async (userId: string) => {
    const err = ensureInitializedOrReject('setUserIdentifier');
    if (err) return Promise.reject(err);

    const fn = (RapidoReachNative as any)?.setUserIdentifier;
    if (typeof fn === 'function') {
      return await fn(userId);
    }
    const e = notLinkedError('setUserIdentifier');
    logIntegrationError(e.message);
    return Promise.reject(e);
  },
  setNavBarColor: (color: string) => {
    const fn = (RapidoReachNative as any)?.setNavBarColor;
    if (typeof fn === 'function') {
      try {
        fn(color);
      } catch (e: any) {
        logIntegrationError(
          `setNavBarColor failed: ${e?.message ?? String(e)}`
        );
      }
    }
  },
  setNavBarTextColor: (color: string) => {
    const fn = (RapidoReachNative as any)?.setNavBarTextColor;
    if (typeof fn === 'function') {
      try {
        fn(color);
      } catch (e: any) {
        logIntegrationError(
          `setNavBarTextColor failed: ${e?.message ?? String(e)}`
        );
      }
    }
  },
  setNavBarText: (text: string) => {
    const fn = (RapidoReachNative as any)?.setNavBarText;
    if (typeof fn === 'function') {
      try {
        fn(text);
      } catch (e: any) {
        logIntegrationError(`setNavBarText failed: ${e?.message ?? String(e)}`);
      }
    }
  },
  enableNetworkLogging: (enabled: boolean) => {
    const fn = (RapidoReachNative as any)?.enableNetworkLogging;
    if (typeof fn === 'function') {
      try {
        fn(enabled);
      } catch (e: any) {
        logIntegrationError(
          `enableNetworkLogging failed: ${e?.message ?? String(e)}`
        );
      }
    }
  },
  getBaseUrl: async () => {
    if (!isInitialized) return '';
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
    const err = ensureInitializedOrReject('sendUserAttributes');
    if (err) return Promise.reject(err);

    const fn = (RapidoReachNative as any)?.sendUserAttributes;
    if (typeof fn === 'function') {
      return fn(attributes, clearPrevious);
    }
    const e = notLinkedError('sendUserAttributes');
    logIntegrationError(e.message);
    return Promise.reject(e);
  },
  showSurvey: (
    tag: string,
    surveyId: string,
    customParams?: Record<string, any>
  ) => {
    const err = ensureInitializedOrReject('showSurvey');
    if (err) return Promise.reject(err);

    const fn = (RapidoReachNative as any)?.showSurvey;
    if (typeof fn === 'function') {
      return fn(tag, surveyId, customParams || {});
    }
    const e = notLinkedError('showSurvey');
    logIntegrationError(e.message);
    return Promise.reject(e);
  },
  updateBackend: async (baseURL: string, rewardHashSalt?: string) => {
    const fn = (RapidoReachNative as any)?.updateBackend;
    if (typeof fn === 'function') {
      return await fn(baseURL, rewardHashSalt ?? null);
    }
    const e = notLinkedError('updateBackend');
    logIntegrationError(e.message);
    return Promise.reject(e);
  },
  getPlacementDetails: async (tag: string) => {
    const err = ensureInitializedOrReject('getPlacementDetails');
    if (err) return Promise.reject(err);

    const fn = (RapidoReachNative as any)?.getPlacementDetails;
    if (typeof fn === 'function') {
      return await fn(tag);
    }
    const e = notLinkedError('getPlacementDetails');
    logIntegrationError(e.message);
    return Promise.reject(e);
  },
  listSurveys: async (tag: string) => {
    const err = ensureInitializedOrReject('listSurveys');
    if (err) return Promise.reject(err);

    const fn = (RapidoReachNative as any)?.listSurveys;
    if (typeof fn === 'function') {
      return await fn(tag);
    }
    const e = notLinkedError('listSurveys');
    logIntegrationError(e.message);
    return Promise.reject(e);
  },
  hasSurveys: async (tag: string) => {
    const err = ensureInitializedOrReject('hasSurveys');
    if (err) return Promise.reject(err);

    const fn = (RapidoReachNative as any)?.hasSurveys;
    if (typeof fn === 'function') {
      return await fn(tag);
    }
    return false;
  },
  canShowSurvey: async (tag: string, surveyId: string) => {
    const err = ensureInitializedOrReject('canShowSurvey');
    if (err) return Promise.reject(err);

    const fn = (RapidoReachNative as any)?.canShowSurvey;
    if (typeof fn === 'function') {
      return await fn(tag, surveyId);
    }
    return false;
  },
  canShowContent: async (tag: string) => {
    const err = ensureInitializedOrReject('canShowContent');
    if (err) return Promise.reject(err);

    const fn = (RapidoReachNative as any)?.canShowContent;
    if (typeof fn === 'function') {
      return await fn(tag);
    }
    return false;
  },
  fetchQuickQuestions: async (tag: string) => {
    const err = ensureInitializedOrReject('fetchQuickQuestions');
    if (err) return Promise.reject(err);

    const fn = (RapidoReachNative as any)?.fetchQuickQuestions;
    if (typeof fn === 'function') {
      return await fn(tag);
    }
    const e = notLinkedError('fetchQuickQuestions');
    logIntegrationError(e.message);
    return Promise.reject(e);
  },
  hasQuickQuestions: async (tag: string) => {
    const err = ensureInitializedOrReject('hasQuickQuestions');
    if (err) return Promise.reject(err);

    const fn = (RapidoReachNative as any)?.hasQuickQuestions;
    if (typeof fn === 'function') {
      return await fn(tag);
    }
    return false;
  },
  answerQuickQuestion: async (tag: string, questionId: string, answer: any) => {
    const err = ensureInitializedOrReject('answerQuickQuestion');
    if (err) return Promise.reject(err);

    const fn = (RapidoReachNative as any)?.answerQuickQuestion;
    if (typeof fn === 'function') {
      return await fn(tag, questionId, answer);
    }
    const e = notLinkedError('answerQuickQuestion');
    logIntegrationError(e.message);
    return Promise.reject(e);
  },
};

export default RapidoReach as RapidoreachType;
export { RapidoReachEventEmitter };
