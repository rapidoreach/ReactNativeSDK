# @rapidoreachsdk/react-native-rapidoreach

Latest release: `1.0.8` (includes improved error guards, safer listeners, and the bundled AAR).

## Before you start

### Get your API key

Sign up for a developer account and create a new app on the RapidoReach dashboard, then copy your API Key.

## Getting started

Install the package:

`npm install @rapidoreachsdk/react-native-rapidoreach`

Then install iOS pods:

`cd ios && pod install && cd ..`

Notes:
- Android: this wrapper bundles `android/libs/RapidoReach-1.0.2.aar` so you don't need an external Maven repo.
- iOS: this wrapper depends on the CocoaPods SDK `RapidoReach 1.0.8`.
- React Native: tested with React 19 / React Native 0.83.x.

The packaged AAR is already part of this project, so you can build/publish your React Native app without any GitHub Packages or Maven credentials.

### Troubleshooting installs

- iOS CocoaPods: if you see `None of your spec sources contain a spec satisfying the dependency: RapidoReach (= 1.0.8)`, run `pod repo update` then `pod install` again.
- Android build “Cannot run program node”: make sure Node.js is installed. You can also set `NODE_BINARY=/absolute/path/to/node`.

## Usage

### Import

```js
import RapidoReach, { RapidoReachEventEmitter } from '@rapidoreachsdk/react-native-rapidoreach';
```

### Initialize RapidoReach

Initialize once (typically on app start or after login). Always `await` it before calling other APIs.

```javascript
async function init() {
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

Tip: for more control and better UX, prefer placement-based checks using `await RapidoReach.canShowContent(tag)` and `await RapidoReach.listSurveys(tag)` (see below).

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

#### Error events

Subscribe to `onError` to surface integration/runtime issues (recommended in debug builds):

```js
const sub = RapidoReachEventEmitter.addListener('onError', (payload) => {
  // payload: { code: string, message: string }
  console.warn('RapidoReach onError:', payload);
});
```

Remember to remove listeners when your screen unmounts.


### Customizing SDK options

We provide several methods to customize the navigation bar to feel like your app:

```
    RapidoReach.setNavBarColor('#211056');
    RapidoReach.setNavBarText('Rewards');
    RapidoReach.setNavBarTextColor('#FFFFFF');
```

If your user logs in/out, update the user identifier (after init):

```js
await RapidoReach.setUserIdentifier('NEW_USER_ID');
```

### Additional APIs

The wrapper now exposes the newer native SDK capabilities:

- `updateBackend(baseURL, rewardHashSalt?)` (staging/regional backends)
- `sendUserAttributes(attributes, clearPrevious?)`
- `setUserIdentifier(userId)`
- Placement helpers: `getPlacementDetails(tag)`, `listSurveys(tag)`, `hasSurveys(tag)`, `canShowSurvey(tag, surveyId)`, `canShowContent(tag)`, `showSurvey(tag, surveyId, customParams?)`
- Quick Questions: `fetchQuickQuestions(tag)`, `hasQuickQuestions(tag)`, `answerQuickQuestion(tag, questionId, answer)`
- Debug helpers: `getBaseUrl()`, `enableNetworkLogging(enabled)`

### Placement-based flows (recommended)

If you use multiple placements (or want a more guided UX than a single “reward center” button), you can query placement state, list surveys, and open a specific survey.

```js
const tag = 'default';

const canShow = await RapidoReach.canShowContent(tag);
if (!canShow) return;

const surveys = await RapidoReach.listSurveys(tag);
const firstSurveyId = surveys?.[0]?.surveyIdentifier;
if (!firstSurveyId) return;

await RapidoReach.showSurvey(tag, firstSurveyId, { source: 'my_screen' });
```

### Quick Questions

```js
const tag = 'default';
const payload = await RapidoReach.fetchQuickQuestions(tag);
const has = await RapidoReach.hasQuickQuestions(tag);

if (has) {
  await RapidoReach.answerQuickQuestion(tag, 'QUESTION_ID', 'yes');
}
```

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

### User attributes

Use attributes to improve targeting and eligibility (only send non-sensitive values you have consent for):

```js
await RapidoReach.sendUserAttributes(
  { country: 'US', age: 25, premium: true },
  false // clearPrevious
);
```


### Error handling (optional)

Most APIs return Promises and will reject with a structured error (typically a `code` + `message`). Wrap calls in `try/catch`, especially during integration.

Common error codes:
- `not_initialized`: call and await `initWithApiKeyAndUserId` first
- `no_activity` (Android): call from a foreground screen (Activity available)
- `no_presenter` (iOS): no active view controller available to present UI
- `not_linked`: native module not installed/linked (run pods/gradle rebuild)

For non-Promise APIs (like `showRewardCenter()`), the native layer also emits an `onError` event via `RapidoReachEventEmitter` with `{ code, message }`.

Example:

```js
try {
  await RapidoReach.sendUserAttributes({ country: 'US' });
} catch (e) {
  console.warn('RapidoReach error:', e);
}
```

## Contact
Please send all questions, concerns, or bug reports to developers@rapidoreach.com.

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

- Some UI APIs require a visible screen (Android Activity / iOS UIViewController).
- Minimum iOS is 15.1 (React Native 0.83 requirement) and minimum Android version is 23 (native SDK requirement; RN template minSdk is 24)

For other RapidoReach products, see
[RapidoReach docs](https://docs.rapidoreach.com).

# ReactNativeSDK
