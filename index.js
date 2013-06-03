var mc = require('minecraft-protocol')
  , fs = require('fs')
  , yaml = require('js-yaml');
  ;

var default_options = {
  host: "0.0.0.0",
  port: 25565,
  "online-mode": true,
  "encryptionEnabled": true,
  motd: "A minecraft server",
  "max-players": 1,
  remote: {
    host: "localhost",
    port: 25565,
    online_mode: false,
    force_username: false,
    username: "if remote.online_mode is true, valid username",
    password: "if remote.online_mode is true, valid password",
  }
};

var options;
try {
  options = require('./config.yml') || default_options;
} catch (ex) {
  options = default_options;
  // Write the defaults
  fs.writeFileSync("config.yml", yaml.dump(default_options));
}

for (var key in default_options) {
    if (options.hasOwnProperty(key)) {
        continue;
    }
    options[key] = default_options[key];
}

if (options.remote.online_mode === false) {
    delete options.remote.password
}

/*
var plugins = {};
require("fs").readdirSync("./plugins").forEach(function(file) {
  plugins[file] = require("./plugins/" + file);
});*/

// Make this more configurable
var writestream = fs.createWriteStream('dump.txt', {flags: 'w', encoding: 'utf8'});

console.log("Creating server...");

var server = mc.createServer(options);

console.log("Server listening on " + '0.0.0.0' + ":" + 25565);

server.on('login', function(client) {
  console.log("Logging in");

  // Whitelist
  for (var whitelistip in options.whitelistips) {
    if (whitelistip === client.socket.remoteAddress) {
      break;
    }
    client.end("You aren't whitelisted.");
    return;
  }

  if (options.remote.online_mode === false && !options.remote.force_username) {
    options.remote.username = client.username;
  }
  var ready = false;
  var remoteclient = mc.createClient(options.remote);
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
