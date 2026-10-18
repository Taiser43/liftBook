sed -i '' -e '804,809c\
        const activePlan = state.dietPlans?.find(p => p.isActive);\
        const baseTargets = activePlan?.targetCalories ? {\
            calories: activePlan.targetCalories,\
            protein: activePlan.targetProtein || 0,\
            carbs: activePlan.targetCarbs || 0,\
            fat: activePlan.targetFat || 0\
        } : (state.targets || { calories: 2500, protein: 150, carbs: 250, fat: 80 });\
' src/store/store.ts
