# UI & Layout Audit Report

I have thoroughly scanned the application's source code, focusing on interactive elements, containers, screen navigation, and layout properties. I found several significant UX bugs and layout issues that we should fix:

## 1. Keyboard Overlap (Critical)
- **The Bug**: Across the app (in `TrainingScreen`, `NutritionScreen`, `SupplementsScreen`, etc.), there are **31 instances of text inputs**, but there are **zero instances** of `KeyboardAvoidingView`.
- **The Impact**: When you tap on a text input (especially ones near the bottom, like adding a new custom exercise or searching for food), the phone's software keyboard will slide up and completely cover the input field. You won't be able to see what you are typing.
- **The Fix**: Wrap our main input-heavy screens (or specific modals) in a `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>`.

## 2. ScrollView Cut-off / Bottom Overlap
- **The Bug**: The app uses a Bottom Tab Navigator + Global Mini Players (the floating active workout/cardio bars). However, screens like `NutritionScreen` only have `paddingBottom: 40` on their ScrollViews.
- **The Impact**: The combined height of the bottom tab bar (~80px) and the mini players (~80px) is around 160px. Because the lists don't have enough bottom padding, the last items in your lists will be permanently "trapped" under the tab bar, making them impossible to scroll to and tap.
- **The Fix**: Dynamically calculate the `paddingBottom` based on whether the Mini Player is active, ensuring it's at least `160` (or `100` if no mini player is active) for all `ScrollView` and `FlatList` components.

## 3. Modal Safe Area Cut-offs
- **The Bug**: There are 14 `<Modal>` components used throughout the app. Native modals break out of the main application's Safe Area container. 
- **The Impact**: While some screens use `useSafeAreaInsets()` manually, several modals do not account for top or bottom insets. This means "Close" buttons or modal titles at the top of the screen might get stuck underneath the iPhone Notch or Dynamic Island, making them hard to tap.
- **The Fix**: Ensure every `<Modal>` content container applies `paddingTop: insets.top` (or wraps content in a `SafeAreaView`).

## 4. MapView Zero-Height Collapse (Addressed)
- **The Bug**: The `MapView` in `CardioTrackingScreen` was originally styled using `flex: 1` inside a container.
- **The Impact**: On some Android devices, React Native Maps fails to calculate flex bounds correctly and collapses the map into a 0px height element, leaving just a blank background.
- **The Fix**: I have already fixed this by explicitly converting it to `width: '100%', height: '100%'`.

## 5. Touch Target Bleed on Mini Players
- **The Bug**: The Global Mini Players sit as absolute overlays on top of the screen.
- **The Impact**: If their invisible padding or margins extend too far upwards, they will intercept taps meant for the list items right above them.
- **The Fix**: Ensure `pointerEvents="box-none"` is applied to the root wrapper of these overlays.

---
**How would you like to proceed?** I can start patching these one by one! I recommend starting with the **Keyboard Overlap** or the **ScrollView Cut-off** as they impact usability the most.
