const os = require('os');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  
  return 'localhost';
}

const ip = getLocalIPAddress();
console.log('\n🌐 Network Access Information:');
console.log('================================');
console.log(`Local access: http://localhost:5173`);
console.log(`LAN access: http://${ip}:5173`);
console.log('\n📱 Share the LAN address with other devices on your network!');
console.log('🔧 Make sure your firewall allows connections on ports 3001 and 5173\n');