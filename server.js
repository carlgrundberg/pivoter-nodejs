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
    fs.readFile(__dirname + req.url,
        function (err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading ' + req.url);
            }
            res.writeHead(200, {'Content-Type':'text/html;charset=UTF-8'});
            res.end(data);
        });
}).listen(80);
console.log('Server running at http://127.0.0.1:80/');

var io = require('socket.io').listen(81);
io.set('log level', 1);

var voters = {};
var status = 0;

function num_voted() {
    var voted = 0;
    for(i in voters) {
        if(voters[i] != null) {
            voted++;
        }
    }
    return voted;
}

function vote(id, value) {
    voters[id] = value;
    send_voting_room_update();
}

function send_voting_room_update(socket) {
    var data = { voters: voters, total: Object.keys(voters).length, voted: num_voted(), status: status, story: 'User story to vote!' };
    if(socket) {
        console.log('sending voting room update to socket ' + socket.id);
        socket.emit('voting_room_update', data);
    } else {
        console.log('sending voting room update');
        io.sockets.emit('voting_room_update', data);
    }
}

io.sockets.on('connection', function (socket) {
    var address = socket.handshake.address;
    console.log("New connection from " + address.address + ":" + address.port);
    if(socket.handshake.headers.referer.indexOf('vote.html') > 0) {
        console.log('New voter');
        vote(socket.id, null);
    } else {
        send_voting_room_update(socket);
    }

    socket.on('my_vote', function(data) {
        console.log('my_vote', data);
        vote(socket.id, data.value);
    });
    socket.on('start_vote', function() {
       console.log('start_vote');
       status = 0;
       send_voting_room_update();
    });
    socket.on('end_vote', function() {
        console.log('end_vote');
        status = 1;
        send_voting_room_update();
    });
    socket.on('disconnect', function() {
        delete voters[socket.id];
        send_voting_room_update();
    });
});
