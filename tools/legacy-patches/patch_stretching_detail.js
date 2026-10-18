const fs = require('fs');
let code = fs.readFileSync('src/screens/StretchingDetailScreen.tsx', 'utf8');

const oldNoVideo = `<View style={[styles.videoContainer, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
            <MaterialCommunityIcons name="video-off-outline" size={48} color="#666" />
            <Text style={{color: '#666', marginTop: 10}}>No Video Available</Text>
          </View>`;

const newNoVideo = `<View style={[styles.videoContainer, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}>
            {exercise.thumbnailUrl ? (
               <Image source={{uri: exercise.thumbnailUrl}} style={{width: '100%', height: '100%', opacity: 0.7}} resizeMode="cover" />
            ) : (
               <MaterialCommunityIcons name="image-off-outline" size={48} color="#666" />
            )}
            <View style={{ position: 'absolute', alignItems: 'center' }}>
               <MaterialCommunityIcons name="video-off-outline" size={48} color="#FFF" />
               <Text style={{color: '#FFF', marginTop: 10, fontWeight: 'bold'}}>Video Not Included</Text>
            </View>
          </View>`;

// Note: I also need to make sure Image is imported from react-native
if (!code.includes("Image,")) {
  code = code.replace("ScrollView, TouchableOpacity, SafeAreaView", "ScrollView, TouchableOpacity, SafeAreaView, Image");
}

code = code.replace(oldNoVideo, newNoVideo);

fs.writeFileSync('src/screens/StretchingDetailScreen.tsx', code);
console.log("Patched StretchingDetailScreen");
