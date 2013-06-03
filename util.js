var parsePacket = require('minecraft-protocol').protocol.parsePacket;

function nextValidPacket(buff, offset) {
    var start = offset || 0;
    for (var i = start;i<buff.length;i++) {
        try {
            var packet = parsePacket(buff.slice(i));
        } catch (err) {
            continue;
        }
        if (packet === null) continue;
        if (packet.error) continue;
        return {packet: packet, offset: i};
    }
    return {error: "No packets found"};
}

function nextValidStream(buff, offset) {
    var start = offset || 0;
    for (var i = start;i<buff.length;i++) {
        var packet = nextValidPacket(buff, i);
        
        if (packet === null) continue;
        if (packet.error) return packet;

        i += packet.offset - 1;
        var packets = {offset: packet.offset, packets: [packet.packet]};
        
        for (var j = packet.offset + packet.packet.size;j<buff.length;){
            var nextpacket = parsePacket(buff.slice(j));
            
            if (nextpacket === null) break;
            if (nextpacket.error) {
                packets.error = nextpacket.error;
                break;
            }

            packets.packets.push(nextpacket);
            j += nextpacket.size;
        }

        if (packets.error) continue;
        return packets;
    }
    return {error: "No packet stream found"}
}

module.exports = {nextValidStream: nextValidStream, nextValidPacket: nextValidPacket};
