/**
 * Created with JetBrains PhpStorm.
 * User: Calle
 * Date: 2012-09-27
 * Time: 09:44
 * To change this template use File | Settings | File Templates.
 */

var http = require('http');
var fs = require('fs');

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type':'text/html;charset=UTF-8'});
    if (req.url == '/results.html') {
        res.end(fs.readFileSync('results.html'));
    } else if (req.url == '/vote.html') {
        res.end(fs.readFileSync('vote.html'));
    } else {
        res.end('Pivoter!');
    }
}).listen(80, '127.0.0.1');
console.log('Server running at http://127.0.0.1:80/');

var io = require('socket.io').listen(81);

function send_voting_room_update() {
    io.sockets.in('result_room').emit('voting_room_update', { total: io.sockets.clients('voting_room').length, voted: 0 })
}

io.sockets.on('connection', function (socket) {
    socket.on('join', function (data) {
        if (data.room) {
            socket.join(data.room);
            send_voting_room_update();
        }
    });
    socket.on('disconnect', function() {
        socket.leave('voting_room');
        send_voting_room_update();
    });
});
