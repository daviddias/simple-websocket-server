/* eslint-env mocha */

'use strict'

const expect = require('chai').expect
const bl = require('bl')

const sws = require('../src')
const SW = require('simple-websocket')

describe('.createServer', () => {
  it('create instance without options', () => {
    const s = sws.createServer()
    expect(s).to.exist
  })

  it('create instance with options', () => {
    const s = sws.createServer({})
    expect(s).to.exist
  })

  describe('server instance', () => {
    const options = {
      port: 9090
    }

    let server

    beforeEach(() => {
      server = sws.createServer()
    })

    it('listen, check for callback', (done) => {
      server.listen(options, () => {
        server.close(done)
      })
    })

    it('listen, check for listening event', (done) => {
      server.listen(options)
      server.on('listening', () => {
        server.close(done)
      })
    })

    it('listen, check for close event', (done) => {
      server.listen(options)
      server.on('listening', () => {
        server.on('close', done)
        server.close()
      })
    })

    it('listen, use port as arg', (done) => {
      server.listen(9090)
      server.on('listening', () => {
        server.close(done)
      })
    })
  })
})

describe('listen and dial', () => {
  const options = {
    port: 9090
  }

  it('dial and echo', (done) => {
    const server = sws.createServer((socket) => {
      socket.pipe(socket)
    })

    server.listen(options, dial)

    function dial () {
      const socket = new SW('ws://localhost:9090')

      socket.pipe(bl((err, data) => {
        expect(err).to.not.exist
        expect(data.toString()).to.equal('hey')
        server.close(done)
      }))
      socket.write('hey')
      socket.end()
    }
  })

  it('dial and check for "connection" event on the listener', (done) => {
    const server = sws.createServer()
    server.on('connection', (socket) => {
      socket.pipe(socket)
    })

    server.listen(options, dial)

    function dial () {
      const socket = new SW('ws://localhost:9090')

      socket.pipe(bl((err, data) => {
        expect(err).to.not.exist
        expect(data.toString()).to.equal('hey')
        server.close(done)
      }))
      socket.write('hey')
      socket.end()
    }
  })

  it('dial and destroy from client', (done) => {
    const server = sws.createServer((socket) => {
      socket.on('close', () => {
        server.close(done)
      })
    })

    server.listen(options, dial)

    function dial () {
      const socket = new SW('ws://localhost:9090')
      socket.write('hey')
      socket.destroy()
    }
  })

  it('dial and destroy from server', (done) => {
    const server = sws.createServer((socket) => {
      socket.destroy()
    })

    server.listen(options, dial)

    function dial () {
      const socket = new SW('ws://localhost:9090')
      socket.on('close', () => {
        server.close(done)
      })
    }
  })

  it.skip('dial and try to close before socket end', (done) => {
    const server = sws.createServer((socket) => {
      setTimeout(() => {
        socket.pipe(socket)
      }, 500)
      server.close()
    })

    server.listen(options, dial)

    function dial () {
      const socket = new SW('ws://localhost:9090')

      socket.pipe(bl((err, data) => {
        console.log('got data')
        expect(err).to.not.exist
        expect(data.toString()).to.equal('hey')
        server.close(done)
      }))
      socket.write('hey')
      socket.end()
    }
  })
})
