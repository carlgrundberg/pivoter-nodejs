/**
 * Created with JetBrains PhpStorm.
 * User: Calle
 * Date: 2012-09-27
 * Time: 09:44
 * To change this template use File | Settings | File Templates.
 */

var http = require('http');
var fs = require('fs');
var xml2js = require('xml2js');

var parser = new xml2js.Parser();

var app = http.createServer(function (req, res) {
    if (req.url == '/') req.url = '/index.html';
    fs.readFile(__dirname + req.url, function (err, data) {
        if (err) {
            res.writeHead(500);
            res.end('Error loading ' + req.url);
        } else {
            if (req.url.indexOf(".css", req.url.length - ".css".length) !== -1) {
                res.writeHead(200, {'Content-Type':'text/css;charset=UTF-8'});
            } else {
                res.writeHead(200, {'Content-Type':'text/html;charset=UTF-8'});
            }
            res.end(data);
        }
    });
});

var io = require('socket.io').listen(app);
io.set('log level', 1);

io.set('transports', [
    'htmlfile',
    'xhr-polling',
    'jsonp-polling'
]);

app.listen(1337);

var state = {
    voters:{},
    status:0,
    story:null,
    total:0,
    voted:0
};

var stories = null;

function total_voters() {
    return Object.keys(state.voters).length;
}

function num_voted() {
    var voted = 0;
    for (i in state.voters) {
        if (state.voters[i] != null) {
            voted++;
        }
    }
    return voted;
}

function reset_state() {
    state.status = 0;
    state.story = null;
    for (i in state.voters) {
        state.voters[i] = null;
    }
}

function vote(id, value) {
    state.voters[id] = value;
    send_update();
}

function send_update(socket) {
    state.total = total_voters();
    state.voted = num_voted();

    if (socket) {
        console.log('sending update to socket ' + socket.id);
        socket.emit('update', state);
    } else {
        console.log('sending update to all');
        io.sockets.emit('update', state);
    }
}

function get_stories_from_tracker(socket) {
    var data = '';
    var request = http.request({
            'hostname':'www.pivotaltracker.com',
            'path':'/services/v3/projects/643495/stories',
            'headers':{
                'X-TrackerToken':'66e5053c59ea81420afc5a5262040762'
            }
        },
        function (response) {
            response.setEncoding('utf8');
            response.on('data', function (chunk) {
                data += chunk;
            });
            response.on('end', function () {
                parser.parseString(data, function (err, result) {
                    s = [];
                    for (i in result.stories.story) {
                        if (result.stories.story[i].estimate && result.stories.story[i].estimate[0]['_'] == -1) {
                            s.push(result.stories.story[i]);
                        }
                    }
                    stories = s;
                    send_stories(socket);
                });
            })
        });
    request.end();
}

function send_stories(socket) {
    socket.emit('stories', {stories:stories});
    console.log('sent stories');
}

io.sockets.on('connection', function (socket) {
    var address = socket.handshake.address;
    console.log("New connection from " + address.address + ":" + address.port + " (" + socket.handshake.headers.referer + ")");
    if (socket.handshake.headers.referer.indexOf('html') === -1) {
        console.log('New voter');
        vote(socket.id, null);
    } else {
        send_update(socket);
    }

    socket.on('get_stories', function () {
        console.log('get_stories');
        if (stories == null) {
            get_stories_from_tracker(socket);
        } else {
            send_stories(socket);
        }
    });

    socket.on('vote', function (data) {
        console.log('vote', data);
        if(state.status == 1) {
            vote(socket.id, data.value);
        }
    });
    socket.on('select_story', function (data) {
        console.log('select_story', data);
        if (data.story) {
            state.story = stories[data.story];
            state.status = 1;
            send_update();
        }
    });
    socket.on('end_voting', function () {
        console.log('end_voting');
        state.status = 2;
        send_update();
    });
    socket.on('end_story', function () {
        console.log('end_story');
        reset_state();
        send_update();
    });
    socket.on('disconnect', function () {
        delete state.voters[socket.id];
        send_update();
    });
});
