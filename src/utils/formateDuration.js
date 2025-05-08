// utils/formatDuration.js
const formatDuration = (duration) => {
    if (duration < 10) {
      const minutes = Math.floor(duration);
      const seconds = Math.round((duration - minutes) * 60);
      return `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    } else {
      // Assume duration is in seconds.
      const totalSeconds = Math.round(duration);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
  };
  
  module.exports = formatDuration;
  