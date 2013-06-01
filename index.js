var mc = require('minecraft-protocol')
  , fs = require('fs');

// Put this in an external YAML file.
var options = {
  username: "Your username here",
  password: "Your password here",
  host: "Server to debug here",
  port: 25565, // port to connect to
  whitelistip: "" // This is to prohibit anyone from using your debug proxy. Leave blank to allow anyone to access
}

// Make this more configurable
var writestream = fs.createWriteStream('dump.txt', {flags: 'w', encoding: 'utf8'});

console.log("Creating server...");

// Put this in an external YAML file.
var server = mc.createServer({
  host: '0.0.0.0',
  port: 25565,
  'max-players': 1,
  motd: "Proxy",
  'online-mode': false,
});

console.log("Server listening on " + '0.0.0.0' + ":" + 25565);

server.on('login', function(client) {
  console.log("Logging in");
  if (options.whitelistip !== "" && client.socket.remoteAddress != options.whitelistip) {
    client.end("You aren't whitelisted.");
    return;
  }
  var ready = false;
  var remoteclient = mc.createClient(options);
  remoteclient.once('login', function() {
    ready = true;
    console.log("All clear !");
  });
  remoteclient.on('packet', function(packet) {
    packet.destination = "local";
    writestream.write(JSON.stringify(packet) + "\n");
    if (!ready) {
      return;
    }
    client.write(packet.id, packet);
  });
  client.on('packet', function(packet) {
    packet.destination = "remote";
    writestream.write(JSON.stringify(packet) + "\n");
    if (!ready) {
      return;
    }
    remoteclient.write(packet.id, packet);
  });
  remoteclient.on('error', function(err) {
    console.log('Error from remoteclient');
    console.error(err);
  });
  client.on('error', function(err) {
    console.log('Error from client');
    console.error(err);
  });
  remoteclient.on('end', function(reason) {
    client.end('[Remote] ' + reason);
  });
  client.on('end', function(reason) {
    remoteclient.end('[Local] ' + reason);
  });
});

server.on('error', function(error) {
  console.log('Error:', error);
});
