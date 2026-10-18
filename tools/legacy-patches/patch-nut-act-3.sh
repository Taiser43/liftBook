sed -i '' -e '/<\/View>/i\
      <SwipeableModal visible={!!actionMealId} onClose={() => setActionMealId(null)}>\
        <Text style={styles.modalTitle}>Meal Options</Text>\
        <View style={{ marginTop: 24 }}>\
          <TouchableOpacity style={styles.actionMenuBtn} onPress={() => {\
            if (actionMealId) {\
               moveMealToYesterday(actionMealId);\
               setActionMealId(null);\
            }\
          }}>\
            <MaterialCommunityIcons name="calendar-arrow-left" size={24} color="#00D2FF" />\
            <Text style={styles.actionMenuBtnText}>Log for Yesterday</Text>\
          </TouchableOpacity>\
          <TouchableOpacity style={[styles.actionMenuBtn, { marginTop: 12 }]} onPress={() => {\
            if (actionMealId) {\
               deleteLoggedMeal(actionMealId);\
               setActionMealId(null);\
            }\
          }}>\
            <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FF453A" />\
            <Text style={[styles.actionMenuBtnText, { color: '\''#FF453A'\'' }]}>Delete Meal</Text>\
          </TouchableOpacity>\
          <TouchableOpacity style={[styles.actionMenuBtn, { marginTop: 24, backgroundColor: '\''#2A2A2A'\'' }]} onPress={() => setActionMealId(null)}>\
            <Text style={[styles.actionMenuBtnText, { flex: 1, textAlign: '\''center'\'', marginLeft: 0 }]}>Cancel</Text>\
          </TouchableOpacity>\
        </View>\
      </SwipeableModal>\
' src/screens/NutritionScreen.tsx
