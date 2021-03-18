import * as React from 'react';

import { StyleSheet, View, Text, Button } from 'react-native';
// import RapidoReach, { RapidoReachEventEmitter } from 'react-native-rapidoreach';
import RapidoReach from '@rapidoreachsdk/react-native-rapidoreach';
// import { RapidoReachEventEmitter } from '@rapidoreachsdk/react-native-rapidoreach';

export default function App() {
  React.useEffect(() => {
    RapidoReach.initWithApiKeyAndUserId(
      'd5ece53df8ac97409298325fec81f3f7',
      'ANDROID_TEST_ID'
    );
    RapidoReach.setNavBarColor('#211056');
    RapidoReach.setNavBarText('RapidoReach');
    RapidoReach.setNavBarTextColor('#FFFFFF');
  }, []);

  function onPressShowRewardCenter() {
    // RapidoReach.isSurveyAvailable((isAvailable) => {
    // if a survey is available, show the reward center
    // if (isAvailable) {
    RapidoReach.showRewardCenter();
    // }
    // })
  }

  return (
    <View style={styles.container}>
      <Text>Result:</Text>
      <Text>RapidoReach</Text>
      <Button title="Rapido" onPress={onPressShowRewardCenter} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
