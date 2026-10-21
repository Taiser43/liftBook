import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import { WidgetNutritionData, getFoodEmoji } from './widgetData';

interface Props {
  data: WidgetNutritionData;
}

export function NutritionCompactWidget({ data }: Props) {
  const {
    calories,
    targetCalories,
    consumedPct,
    protein,
    targetProtein,
    plannedMeals,
    allPlannedMealsEaten,
    quickMeals,
    accentColor,
    cardBg,
    subCardBg,
    cardBorder,
  } = data;

  const progressFlex = Math.max(1, Math.min(100, Math.round(consumedPct)));
  const remainingFlex = Math.max(0, 100 - progressFlex);

  // Next planned meal or fallback quick-meal
  const nextPlanned = plannedMeals[0];
  const fallbackMeal = quickMeals[0];

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: cardBg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: cardBorder,
        padding: 9,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Oberer Bereich: Klick öffnet Nutrition Screen */}
      <FlexWidget
        style={{
          flexDirection: 'column',
          width: 'match_parent',
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'ironlog://nutrition' }}
      >
        <TextWidget
          text="IRON LOG • HEUTE"
          style={{
            fontSize: 8.5,
            color: '#8E9CA8',
            fontWeight: 'bold',
            letterSpacing: 0.5,
          }}
        />

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
              fontSize: 17,
              color: '#FFFFFF',
              fontWeight: 'bold',
            }}
          />
          <TextWidget
            text=" kcal"
            style={{
              fontSize: 9.5,
              color: '#8E9CA8',
              marginLeft: 2,
            }}
          />
        </FlexWidget>

        <TextWidget
          text={`Ziel: ${targetCalories.toLocaleString('de-DE')} (${consumedPct}%) • P: ${protein}/${targetProtein}g`}
          style={{
            fontSize: 8.5,
            color: accentColor,
            fontWeight: 'bold',
            marginTop: 1,
          }}
        />

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

      {/* Mittlerer/Unterer Bereich: Nächste anstehende Plan-Mahlzeit mit Foto & 1-Tap Log */}
      {nextPlanned ? (
        <FlexWidget
          style={{
            backgroundColor: subCardBg,
            borderWidth: 1,
            borderColor: '#232E38',
            borderRadius: 8,
            padding: 5,
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 6,
            width: 'match_parent',
          }}
          clickAction="LOG_PLANNED_MEAL"
          clickActionData={{
            scheduledMealId: nextPlanned.scheduledMealId,
            recipeId: nextPlanned.recipeId,
          }}
        >
          {nextPlanned.imageUri ? (
            <ImageWidget
              image={nextPlanned.imageUri as any}
              imageWidth={26}
              imageHeight={26}
              radius={6}
              resizeMode="cover"
            />
          ) : (
            <FlexWidget
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                backgroundColor: '#1E2630',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TextWidget text={getFoodEmoji(nextPlanned.name)} style={{ fontSize: 13 }} />
            </FlexWidget>
          )}

          <FlexWidget
            style={{
              flex: 1,
              flexDirection: 'column',
              marginLeft: 5,
              marginRight: 4,
            }}
          >
            <TextWidget
              text={`${nextPlanned.time} • ${nextPlanned.name}`}
              maxLines={1}
              truncate="END"
              style={{
                fontSize: 8.5,
                color: '#FFFFFF',
                fontWeight: 'bold',
              }}
            />
            <TextWidget
              text={`${nextPlanned.calories} kcal • ${nextPlanned.protein}g P`}
              style={{
                fontSize: 7.5,
                color: '#8E9CA8',
              }}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: accentColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget
              text="+"
              style={{
                fontSize: 10,
                color: '#0A1015',
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>
        </FlexWidget>
      ) : allPlannedMealsEaten ? (
        <FlexWidget
          style={{
            backgroundColor: subCardBg,
            borderRadius: 8,
            padding: 5,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 6,
          }}
        >
          <TextWidget
            text="🎉 Alle Mahlzeiten geloggt!"
            style={{
              fontSize: 8.5,
              color: '#30D158',
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      ) : fallbackMeal ? (
        <FlexWidget
          style={{
            backgroundColor: subCardBg,
            borderWidth: 1,
            borderColor: '#232E38',
            borderRadius: 8,
            padding: 5,
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 6,
            width: 'match_parent',
          }}
          clickAction="LOG_RECIPE"
          clickActionData={{ recipeId: fallbackMeal.id }}
        >
          <FlexWidget
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              backgroundColor: '#1E2630',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget text={getFoodEmoji(fallbackMeal.name)} style={{ fontSize: 12 }} />
          </FlexWidget>
          <FlexWidget style={{ flex: 1, marginLeft: 5 }}>
            <TextWidget
              text={`+ ${fallbackMeal.name}`}
              maxLines={1}
              truncate="END"
              style={{
                fontSize: 8.5,
                color: '#FFFFFF',
                fontWeight: 'bold',
              }}
            />
          </FlexWidget>
        </FlexWidget>
      ) : null}

      {/* Unten: Barcode Scan Button */}
      <FlexWidget
        style={{
          backgroundColor: accentColor,
          borderRadius: 7,
          paddingVertical: 4,
          alignItems: 'center',
          justifyContent: 'center',
          width: 'match_parent',
          marginTop: 4,
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'ironlog://scan' }}
      >
        <TextWidget
          text="📷 BARCODE SCAN"
          style={{
            fontSize: 8.5,
            color: '#0A1015',
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
