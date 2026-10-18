sed -i '' -e '/<ScrollView enableOnAndroid={true}/i\
        <View style={{ flexDirection: '\''row'\'', gap: 8, marginBottom: 16 }}>\
          {(['\''usage'\'', '\''name'\'', '\''calories'\'', '\''protein'\''] as const).map(s => (\
            <TouchableOpacity \
              key={s} \
              style={[styles.sortChip, ingredientSort === s && styles.sortChipActive]}\
              onPress={() => setIngredientSort(s)}\
            >\
              <Text style={[styles.sortChipText, ingredientSort === s && styles.sortChipTextActive]}>By {s}</Text>\
            </TouchableOpacity>\
          ))}\
        </View>\
' src/components/EnhancedRecipeBuilder.tsx
