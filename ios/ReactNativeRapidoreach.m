#import <React/RCTBridgeModule.h>
#import <Foundation/Foundation.h>
#import "React/RCTEventEmitter.h"

@interface RCT_EXTERN_MODULE(RNRapidoReach, NSObject)

RCT_EXTERN_METHOD(initWithApiKeyAndUserId:(NSString *)apiKey userId:(NSString *)userId resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(showRewardCenter)
RCT_EXTERN_METHOD(setNavBarColor:(NSString *)barColor)
RCT_EXTERN_METHOD(setNavBarText:(NSString *)text)
RCT_EXTERN_METHOD(setNavBarTextColor:(NSString *)textColor)
RCT_EXTERN_METHOD(enableNetworkLogging:(BOOL)enabled)
RCT_EXTERN_METHOD(getBaseUrl:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(isSurveyAvailable:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(setUserIdentifier:(NSString *)userId resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(sendUserAttributes:(NSDictionary *)attributes clearPrevious:(BOOL)clearPrevious resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getPlacementDetails:(NSString *)tag resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(listSurveys:(NSString *)tag resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(hasSurveys:(NSString *)tag resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(canShowSurvey:(NSString *)tag surveyId:(NSString *)surveyId resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(canShowContent:(NSString *)tag resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(showSurvey:(NSString *)tag surveyId:(NSString *)surveyId customParams:(NSDictionary *)customParams resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(fetchQuickQuestions:(NSString *)tag resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(hasQuickQuestions:(NSString *)tag resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(answerQuickQuestion:(NSString *)tag questionId:(NSString *)questionId answer:(id)answer resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(updateBackend:(NSString *)baseURL rewardHashSalt:(NSString * _Nullable)rewardHashSalt resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)


@end

//@implementation RNRapidoReach
//@end

@interface RCT_EXTERN_MODULE(RapidoReachEventEmitter, RCTEventEmitter)
RCT_EXTERN_METHOD(onReward:(NSInteger)reward)
RCT_EXTERN_METHOD(onRewardCenterOpened)
RCT_EXTERN_METHOD(onRewardCenterClosed)
RCT_EXTERN_METHOD(rapidoreachSurveyAvailable:(BOOL)available)
RCT_EXTERN_METHOD(rapidoreachNetworkLog:(NSDictionary *)payload)

@end
