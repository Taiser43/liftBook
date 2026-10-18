sed -i '' -e '/deleteLoggedMeal: (id: string) => void;/a\
  moveMealToYesterday: (id: string) => void;\
' src/store/store.ts
