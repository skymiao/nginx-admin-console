const fs = require('fs');
const path = require('path');

const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const hours = now.getHours();
const minutes = now.getMinutes();

const months = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
};

const monthStr = months[month] || 'Feb';

console.log(`Generating test logs for current date: ${year}-${month}-${day} ${hours}:${minutes}`);
console.log(`Log date format: ${day}/${monthStr}/${year}`);

let logContent = '# Test log file - Current request trend chart\n';
logContent += '# Format: IP - - [date:time timezone] "method path protocol" status size\n';
logContent += '# Generated: ' + new Date().toISOString() + '\n';
logContent += '# Time range: Last 6 hours\n';
logContent += '# Interval: 1 request per minute\n\n';

const ips = ['192.168.1.100', '192.168.1.101', '192.168.1.102', '192.168.1.103', '192.168.1.104',
             '192.168.1.105', '192.168.1.106', '192.168.1.107', '192.168.1.108', '192.168.1.109'];
const paths = ['GET / HTTP/1.1', 'GET /api/users HTTP/1.1', 'POST /api/login HTTP/1.1', 
               'GET /api/configs HTTP/1.1', 'GET /api/servers HTTP/1.1', 'POST /api/servers HTTP/1.1',
               'GET /api/logs HTTP/1.1', 'GET /api/stats HTTP/1.1'];
const sizes = [1234, 567, 890, 345, 678, 234, 456, 789];

let requestCount = 0;

for (let h = 0; h < 6; h++) {
  const hour = (hours - 5 + h + 24) % 24;
  const hourStr = String(hour).padStart(2, '0');
  
  for (let m = 0; m < 60; m++) {
    const minuteStr = String(m).padStart(2, '0');
    const ip = ips[requestCount % ips.length];
    const path = paths[requestCount % paths.length];
    const size = sizes[requestCount % sizes.length];
    
    const logLine = `${ip} - - [${day}/${monthStr}/${year}:${hourStr}:${minuteStr}:00 +0800] "${path}" 200 ${size}\n`;
    logContent += logLine;
    
    requestCount++;
  }
}

const logPath = path.join(__dirname, 'backend', 'data', 'logs', 'access.log');
fs.writeFileSync(logPath, logContent, 'utf-8');

console.log(`Generated ${requestCount} log entries`);
console.log(`Log file saved to: ${logPath}`);
console.log(`Log date range: ${day}/${monthStr}/${year}:00:00:00 to ${day}/${monthStr}/${year}:23:59:00`);
