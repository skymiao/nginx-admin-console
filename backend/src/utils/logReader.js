const fs = require('fs');
const readline = require('readline');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);

const readLogLines = async (filePath, maxLines = 1000, reverse = true) => {
  try {
    const stats = await statAsync(filePath);
    const fileSize = stats.size;
    
    if (fileSize === 0) {
      return [];
    }

    const lines = [];
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      lines.push(line);
      
      if (lines.length >= maxLines) {
        break;
      }
    }

    rl.close();

    return reverse ? lines.reverse() : lines;
  } catch (error) {
    console.error('Error reading log file:', error);
    throw error;
  }
};

const readLogLinesWithPattern = async (filePath, pattern, maxLines = 1000, reverse = true) => {
  try {
    const stats = await statAsync(filePath);
    const fileSize = stats.size;
    
    if (fileSize === 0) {
      return [];
    }

    const lines = [];
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    const regex = new RegExp(pattern, 'gi');

    for await (const line of rl) {
      if (regex.test(line)) {
        lines.push(line);
        
        if (lines.length >= maxLines) {
          break;
        }
      }
    }

    rl.close();

    return reverse ? lines.reverse() : lines;
  } catch (error) {
    console.error('Error reading log file with pattern:', error);
    throw error;
  }
};

const readLogLinesFromPosition = async (filePath, position = 0, maxLines = 1000) => {
  try {
    const stats = await statAsync(filePath);
    const fileSize = stats.size;
    
    if (fileSize === 0) {
      return { lines: [], newPosition: 0 };
    }

    const lines = [];
    const stream = fs.createReadStream(filePath, { 
      encoding: 'utf8',
      start: position,
    });
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    let newPosition = position;

    for await (const line of rl) {
      lines.push(line);
      newPosition += Buffer.byteLength(line + '\n', 'utf8');
      
      if (lines.length >= maxLines) {
        break;
      }
    }

    rl.close();

    return { lines, newPosition };
  } catch (error) {
    console.error('Error reading log file from position:', error);
    throw error;
  }
};

const tailLogLines = async (filePath, maxLines = 100) => {
  try {
    const stats = await statAsync(filePath);
    const fileSize = stats.size;
    
    if (fileSize === 0) {
      return [];
    }

    const lines = [];
    const chunkSize = 64 * 1024;
    let position = fileSize - chunkSize;

    if (position < 0) {
      position = 0;
    }

    const stream = fs.createReadStream(filePath, { 
      encoding: 'utf8',
      start: position,
    });
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      lines.unshift(line);
      
      if (lines.length >= maxLines) {
        break;
      }
    }

    rl.close();

    return lines;
  } catch (error) {
    console.error('Error tailing log file:', error);
    throw error;
  }
};

const getLogFileSize = async (filePath) => {
  try {
    const stats = await statAsync(filePath);
    return stats.size;
  } catch (error) {
    console.error('Error getting log file size:', error);
    return 0;
  }
};

const watchLogFile = (filePath, callback) => {
  try {
    const watcher = fs.watch(filePath, (eventType, filename) => {
      if (eventType === 'change') {
        callback(filePath);
      }
    });

    return () => {
      watcher.close();
    };
  } catch (error) {
    console.error('Error watching log file:', error);
    throw error;
  }
};

module.exports = {
  readLogLines,
  readLogLinesWithPattern,
  readLogLinesFromPosition,
  tailLogLines,
  getLogFileSize,
  watchLogFile,
};
