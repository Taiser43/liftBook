import os

filepath = "src/store/store.ts"

with open(filepath, 'r') as f:
    content = f.read()

content = content.replace("new Date().toISOString().split('T')[0]", "getLocalDateString()")

with open(filepath, 'w') as f:
    f.write(content)

