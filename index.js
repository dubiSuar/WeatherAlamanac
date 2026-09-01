/**
 * Entry point. `app.json`'s `name` must match the string registered here and
 * the one used by the native projects (AppDelegate's moduleName on iOS,
 * MainActivity's getMainComponentName on Android). If you renamed the project
 * after scaffolding and the app boots to a red screen about an unregistered
 * component, this mismatch is why.
 */
import { AppRegistry } from "react-native";
import App from "./App";
import { name as appName } from "./app.json";

AppRegistry.registerComponent(appName, () => App);
