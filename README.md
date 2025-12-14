# @rapidoreachsdk/react-native-rapidoreach

## Before you start

### Get your API key

Sign-up for a new developer account and create a new app [here](https://www.rapidoreach.com/) and copy your API Key.

## Getting started

`$ npm install @rapidoreachsdk/react-native-rapidoreach`

`$ cd ios && pod install && cd ..` # CocoaPods on iOS needs this extra step

> This wrapper bundles RapidoReach Android SDK `1.0.2` (minSdk 23) and depends on the iOS CocoaPods SDK `RapidoReach 1.0.7` (iOS 15.1+).
> The library and example app support React 19 / React Native 0.83.x.

### Troubleshooting installs

- iOS CocoaPods: if you see `None of your spec sources contain a spec satisfying the dependency: RapidoReach (= 1.0.7)`, run `pod repo update` then `pod install` again.
- Android build “Cannot run program node”: make sure Node.js is installed. You can also set `NODE_BINARY=/absolute/path/to/node`.

We are all set up! Now let's use the module.

## Usage

### Initialize RapidoReach
First, you need to initialize the RapidoReach instance with `initWithApiKeyAndUserId` call.
```javascript
// Import RapidoReach native module
import RapidoReach from '@rapidoreachsdk/react-native-rapidoreach';

async function init() {
  // In your app initialization, initialize RapidoReach
  await RapidoReach.initWithApiKeyAndUserId('YOUR_API_TOKEN', 'YOUR_USER_ID');
}
```

### Reward Center
Next, implement the logic to display the reward center. Call the `showRewardCenter` method when you are ready to send the user into the reward center where they can complete surveys in exchange for your virtual currency. We automatically convert the amount of currency a user gets based on the conversion rate specified in your app.

```javascript
onPressShowRewardCenter = () => {
  RapidoReach.isSurveyAvailable((isAvailable) => {
    // if a survey is available, show the reward center
    if (isAvailable) {
      RapidoReach.showRewardCenter();
    }
  })
}
```

### Reward Callback

To ensure safety and privacy, we recommend using a server side callback to notify you of all awards. In the developer dashboard for your App add the server callback that we should call to notify you when a user has completed an offer. Note the user ID pass into the initialize call will be returned to you in the server side callback. More information about setting up the callback can be found in the developer dashboard.

The quantity value will automatically be converted to your virtual currency based on the exchange rate you specified in your app. Currency is always rounded in favor of the app user to improve happiness and engagement.

#### Client Side Award Callback

If you do not have a server to handle server side callbacks we additionally provide you with the ability to listen to client side reward notification. 

First, import Native Module Event Emitter:
```javascript
import { RapidoReachEventEmitter } from '@rapidoreachsdk/react-native-rapidoreach';
```

Then, add event listener for award notification (in `componentWillMount`, for example):
```javascript
this.onRewardListener = RapidoReachEventEmitter.addListener(
  'onReward',
  this.onReward,
);
```

Implement the callback:
```javascript
onReward = (quantity) => {
  console.log('reward quantity: ', quantity);
}
```

#### Reward Center Events

You can optionally listen for the `onRewardCenterOpened` and `onRewardCenterClosed` events that are fired when your Reward Center modal is opened and closed.

Add event listeners for `onRewardCenterOpened` and `onRewardCenterClosed`:

```javascript
this.onRewardCenterOpenedListener = RapidoReachEventEmitter.addListener(
  'onRewardCenterOpened',
  this.onRewardCenterOpened,
);
this.onRewardCenterClosedListener = RapidoReachEventEmitter.addListener(
  'onRewardCenterClosed',
  this.onRewardCenterClosed,
);
```

Implement event callbacks:
```javascript
onRewardCenterOpened = () => {
  console.log('onRewardCenterOpened called!');
}

onRewardCenterClosed = () => {
  console.log('onRewardCenterClosed called!');
}
```

#### Survey Available Callback

If you'd like to be proactively alerted to when a survey is available for a user you can add this event listener. 

First, import Native Module Event Emitter:
```javascript
import { RapidoReachEventEmitter } from '@rapidoreachsdk/react-native-rapidoreach';
```

Then, add event listener for award notification (in `componentWillMount`, for example):
```javascript
this.rapidoreachSurveyAvailableListener = RapidoReachEventEmitter.addListener(
  'rapidoreachSurveyAvailable',
  this.rapidoreachSurveyAvailable,
);
```

Implement the callback:
```javascript
rapidoreachSurveyAvailable = (surveyAvailable) => {
  if (surveyAvailable) {
    console.log('rapidoreach survey is available');
  } else {
    console.log('rapidoreach survey is NOT available');
  }
}
```

Finally, don't forget to remove your event listeners in the `componentWillUnmount` lifecycle method:
```javascript
componentWillUnmount() {
  this.onRewardListener.remove();
  this.onRewardCenterOpenedListener.remove();
  this.onRewardCenterClosedListener.remove();
  this.rapidoreachSurveyAvailableListener.remove();
}
```


### Customizing SDK options

We provide several methods to customize the navigation bar to feel like your app.

```
    RapidoReach.setNavBarColor('#211056');
    RapidoReach.setNavBarText('Rewards');
    RapidoReach.setNavBarTextColor('#FFFFFF');
```

### Additional APIs

The wrapper now exposes the newer native SDK capabilities:

- `updateBackend(baseURL, rewardHashSalt?)` (staging/regional backends)
- `sendUserAttributes(attributes, clearPrevious?)`
- `setUserIdentifier(userId)`
- Placement helpers: `getPlacementDetails(tag)`, `listSurveys(tag)`, `hasSurveys(tag)`, `canShowSurvey(tag, surveyId)`, `canShowContent(tag)`, `showSurvey(tag, surveyId, customParams?)`
- Quick Questions: `fetchQuickQuestions(tag)`, `hasQuickQuestions(tag)`, `answerQuickQuestion(tag, questionId, answer)`
- Debug helpers: `getBaseUrl()`, `enableNetworkLogging(enabled)`

### Network logging (debug)

To stream full SDK network calls (including base URL) into JS, enable logging and subscribe to `rapidoreachNetworkLog`:

```js
import RapidoReach, { RapidoReachEventEmitter } from '@rapidoreachsdk/react-native-rapidoreach';

RapidoReach.enableNetworkLogging(true);

const sub = RapidoReachEventEmitter.addListener('rapidoreachNetworkLog', (entry) => {
  console.log(entry); // { name, method, url, requestBody?, responseBody?, error?, timestampMs }
});
```

You can also read the current backend base URL via `await RapidoReach.getBaseUrl()`.

## Contact
Please send all questions, concerns, or bug reports to admin@rapidoreach.com.

## FAQ
##### What do you do to protect privacy?
We take privacy very seriously. All data is encrypted before being sent over the network. We also use HTTPS to ensure the integrity and privacy of the exchanged data.

##### What kind of analytics do you provide?

Our dashboard will show metrics for sessions, impressions, revenue, and much more. We are constantly enhancing our analytics so we can better serve your needs.

##### What is your fill rate?

We have thousands of surveys and add hundreds more every day. Most users will have the opportunity to complete at least one survey on a daily basis.

##### I'm ready to go live! What are the next steps?

Let us know! We'd love to help ensure everything flows smoothly and help you achieve your monetisation goals!


## Following the rewarded and/or theOfferwall approach

An example is provided on [Github](https://github.com/rapidoreach/ReactNativeSDK) that demonstrates how a publisher can implement the rewarded and/or the Offerwall approach. Upon survey completion, the publisher can reward the user.


## Limitations / Minimum Requirements

This is just an initial version of the plugin. There are still some
limitations:

- You cannot pass custom attributes during initialization
- No tests implemented yet
- Minimum iOS is 15.1 (React Native 0.83 requirement) and minimum Android version is 23 (native SDK requirement; RN template minSdk is 24)

For other RapidoReach products, see
[RapidoReach docs](https://www.rapidoreach.com/docs).

# ReactNativeSDK
