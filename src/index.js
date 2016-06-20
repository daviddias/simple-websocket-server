'use strict'

const Duplex = require('stream').Duplex
const util = require('util')
const EE = require('events').EventEmitter
const WSS = require('ws').Server

exports = module.exports = Server

util.inherits(Server, EE)

function Server (options) {
  if (!(this instanceof Server)) {
    return new Server(options)
  }

  let wsServer
  let socketCounter = 0

  this.listen = (port, host, callback) => {
    let opts = { port: 0 }
    if (typeof port === 'function') {
      callback = port
      port = undefined
    }

    if (typeof port === 'object') {
      opts = port
    }

    if (typeof host === 'function') {
      callback = host
      host = undefined
    }

    if (!callback) {
      callback = function noop () {}
    }

    wsServer = new WSS({ port: opts.port }, () => {
      this.emit('listening')
      callback()
    })

    wsServer.on('connection', (wsSocket) => {
      socketCounter++
      // TODO: FIX, this event is not being emited
      wsSocket.once('finish', () => {
        socketCounter--
      })
      const duplex = convertToStream(wsSocket, {})
      this.emit('connection', duplex)
    })

    wsServer.on('close', () => {
      this.emit('close')
    })

    wsServer.on('error', (err) => {
      this.emit('error', err)
    })
  }

  this.close = (callback) => {
    if (!callback) {
      callback = function noop () {}
    }
    function close () {
      // TODO avoid closing if conns are open
      // if (socketCounter > 0) {
      //  return setTimeout(close, 100)
      // }
      wsServer.close(() => {
        wsServer.emit('close')
        callback()
      })
    }
    process.nextTick(close)
  }
}

exports.createServer = function (options, handler) {
  if (typeof options === 'function') {
    handler = options
    options = {}
  }

  if (!handler) {
    handler = function noop () {}
  }

  const s = new Server(options)

  s.on('connection', (socket) => {
    handler(socket)
  })

  return s
}

function convertToStream (wsConn, options) {
  function read () {}

  var enforcedOpts = {
    objectMode: false,
    decodeStrings: false,
    allowHalfOpen: false
  }

  options = util._extend(options || {}, enforcedOpts)

  var stream = new Duplex(options)
  stream._read = read
  stream._write = write

  stream.ws = wsConn
  stream.ws.on('message', onWsMessage)
  stream.ws.on('close', onWsClose)
  stream.ws.on('open', onWsOpen)
  stream.ws.on('end', onWsEnd)

  stream.close = stream.ws.close.bind(stream.ws)
  // TODO need to hard close the stream
  stream.destroy = stream.close

  function write (chunk, encoding, cb) {
    if (stream.ws.readyState !== 1) {
      return stream.emit('close')
    }

    try {
      stream.ws.send(chunk, cb)
    } catch (err) {
      cb(err)
    }
  }

  function onWsOpen () {
    stream.emit('open')
  }

  function onWsClose () {
    stream.emit('close')
  }

  function onWsEnd () {
    stream.push(null)
  }

  function onWsMessage (message) {
    stream.push(message)
  }

  return stream
}
