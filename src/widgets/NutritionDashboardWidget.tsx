import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import { WidgetNutritionData, PlannedMealItem, getFoodEmoji } from './widgetData';

interface Props {
  data: WidgetNutritionData;
}

export function NutritionDashboardWidget({ data }: Props) {
  const {
    calories,
    targetCalories,
    remainingCalories,
    consumedPct,
    protein,
    streak,
    plannedMeals,
    hasActivePlan,
    allPlannedMealsEaten,
    totalPlannedTodayCount,
    eatenPlannedTodayCount,
    quickMeals,
    accentColor,
    cardBg,
    subCardBg,
    cardBorder,
  } = data;

  const progressFlex = Math.max(1, Math.min(100, Math.round(consumedPct)));
  const remainingFlex = Math.max(0, 100 - progressFlex);

  // Split up to 4 meals into two rows of 2 items
  const displayItems: PlannedMealItem[] = plannedMeals.length > 0 ? plannedMeals : [];
  const row1 = displayItems.slice(0, 2);
  const row2 = displayItems.slice(2, 4);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: cardBg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: cardBorder,
        padding: 10,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* 1. Header: Kalorien-Status, Streak & Barcode-Scan Button */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
          paddingBottom: 6,
          borderBottomWidth: 1,
          borderBottomColor: '#1E2630',
        }}
      >
        {/* Kalorien & Fortschritt */}
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
            marginRight: 8,
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'ironlog://nutrition' }}
        >
          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: 'match_parent',
            }}
          >
            <TextWidget
              text="IRON LOG • PLAN-MAHLZEITEN"
              style={{
                fontSize: 9,
                color: '#8E9CA8',
                fontWeight: 'bold',
                letterSpacing: 0.5,
              }}
            />
            {streak > 0 && (
              <TextWidget
                text={`🔥 ${streak}d`}
                style={{
                  fontSize: 9,
                  color: '#F59E0B',
                  fontWeight: 'bold',
                }}
              />
            )}
          </FlexWidget>

          <FlexWidget
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              marginTop: 2,
            }}
          >
            <TextWidget
              text={`${calories.toLocaleString('de-DE')}`}
              style={{
                fontSize: 16,
                color: '#FFFFFF',
                fontWeight: 'bold',
              }}
            />
            <TextWidget
              text={` / ${targetCalories.toLocaleString('de-DE')} kcal`}
              style={{
                fontSize: 10,
                color: '#8E9CA8',
                marginLeft: 3,
              }}
            />
            <TextWidget
              text={
                remainingCalories > 0
                  ? ` (noch ${remainingCalories} kcal • ${consumedPct}%)`
                  : ` (Ziel erreicht!)`
              }
              style={{
                fontSize: 9,
                color: accentColor,
                fontWeight: 'bold',
                marginLeft: 4,
              }}
            />
          </FlexWidget>

          {/* Progress Bar */}
          <FlexWidget
            style={{
              height: 4,
              width: 'match_parent',
              flexDirection: 'row',
              backgroundColor: '#10151B',
              borderRadius: 2,
              marginTop: 4,
              overflow: 'hidden',
            }}
          >
            <FlexWidget
              style={{
                flex: progressFlex,
                height: 4,
                backgroundColor: accentColor,
                borderRadius: 2,
              }}
            />
            {remainingFlex > 0 && (
              <FlexWidget
                style={{
                  flex: remainingFlex,
                  height: 4,
                  backgroundColor: '#10151B',
                }}
              />
            )}
          </FlexWidget>
        </FlexWidget>

        {/* 📷 Barcode Scan Button */}
        <FlexWidget
          style={{
            backgroundColor: accentColor,
            borderRadius: 8,
            paddingVertical: 6,
            paddingHorizontal: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'ironlog://scan' }}
        >
          <TextWidget
            text="📷 SCAN"
            style={{
              fontSize: 10,
              color: '#0A1015',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* 2. Hauptbereich: Die nächsten 4 Plan-Mahlzeiten im 2x2 Raster */}
      {allPlannedMealsEaten ? (
        // Zustand: Alle Mahlzeiten für heute bereits geloggt!
        <FlexWidget
          style={{
            flex: 1,
            backgroundColor: subCardBg,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#2A3744',
            marginTop: 6,
            padding: 10,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'ironlog://nutrition' }}
        >
          <TextWidget
            text="🎉 Alle Plan-Mahlzeiten für heute gebucht!"
            style={{
              fontSize: 12,
              color: '#30D158',
              fontWeight: 'bold',
            }}
          />
          <TextWidget
            text={`${eatenPlannedTodayCount} von ${totalPlannedTodayCount} Mahlzeiten erfasst • Protein: ${protein}g`}
            style={{
              fontSize: 10,
              color: '#8E9CA8',
              marginTop: 3,
            }}
          />
        </FlexWidget>
      ) : displayItems.length > 0 ? (
        // Zustand: Mindestens eine anstehende Plan-Mahlzeit
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'space-between',
            marginTop: 6,
          }}
        >
          {/* Reihe 1 (Mahlzeit 1 & 2) */}
          <FlexWidget
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: 'match_parent',
              marginBottom: row2.length > 0 ? 5 : 0,
            }}
          >
            {row1.map((meal) => (
              <PlannedMealCard
                key={meal.scheduledMealId}
                meal={meal}
                accentColor={accentColor}
                subCardBg={subCardBg}
              />
            ))}
            {row1.length === 1 && <FlexWidget style={{ flex: 1, marginLeft: 5 }} />}
          </FlexWidget>

          {/* Reihe 2 (Mahlzeit 3 & 4) */}
          {row2.length > 0 && (
            <FlexWidget
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: 'match_parent',
              }}
            >
              {row2.map((meal) => (
                <PlannedMealCard
                  key={meal.scheduledMealId}
                  meal={meal}
                  accentColor={accentColor}
                  subCardBg={subCardBg}
                />
              ))}
              {row2.length === 1 && <FlexWidget style={{ flex: 1, marginLeft: 5 }} />}
            </FlexWidget>
          )}
        </FlexWidget>
      ) : (
        // Zustand: Kein aktiver Plan -> Zeige Schnell-Log-Rezepte
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'space-between',
            marginTop: 6,
          }}
        >
          <FlexWidget
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: 'match_parent',
              marginBottom: 5,
            }}
          >
            {quickMeals.slice(0, 2).map((qm) => (
              <QuickMealCard
                key={qm.id}
                meal={qm}
                accentColor={accentColor}
                subCardBg={subCardBg}
              />
            ))}
          </FlexWidget>
          <FlexWidget
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: 'match_parent',
            }}
          >
            {quickMeals.slice(2, 4).map((qm) => (
              <QuickMealCard
                key={qm.id}
                meal={qm}
                accentColor={accentColor}
                subCardBg={subCardBg}
              />
            ))}
          </FlexWidget>
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

