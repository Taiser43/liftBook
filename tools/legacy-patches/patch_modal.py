import os
import re

filepath = "src/components/SwipeableModal.tsx"

with open(filepath, 'r') as f:
    content = f.read()
    
# import KeyboardAvoidingView, Platform
if 'KeyboardAvoidingView' not in content:
    content = content.replace("View, \n  StyleSheet,", "View, \n  StyleSheet, \n  KeyboardAvoidingView,\n  Platform,")

# wrap children in KeyboardAvoidingView
if 'KeyboardAvoidingView behavior' not in content:
    content = content.replace("{children}", "<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>{children}</KeyboardAvoidingView>")

with open(filepath, 'w') as f:
    f.write(content)

