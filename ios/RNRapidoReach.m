#import "RNRapidoReach.h"

@implementation RNRapidoReach

bool hasListeners;

- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}
RCT_EXPORT_MODULE();

- (NSArray<NSString *> *)supportedEvents
{
    return @[@"onReward", @"onRewardCenterOpened", @"onRewardCenterClosed", @"rapidoreachSurveyAvailable"];
}

RCT_EXPORT_METHOD(initWithApiKeyAndUserId:(NSString *)apiKey userId:(NSString *)userId) {
    [RapidoReach initWithApiKey:apiKey userId:userId];
    
    /* Set delegate for receiving award callbacks */
    [[RapidoReach getInstance] setRewardListenerDelegate:self];
    
    /* Set delegate for receiving survey callbacks */
    [[RapidoReach getInstance] setSurveyListenerDelegate:self];

    /* Set delegate for receiving survey available callback */
    [[RapidoReach getInstance] setSurveyAvailableDelegate:self];
}

RCT_EXPORT_METHOD(showRewardCenter) {
    [RapidoReach showRewardCenter];
}

RCT_EXPORT_METHOD(isSurveyAvailable:(RCTResponseSenderBlock)callback) {
    BOOL isSurveyAvailable = [[RapidoReach getInstance] isSurveyAvailable];
    NSNumber *paramObject = [NSNumber numberWithBool:isSurveyAvailable];
    callback([NSArray arrayWithObject:paramObject]);
}

/* Callbacks */

- (void)onReward: (NSNumber* )quantity {
    if (hasListeners) { // Only send events if anyone is listening
        [self sendEventWithName:@"onReward" body:quantity];
    }
}

- (void)onRewardCenterOpened {
    if (hasListeners) { // Only send events if anyone is listening
        [self sendEventWithName:@"onRewardCenterOpened" body:nil];
    }
}

- (void)onRewardCenterClosed {
    if (hasListeners) { // Only send events if anyone is listening
        [self sendEventWithName:@"onRewardCenterClosed" body:nil];
    }
}

- (void)rapidoreachSurveyAvailable: (BOOL)surveyAvailable {
    if (hasListeners) { // Only send events if anyone is listening
        [self sendEventWithName:@"rapidoreachSurveyAvailable" body:[NSNumber numberWithBool:surveyAvailable]];
    }
}

/* Optimize event emitter */

// Will be called when this module's first listener is added.
-(void)startObserving {
    hasListeners = YES;
    // Set up any upstream listeners or background tasks as necessary
}

// Will be called when this module's last listener is removed, or on dealloc.
-(void)stopObserving {
    hasListeners = NO;
    // Remove upstream listeners, stop unnecessary background tasks
}

@end