/** Einzelne Plan-Mahlzeit-Kachel im 2x2 Raster */
function PlannedMealCard({
  meal,
  accentColor,
  subCardBg,
}: {
  meal: PlannedMealItem;
  accentColor: `#${string}`;
  subCardBg: `#${string}`;
}) {
  return (
    <FlexWidget
      style={{
        flex: 1,
        backgroundColor: subCardBg,
        borderWidth: 1,
        borderColor: '#232E38',
        borderRadius: 9,
        padding: 5,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 3,
      }}
      clickAction="LOG_PLANNED_MEAL"
      clickActionData={{
        scheduledMealId: meal.scheduledMealId,
        recipeId: meal.recipeId,
      }}
    >
      {/* Mahlzeiten-Foto oder Emoji-Badge */}
      {meal.imageUri ? (
        <ImageWidget
          image={meal.imageUri as any}
          imageWidth={30}
          imageHeight={30}
          radius={7}
          resizeMode="cover"
        />
      ) : (
        <FlexWidget
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            backgroundColor: '#1E2630',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget text={getFoodEmoji(meal.name)} style={{ fontSize: 14 }} />
        </FlexWidget>
      )}

      {/* Info: Zeit, Name & Kalorien */}
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'column',
          marginLeft: 6,
          marginRight: 4,
        }}
      >
        <TextWidget
          text={`${meal.time} • ${meal.name}`}
          maxLines={1}
          truncate="END"
          style={{
            fontSize: 9.5,
            color: '#FFFFFF',
            fontWeight: 'bold',
          }}
        />
        <TextWidget
          text={`${meal.calories} kcal • ${meal.protein}g P`}
          style={{
            fontSize: 8,
            color: '#8E9CA8',
            marginTop: 1,
          }}
        />
      </FlexWidget>

      {/* 1-Tap Log Action Button */}
      <FlexWidget
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: accentColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text="+"
          style={{
            fontSize: 12,
            color: '#0A1015',
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

/** Fallback-Karte für Quick-Meals falls kein Plan aktiv ist */
function QuickMealCard({
  meal,
  accentColor,
  subCardBg,
}: {
  meal: { id: string; name: string; calories: number; protein: number; imageUri?: string };
  accentColor: `#${string}`;
  subCardBg: `#${string}`;
}) {
  return (
    <FlexWidget
      style={{
        flex: 1,
        backgroundColor: subCardBg,
        borderWidth: 1,
        borderColor: '#232E38',
        borderRadius: 9,
        padding: 5,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 3,
      }}
      clickAction="LOG_RECIPE"
      clickActionData={{ recipeId: meal.id }}
    >
      {meal.imageUri ? (
        <ImageWidget
          image={meal.imageUri as any}
          imageWidth={30}
          imageHeight={30}
          radius={7}
          resizeMode="cover"
        />
      ) : (
        <FlexWidget
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            backgroundColor: '#1E2630',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget text={getFoodEmoji(meal.name)} style={{ fontSize: 14 }} />
        </FlexWidget>
      )}

      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'column',
          marginLeft: 6,
          marginRight: 4,
        }}
      >
        <TextWidget
          text={meal.name}
          maxLines={1}
          truncate="END"
          style={{
            fontSize: 9.5,
            color: '#FFFFFF',
            fontWeight: 'bold',
          }}
        />
        <TextWidget
          text={`${meal.calories} kcal • ${meal.protein}g P`}
          style={{
            fontSize: 8,
            color: '#8E9CA8',
            marginTop: 1,
          }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: accentColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text="+"
          style={{
            fontSize: 12,
            color: '#0A1015',
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
