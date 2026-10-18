const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalActivityBar.tsx', 'utf8');

const target = `          <MaterialCommunityIcons name="chevron-up" size={hasMusic ? 20 : 24} color="#888" />
        </TouchableOpacity>
      )}

    </Animated.View>
  );
};`;

const replacement = `          <MaterialCommunityIcons name="chevron-up" size={hasMusic ? 20 : 24} color="#888" />
        </TouchableOpacity>
      )}
      </>
      )}
    </Animated.View>
  );
};`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/GlobalActivityBar.tsx', content);
