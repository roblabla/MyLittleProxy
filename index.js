var mc = require('minecraft-protocol')
  , fs = require('fs');

var options = {
  username: "your minecraft username",
  password: "your minecraft password",
  host: "server to connect to.",
  port: 25565, // port to connect to
  whitelistip: "" // This is to prohibit anyone from using your debug proxy. Leave blank to allow anyone to access
}

var writestream = fs.createWriteStream('dump.txt', {flags: 'w', encoding: 'utf8'});

var server = mc.createServer({
  host: '0.0.0.0',
  port: 25565,
  'max-players': 1,
  motd: "Proxy",
  'online-mode': false,
});


server.on('login', function(client) {
  if (options.whitelistip !== "" && client.socket.remoteAddress != options.whitelistip) {
    client.end("You aren't whitelisted.");
    return;
  }
  var ready = false;
  var remoteclient = mc.createClient(options);
  remoteclient.once('login', function() {
    ready = true;
    console.log("remote is ready");
  });
  remoteclient.on('packet', function(packet) {
    if (!ready) {
      return;
    }
    packet.destination = "local";
    writestream.write(JSON.stringify(packet) + "\n");
    client.write(packet.id, packet);
  });
  client.on('packet', function(packet) {
    if (!ready) {
      return;
    }
    packet.destination = "remote";
    writestream.write(JSON.stringify(packet) + "\n");
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
  console.log("Ready");
});

server.on('error', function(error) {
  console.log('Error:', error);
});
