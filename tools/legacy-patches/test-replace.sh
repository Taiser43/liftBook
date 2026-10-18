sed -i '' -e '/TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged/i\
    TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {\
      if (event.paused) {\
        if (event.permanent) {\
          await TrackPlayer.pause();\
        } else {\
          await TrackPlayer.setVolume(0.1);\
        }\
      } else {\
        await TrackPlayer.setVolume(1.0);\
      }\
    });\
\
' src/components/MediaPlayerWidget.tsx
