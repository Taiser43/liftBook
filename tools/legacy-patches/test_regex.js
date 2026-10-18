const url = "https://www.youtube.com/watch?v=ZkN7u7oZKZQ";
const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
console.log(match ? match[1] : "NO MATCH");
