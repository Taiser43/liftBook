const jsmediatags = require("jsmediatags");
jsmediatags.read("./test.mp3", {
  onSuccess: function(tag) {
    console.log(tag.tags.title, tag.tags.artist, tag.tags.picture);
  },
  onError: function(error) {
    console.log(':(', error.type, error.info);
  }
});
