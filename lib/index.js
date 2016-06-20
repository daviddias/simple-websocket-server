'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var Duplex = require('stream').Duplex;
var util = require('util');
var EE = require('events').EventEmitter;
var WSS = require('ws').Server;

exports = module.exports = Server;

util.inherits(Server, EE);

function Server(options) {
  var _this = this;

  if (!(this instanceof Server)) {
    return new Server(options);
  }

  var wsServer = void 0;
  var socketCounter = 0;

  this.listen = function (port, host, callback) {
    var opts = { port: 0 };
    if (typeof port === 'function') {
      callback = port;
      port = undefined;
    }

    if ((typeof port === 'undefined' ? 'undefined' : _typeof(port)) === 'object') {
      opts = port;
    }

    if (typeof host === 'function') {
      callback = host;
      host = undefined;
    }

    if (!callback) {
      callback = function noop() {};
    }

    wsServer = new WSS({ port: opts.port }, function () {
      _this.emit('listening');
      callback();
    });

    wsServer.on('connection', function (wsSocket) {
      socketCounter++;
      // TODO: FIX, this event is not being emited
      wsSocket.once('finish', function () {
        socketCounter--;
      });
      var duplex = convertToStream(wsSocket, {});
      _this.emit('connection', duplex);
    });

    wsServer.on('close', function () {
      _this.emit('close');
    });

    wsServer.on('error', function (err) {
      _this.emit('error', err);
    });
  };

  this.close = function (callback) {
    if (!callback) {
      callback = function noop() {};
    }
    function close() {
      // TODO avoid closing if conns are open
      // if (socketCounter > 0) {
      //  return setTimeout(close, 100)
      // }
      wsServer.close(callback);
    }
    close();
  };
}

exports.createServer = function (options, handler) {
  if (typeof options === 'function') {
    handler = options;
    options = {};
  }

  if (!handler) {
    handler = function noop() {};
  }

  var s = new Server(options);

  s.on('connection', function (socket) {
    handler(socket);
  });

  return s;
};

function convertToStream(wsConn, options) {
  function read() {}

  var enforcedOpts = {
    objectMode: false,
    decodeStrings: false,
    allowHalfOpen: false
  };

  options = util._extend(options || {}, enforcedOpts);

  var stream = new Duplex(options);
  stream._read = read;
  stream._write = write;

  stream.ws = wsConn;
  stream.ws.on('message', onWsMessage);
  stream.ws.on('close', onWsClose);
  stream.ws.on('open', onWsOpen);
  stream.ws.on('end', onWsEnd);

  stream.close = stream.ws.close.bind(stream.ws);
  // TODO need to hard close the stream
  stream.destroy = stream.close;

  function write(chunk, encoding, cb) {
    if (stream.ws.readyState !== 1) {
      return stream.emit('close');
    }

    try {
      stream.ws.send(chunk, cb);
    } catch (err) {
      cb(err);
    }
  }

  function onWsOpen() {
    stream.emit('open');
  }

  function onWsClose() {
    stream.emit('close');
  }

  function onWsEnd() {
    stream.push(null);
  }

  function onWsMessage(message) {
    stream.push(message);
  }

  return stream;
}