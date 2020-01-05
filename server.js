'use strict'

const fs = require('fs');
const PeerInfo = require('peer-info')
const waterfall = require('async/waterfall')
const parallel = require('async/parallel')
const pull = require('pull-stream')
const Node = require('./node')

function createNode(callback) {
    let node

    waterfall([
        (cb) => PeerInfo.create(cb),
        (peerInfo, cb) => {
            peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
            node = new Node({
                peerInfo
            })
            console.log('node created')
            node.start(cb)
            console.log('node started')
        }
    ], (err) => {
        node.on('peer:discovery', (peer) => {
            //console.log('Discovered:', peer.id.toB58String())
            // Note how we need to dial, even if just to warm up the Connection (by not
            // picking any protocol) in order to get a full Connection. The Peer Discovery
            // doesn't make any decisions for you.
            node.dial(peer, () => { })

        })
        node.on('peer:connect', (peer) => {
            //console.log('Connection established to:', peer.id.toB58String())
        })
        console.log('listening on:')
        node.peerInfo.multiaddrs.forEach((ma) => console.log(ma.toString()))
        callback(err, node)
    })
}

parallel([
    (cb) => createNode(cb)
], (err, nodes) => {
    if (err) { throw err }

    const node2 = nodes[0]

    node2.handle('/a-protocol', (protocol, conn) => {
        pull(
            conn,
            pull.map((v) => v.toString()),
            pull.log()
        )
    })
    console.log(node2.peerInfo.id);
    fs.writeFileSync('peer.pub', node2.peerInfo.id.marshalPubKey());
})