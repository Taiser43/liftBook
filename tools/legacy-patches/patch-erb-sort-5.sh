sed -i '' -e '/poolItem:/i\
  sortChip: { backgroundColor: '\''#1E1E1E'\'', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '\''#333'\'' },\
  sortChipActive: { backgroundColor: '\''rgba(0, 210, 255, 0.15)'\'', borderColor: '\''#00D2FF'\'' },\
  sortChipText: { color: '\''#888'\'', fontSize: 12, fontWeight: '\''700'\'' },\
  sortChipTextActive: { color: '\''#00D2FF'\'' },\
' src/components/EnhancedRecipeBuilder.tsx
