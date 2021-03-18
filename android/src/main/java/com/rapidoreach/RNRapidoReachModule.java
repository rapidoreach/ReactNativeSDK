package com.rapidoreach;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;
import com.facebook.react.modules.core.RCTNativeAppEventEmitter;

import com.rapidoreach.rapidoreachsdk.RapidoReach;
import com.rapidoreach.rapidoreachsdk.RapidoReachRewardListener;
import com.rapidoreach.rapidoreachsdk.RapidoReachSurveyListener;
import com.rapidoreach.rapidoreachsdk.RapidoReachSurveyAvailableListener;

public class RNRapidoReachModule extends ReactContextBaseJavaModule
        implements LifecycleEventListener, RapidoReachRewardListener, RapidoReachSurveyListener, RapidoReachSurveyAvailableListener {

    private final ReactApplicationContext reactContext;
    private boolean isAppInitialized = false;

    public RNRapidoReachModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        reactContext.addLifecycleEventListener(this);
    }

    @Override
    public String getName() {
        return "RNRapidoReach";
    }

    @ReactMethod
    public void initWithApiKeyAndUserId(String apiKey, String userId) {
        RapidoReach.initWithApiKeyAndUserIdAndActivityContext(apiKey, userId, getCurrentActivity());

        // The below code is required because onResume is called before this method by default
        // and it should be prevented for the correct working of the SDK
        RapidoReach.getInstance().onResume(getCurrentActivity());
        isAppInitialized = true;

        RapidoReach.getInstance().setRapidoReachRewardListener(this);
        RapidoReach.getInstance().setRapidoReachSurveyListener(this);
        RapidoReach.getInstance().setRapidoReachSurveyAvailableListener(this);
    }

    @ReactMethod
    public void setNavBarColor(String barColor) {
      RapidoReach.getInstance().setNavigationBarColor(barColor);
    }

    @ReactMethod
    public void setNavBarText(String text) {
      RapidoReach.getInstance().setNavigationBarText(text);
    }

    @ReactMethod
    public void setNavBarTextColor(String textColor) {
      RapidoReach.getInstance().setNavigationBarTextColor(textColor);
    }



  @ReactMethod
    public void showRewardCenter() {
        RapidoReach.getInstance().showRewardCenter();
    }

    @ReactMethod
    public void isSurveyAvailable(Callback cb) {
        cb.invoke(RapidoReach.getInstance().isSurveyAvailable());
    }

    /* Callbacks */

    private void sendEvent(ReactContext reactContext,
                           String eventName,
                           @Nullable Object params) {
        reactContext
                .getJSModule(RCTNativeAppEventEmitter.class)
                .emit(eventName, params);
    }

    @Override
    public void onReward(int quantity) {
        sendEvent(this.reactContext, "onReward", quantity);
    }

    @Override
    public void onRewardCenterOpened() {
        sendEvent(this.reactContext, "onRewardCenterOpened", null);
    }

    @Override
    public void onRewardCenterClosed() {
        sendEvent(this.reactContext, "onRewardCenterClosed", null);
    }

    @Override
    public void rapidoReachSurveyAvailable(boolean surveyAvailable) {
        sendEvent(this.reactContext, "rapidoReachSurveyAvailable", surveyAvailable);
    }

    /* Lifecycle methods */

    @Override
    public void onHostResume() {
        if (isAppInitialized) {
            RapidoReach.getInstance().onResume(getCurrentActivity());
        }
    }

    @Override
    public void onHostPause() {
        RapidoReach.getInstance().onPause();
    }

    @Override
    public void onHostDestroy() {
        // Actvity `onDestroy`
    }

}
