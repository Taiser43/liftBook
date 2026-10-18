const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalActivityBar.tsx', 'utf8');

// Remove the corrupted inject
content = content.replace("                  </>\n      )}\n    </Animated.View>\n                <Text style", "                <Text style");

// Make sure the end of the file has the correct closing
const badEnding = `          <MaterialCommunityIcons name="chevron-up" size={hasMusic ? 20 : 24} color="#888" />
        </TouchableOpacity>
      )}
      </>
      )}
    </Animated.View>
  );
}`;

const goodEnding = `          <MaterialCommunityIcons name="chevron-up" size={hasMusic ? 20 : 24} color="#888" />
        </TouchableOpacity>
      )}
      </>
      )}
    </Animated.View>
  );
}`;

content = content.replace(badEnding, goodEnding); // It might already be correct

// Ensure there is only one "return (" and we properly open the fragment
// Actually let's just make sure the `<>` opens where it should
fs.writeFileSync('src/components/GlobalActivityBar.tsx', content);
