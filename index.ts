/**
 * Entry of the app. Android may start it only to run a background task or to draw the home
 * screen widget, with no screen mounted: those are registered here, before expo-router.
 */

import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import './src/background/tasks';
import { widgetTaskHandler } from './src/widget/widget-task-handler';
import 'expo-router/entry';

if (Platform.OS === 'android') registerWidgetTaskHandler(widgetTaskHandler);
