#import <React/RCTBridgeModule.h>
#import <Foundation/Foundation.h>
#import "React/RCTEventEmitter.h"

@interface RCT_EXTERN_MODULE(RNRapidoReach, NSObject)

RCT_EXTERN_METHOD(initWithApiKeyAndUserId:(NSString *)apiKey userId:(NSString *)userId)
RCT_EXTERN_METHOD(showRewardCenter)
RCT_EXTERN_METHOD(setNavBarColor:(NSString *)barColor)
RCT_EXTERN_METHOD(setNavBarText:(NSString *)text)
RCT_EXTERN_METHOD(setNavBarTextColor:(NSString *)textColor)


@end

//@implementation RNRapidoReach
//@end

@interface RCT_EXTERN_MODULE(RapidoReachEventEmitter, RCTEventEmitter)
RCT_EXTERN_METHOD(onReward)
RCT_EXTERN_METHOD(onRewardCenterOpened)
RCT_EXTERN_METHOD(onRewardCenterClosed)
RCT_EXTERN_METHOD(rapidoreachSurveyAvailable)

@end
